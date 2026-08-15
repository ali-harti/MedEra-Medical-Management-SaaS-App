"""
MedEra AI — Extended Training Pipeline
Trains on the merged dataset (DDXPlus + Kaggle + QuyenAnhDE)
covering 400+ diseases and 1000+ symptoms.

Usage:
    python training/train_extended.py
    python training/train_extended.py --ddxplus     # include DDXPlus too
"""

import argparse
import json
import logging
import os
import warnings
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, f1_score
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.preprocessing import LabelEncoder, MultiLabelBinarizer

warnings.filterwarnings("ignore")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")

DISCLAIMER_FR = (
    "Ces suggestions sont indicatives et basées sur une analyse "
    "statistique des symptômes. Elles ne constituent pas un "
    "diagnostic médical et ne remplacent pas le jugement clinique "
    "du médecin."
)
DISCLAIMER_EN = (
    "These suggestions are indicative and based on statistical "
    "analysis of symptoms. They do not constitute a medical diagnosis "
    "and do not replace the clinical judgment of the physician."
)


# ---------------------------------------------------------------------------
# LOAD EXTENDED DATASET
# ---------------------------------------------------------------------------

def load_extended(path: str) -> tuple[list, list, pd.DataFrame]:
    """
    Load the augmented dataset.
    Returns (feature_lists, labels, context_df).
    """
    logger.info(f"Loading {os.path.basename(path)}...")
    df = pd.read_csv(path)
    df = df.dropna(subset=["PATHOLOGY", "SYMPTOMS_LIST"])
    
    feature_lists = []
    labels = []
    
    # Identify context columns
    context_cols = [
        'age', 'sex', 'history_diabetes', 'history_hypertension', 
        'history_heart_disease', 'history_asthma_copd', 'history_cancer', 
        'history_smoking', 'travel_tropical', 'travel_high_risk', 
        'exposure_sick_contact', 'exposure_animals', 'alcohol_consumption', 
        'recent_surgery', 'pregnancy', 'high_stress'
    ]
    
    # Process Symptoms
    for _, row in df.iterrows():
        symptoms = [
            s.strip()
            for s in str(row["SYMPTOMS_LIST"]).split(",")
            if s.strip()
        ]
        feature_lists.append(symptoms)
        labels.append(str(row["PATHOLOGY"]).strip())
        
    context_df = df[context_cols].copy()
    
    # Basic encoding for Sex
    context_df['sex'] = context_df['sex'].map({'M': 0, 'F': 1, 'O': 0.5}).fillna(0)
    
    # Normalize Age (0-100 scale)
    context_df['age'] = context_df['age'] / 100.0
    
    logger.info(f"Loaded {len(labels)} patient cases with {len(context_cols)} context features")
    return feature_lists, labels, context_df


# ---------------------------------------------------------------------------
# LOAD DDXPLUS (optional supplement)
# ---------------------------------------------------------------------------

def load_ddxplus_supplement(max_samples: int = 100000) -> tuple[list, list]:
    """
    Load DDXPlus data and convert to flat symptom lists.
    Used as a supplement to add the original 49 clinical conditions
    with their precise evidence-based profiles.
    """
    import ast

    evid_path = os.path.join(DATA_DIR, "release_evidences.json")
    train_path = os.path.join(DATA_DIR, "release_train_patients.csv")

    if not os.path.exists(evid_path) or not os.path.exists(train_path):
        logger.warning("DDXPlus files not found, skipping supplement")
        return [], []

    logger.info("Loading DDXPlus supplement...")

    with open(evid_path, encoding="utf-8") as f:
        evidences = json.load(f)

    # Build code -> readable name mapping
    code_to_name = {}
    for code, meta in evidences.items():
        question_en = meta.get("question_en", code)
        name = question_en.lower().strip()
        for ch in ["?", "(", ")", ",", ".", "'", '"']:
            name = name.replace(ch, "")
        name = name.replace(" ", "_").replace("-", "_").replace("/", "_")
        while "__" in name:
            name = name.replace("__", "_")
        name = "_".join(name.split("_")[:8]).strip("_")

        data_type = meta.get("data_type", "B")
        if data_type == "B":
            code_to_name[code] = name
        else:
            default_val = meta.get("default_value", "")
            for value, meanings in meta.get("value_meaning", {}).items():
                if value == default_val:
                    continue
                val_en = meanings.get("en", value)
                if val_en in ("NA", "N/A", ""):
                    continue
                val_name = val_en.lower().strip().replace(" ", "_").replace("-", "_")
                composite_key = f"{code}_@_{value}"
                code_to_name[composite_key] = f"{name}__{val_name}"

    # Read in chunks
    chunk_size = 25000
    chunks = []
    total = 0
    for chunk in pd.read_csv(
        train_path,
        chunksize=chunk_size,
        dtype={"PATHOLOGY": "category"},
        low_memory=True,
    ):
        chunks.append(chunk[["PATHOLOGY", "EVIDENCES"]])
        total += len(chunk)
        if total >= max_samples:
            break

    df = pd.concat(chunks, ignore_index=True)
    if max_samples and len(df) > max_samples:
        df = (
            df.groupby("PATHOLOGY", group_keys=False)
            .apply(lambda x: x.sample(
                min(len(x), max(1, int(max_samples * len(x) / len(df)))),
                random_state=42
            ))
            .reset_index(drop=True)
        )

    feature_lists = []
    labels = []

    for _, row in df.iterrows():
        try:
            raw = ast.literal_eval(str(row["EVIDENCES"]))
        except Exception:
            continue
        symptoms = [
            code_to_name[item]
            for item in raw
            if item in code_to_name
        ]
        if symptoms:
            feature_lists.append(symptoms)
            labels.append(str(row["PATHOLOGY"]).strip())

    logger.info(f"DDXPlus supplement: {len(labels)} cases, "
                f"{len(set(labels))} diseases")
    return feature_lists, labels


# ---------------------------------------------------------------------------
# TRAINING
# ---------------------------------------------------------------------------

def train_model(X_train, y_train):
    """
    Train RandomForestClassifier with isotonic calibration.
    With 32GB RAM, memory is no longer a constraint.
    """
    logger.info("Training RandomForestClassifier (500 trees)...")
    logger.info(f"  Dataset: {X_train.shape[0]} cases, "
                f"{X_train.shape[1]} features, "
                f"{len(set(y_train))} classes")

    from sklearn.preprocessing import LabelEncoder
    le = LabelEncoder()
    y_encoded = le.fit_transform(y_train)

    rf = RandomForestClassifier(
        n_estimators=500,
        max_depth=None,  # Allow trees to grow fully
        min_samples_split=2,  # Allow splitting on any difference
        min_samples_leaf=1,   # Pure leaves
        max_features="sqrt",
        random_state=42,
        class_weight="balanced",
        n_jobs=-1,
        verbose=1,
        warm_start=False,
    )

    logger.info("Fitting RandomForest — this takes 5-15 minutes...")
    rf.fit(X_train, y_encoded)
    logger.info("RandomForest training complete.")

    # Calibrate with Isotonic (better for RF than Sigmoid)
    logger.info("Calibrating probabilities (Isotonic)...")
    cal_size = min(25000, X_train.shape[0])
    rng = np.random.RandomState(42)
    cal_idx = rng.choice(X_train.shape[0], cal_size, replace=False)

    calibrated = CalibratedClassifierCV(rf, method="isotonic", cv="prefit")
    calibrated.fit(X_train[cal_idx], y_encoded[cal_idx])
    logger.info("Calibration complete.")

    importances = rf.feature_importances_
    top_10_idx = np.argsort(importances)[-10:][::-1]
    logger.info("Top 10 feature importance indices (names logged in main()): "
                + str(top_10_idx.tolist()))

    return calibrated, rf, le


def evaluate(model, mlb, le, X_test_raw, y_test, label="Test"):
    """Evaluate on held-out set using decoded string labels."""
    logger.info(f"Evaluating on {label} set...")
    X_test = mlb.transform(X_test_raw)
    y_test_enc = le.transform(y_test)

    subset_size = min(8000, X_test.shape[0])
    rng = np.random.RandomState(42)
    idx = rng.choice(X_test.shape[0], subset_size, replace=False)

    y_pred_enc = model.predict(X_test[idx])
    y_pred = le.inverse_transform(y_pred_enc)
    y_true = np.array(y_test)[idx]

    f1 = f1_score(y_true, y_pred, average="weighted", zero_division=0)
    logger.info(f"{label} F1 (weighted): {f1:.4f}")

    report = classification_report(y_true, y_pred, zero_division=0)
    logger.info(f"Classification Report (truncated):\n{report[:3000]}")
    return f1


def cross_validate(rf, mlb, le, feature_lists, labels, cv=5):
    """
    Stratified k-fold CV on a 30k stratified subset for speed.
    Full CV on 70k × 500 trees would take hours.
    """
    logger.info(f"Running {cv}-fold cross-validation...")
    logger.info("  Using stratified 30k subset for speed...")

    max_cv_size = min(30000, len(feature_lists))
    if max_cv_size < len(feature_lists):
        _, cv_features, _, cv_labels = train_test_split(
            feature_lists, labels,
            test_size=max_cv_size / len(feature_lists),
            random_state=42,
            stratify=labels,
        )
    else:
        cv_features = feature_lists
        cv_labels = labels

    X_cv = mlb.transform(cv_features)
    y_cv_enc = le.transform(cv_labels)
    y_cv = np.array(cv_labels)

    skf = StratifiedKFold(n_splits=cv, shuffle=True, random_state=42)
    scores = []

    for fold, (train_idx, val_idx) in enumerate(skf.split(X_cv, y_cv_enc), 1):
        logger.info(f"  Fold {fold}/{cv}...")
        rf_cv = RandomForestClassifier(
            n_estimators=100,
            max_depth=20,
            min_samples_split=4,
            min_samples_leaf=2,
            max_features="sqrt",
            random_state=42,
            class_weight="balanced",
            n_jobs=-1,
        )
        rf_cv.fit(X_cv[train_idx], y_cv_enc[train_idx])
        y_pred_enc = rf_cv.predict(X_cv[val_idx])
        y_pred = le.inverse_transform(y_pred_enc)
        y_true = y_cv[val_idx]
        fold_f1 = f1_score(y_true, y_pred, average="weighted", zero_division=0)
        scores.append(fold_f1)
        logger.info(f"  Fold {fold} F1: {fold_f1:.4f}")

    scores_arr = np.array(scores)
    logger.info(
        f"CV F1: {scores_arr.round(4)} | "
        f"Mean: {scores_arr.mean():.4f} \u00b1 {scores_arr.std():.4f}"
    )
    return scores_arr.tolist()


# ---------------------------------------------------------------------------
# BUILD SYNONYM MAP FROM EXTENDED VOCABULARY
# ---------------------------------------------------------------------------

def build_extended_synonym_map(symptom_names: list) -> dict:
    """
    Bilingual synonym map verified against the real feature vocabulary.
    Ensures high-recall symptom recognition for both explicit lists and free text.
    """
    valid = set(symptom_names)
    synonym_map = {}

    def add(aliases, target):
        # Resolve target to an actual feature name
        resolved = target if target in valid else next(
            (f for f in valid if target in f), None
        )
        if resolved:
            for alias in aliases:
                # Direct mapping (overwrites if necessary)
                synonym_map[alias] = resolved
                # Also normalize the alias
                norm_alias = alias.lower().replace(" ", "_")
                if norm_alias not in synonym_map:
                    synonym_map[norm_alias] = resolved

    # 1. Start with identity mapping for all valid features
    for v in valid:
        synonym_map[v] = v

    # ── FEVER ─────────────────────────────────────────────────────────
    add(["fever","fievre","fièvre","pyrexia","febrile","febrile_state",
         "low_grade_fever","has_fever","subfebril"], "high_fever")
    add(["mild_fever","low_fever"], "mild_fever")
    add(["thinks_has_fever","subjective_fever"], "do_you_think_you_have_a_fever")

    # ── COUGH ─────────────────────────────────────────────────────────
    add(["cough","toux","dry_cough","toux_seche","tussis","toussent"], "cough")
    add(["productive_cough","wet_cough","toux_grasse","toux_productive",
         "cough_with_phlegm"], "cough_with_phlegm_or_pus")
    add(["mucoid_cough","mucoid_sputum","crachat"], "mucoid_sputum")
    add(["rusty_sputum","rusty_cough"], "rusty_sputum")
    add(["hemoptysis","coughing_blood","blood_in_sputum","crachat_sang",
         "bloody_sputum","coughing_up_blood"], "blood_in_sputum")
    add(["chronic_cough","persistent_cough"], "chronic_cough")

    # ── BREATHING ─────────────────────────────────────────────────────
    add(["shortness_of_breath","breathlessness","difficulty_breathing",
         "dyspnea","dyspnee","dyspnée","essoufflement","gene_respiratoire",
         "souffle_court","manque_de_souffle","breathing_difficulty"],
        "breathlessness")
    add(["wheezing","sifflement","wheeze"], "wheezing")
    add(["rapid_breathing","fast_breathing","tachypnea"], "rapid_breathing")

    # ── CHEST PAIN ────────────────────────────────────────────────────
    add(["chest_pain","douleur_thoracique","douleur_poitrine",
         "oppression_thoracique","thoracic_pain","chest_tightness",
         "angina","douleur_cardiaque","chest_discomfort","precordial_pain"],
        "chest_pain")
    add(["chest_pressure","chest_pain_or_pressure"], "chest_pain_or_pressure")

    # ── HEADACHE ──────────────────────────────────────────────────────
    add(["headache","cephalee","céphalée","cephalees","mal_de_tete",
         "tete_qui_fait_mal","head_pain","cephalalgia"], "headache")
    add(["migraine","migraines","severe_headache"], "severe_headache")
    add(["persistent_headache"], "persistent_head_pain")

    # ── NAUSEA ────────────────────────────────────────────────────────
    add(["nausea","nausee","nausée","nausees","feeling_nauseous",
         "envie_de_vomir","nauseated"], "nausea")

    # ── VOMITING ──────────────────────────────────────────────────────
    add(["vomiting","vomissement","vomissements","vomited",
         "throwing_up","vomir"], "vomiting")
    add(["blood_in_vomit","hematemesis","vomissement_sang",
         "vomiting_blood"], "vomiting_blood")

    # ── DIARRHEA ──────────────────────────────────────────────────────
    add(["diarrhea","diarrhoea","diarrhee","diarrhée","loose_stools",
         "selles_liquides","frequent_stools","watery_stools"], "diarrhoea")
    add(["chronic_diarrhea"], "chronic_diarrhea")

    # ── CONSTIPATION ──────────────────────────────────────────────────
    add(["constipation","constipe","constipated","selles_dures",
         "no_bowel_movement"], "constipation")

    # ── ABDOMINAL PAIN ────────────────────────────────────────────────
    add(["abdominal_pain","belly_pain","stomach_pain","douleur_abdominale",
         "douleurs_abdominales","douleur_ventre","mal_au_ventre",
         "mal_estomac","crampes_abdominales","tummy_pain"], "abdominal_pain")
    add(["severe_abdominal_pain"], "severe_abdominal_pain")
    add(["epigastric_pain","douleur_epigastrique"], "do_you_feel_pain_somewhere__epigastric")

    # ── HEARTBURN / ACID ──────────────────────────────────────────────
    add(["heartburn","acid_reflux","brulures_estomac","brulures_d_estomac",
         "pyrosis","acide_gastrique"], "acidity")
    add(["indigestion","dyspepsia"], "indigestion")

    # ── BLACK/BLOODY STOOLS ───────────────────────────────────────────
    add(["black_stools","melena","selles_noires","dark_stools",
         "tarry_stools"], "bloody_or_black_stools")
    add(["blood_in_stool","rectal_bleeding","bloody_stool",
         "passage_of_blood"], "bloody_stool")

    # ── FATIGUE ───────────────────────────────────────────────────────
    add(["fatigue","asthenie","asthénie","exhaustion","epuisement",
         "tired","lethargy","fatigued","lassitude","tiredness"], "fatigue")
    add(["extreme_fatigue","overwhelming_fatigue"], "extreme_fatigue")
    add(["weakness","faiblesse","extreme_weakness","generalized_weakness"],
        "weakness")
    add(["muscle_weakness","weakness_in_limbs"], "weakness_in_limbs")

    # ── CHILLS ────────────────────────────────────────────────────────
    add(["chills","frissons","frisson","rigors","shivering","shivers",
         "frissonnements"], "chills")

    # ── SWEATING ──────────────────────────────────────────────────────
    add(["sweating","night_sweats","sueurs_nocturnes","transpiration",
         "diaphoresis","sueurs","hyperhidrosis","abnormal_sweating"],
        "sweating")

    # ── WEIGHT LOSS ───────────────────────────────────────────────────
    add(["weight_loss","perte_de_poids","amaigrissement","losing_weight",
         "unexplained_weight_loss","unintentional_weight_loss"],
        "weight_loss")
    add(["extreme_weight_loss"], "extreme_weight_loss")
    add(["weight_gain","prise_de_poids"], "weight_gain")

    # ── LOSS OF APPETITE ──────────────────────────────────────────────
    add(["loss_of_appetite","anorexia","anorexie","perte_appetit",
         "decreased_appetite","poor_appetite","no_appetite",
         "perte_d_appetit"], "loss_of_appetite")

    # ── HYPERTENSION (critical fix — was not resolving) ───────────────
    add(["hypertension","haute_pression","high_blood_pressure",
         "tension_arterielle","hta","hypertension_arterielle",
         "arterial_hypertension"], "high_blood_pressure")
    add(["consulting_hypertension"], "are_you_consulting_because_you_have_high_blood")

    # ── PALPITATIONS / CARDIAC ────────────────────────────────────────
    add(["palpitations","heart_palpitations","palpitations_cardiaques",
         "coeur_qui_bat_vite"], "palpitations")
    add(["tachycardia","tachycardie","heart_racing","rapid_heartbeat",
         "fast_heart_rate"], "fast_heart_rate")
    add(["irregular_heartbeat","arrhythmia"], "irregular_heartbeat")
    add(["slow_heart_rate","bradycardia"], "slow_heart_rate")

    # ── DIZZINESS ─────────────────────────────────────────────────────
    add(["dizziness","vertigo","vertige","vertiges","lightheadedness",
         "etourdissement","tete_qui_tourne","presyncope"], "dizziness")
    add(["fainting","syncope","loss_of_consciousness"], "loss_of_consciousness")

    # ── SKIN / RASH ───────────────────────────────────────────────────
    add(["rash","skin_rash","eruption_cutanee","eruption","rougeurs",
         "cutaneous_rash"], "skin_rash")
    add(["itching","prurit","demangeaisons","démangeaisons","pruritus",
         "itchy"], "itching")
    add(["jaundice","ictere","ictère","jaunisse","yellowing_skin",
         "yellow_skin"], "yellowish_skin")
    add(["yellowing_of_eyes","jaundice_eyes"], "yellowing_of_eyes")
    add(["pale_skin","pallor","paleur"], "pale_skin")

    # ── SORE THROAT ───────────────────────────────────────────────────
    add(["sore_throat","mal_de_gorge","gorge_irritee","pharyngite",
         "angine","throat_pain","throat_soreness"], "sore_throat")
    add(["patches_in_throat","white_patches_throat"], "patches_in_throat")
    add(["difficulty_swallowing","dysphagia","deglutition_difficulty"],
        "difficulty_swallowing")

    # ── NASAL ─────────────────────────────────────────────────────────
    add(["nasal_congestion","congestion","congestion_nasale","nez_bouche",
         "stuffy_nose","blocked_nose"], "nasal_congestion")
    add(["runny_nose","rhinorrhee","rhinorrhée","nez_qui_coule",
         "ecoulement_nasal"], "runny_nose")
    add(["sneezing","continuous_sneezing"], "continuous_sneezing")
    add(["loss_of_smell","anosmia","anosmie","perte_odorat"], "loss_of_smell")
    add(["sinus_pressure","sinusitis"], "do_you_have_been_diagnosed_with_chronic_sinusitis")

    # ── NEUROLOGICAL ──────────────────────────────────────────────────
    add(["confusion","disorientation","altered_consciousness",
         "confusion_mentale","mental_confusion"], "altered_sensorium")
    add(["numbness","tingling","paresthesia","paresthesie",
         "engoudissement","numbness_or_tingling"], "numbness_or_tingling")
    add(["seizures","convulsions","epilepsy"], "seizures")
    add(["stiff_neck","neck_stiffness","raideur_nuque","meningismus"],
        "stiff_neck")
    add(["neck_pain","douleur_nuque","cervical_pain","douleur_cervicale"],
        "neck_pain")
    add(["back_pain","douleur_dos","dorsalgie","mal_de_dos"], "back_pain")
    add(["lower_back_pain","lombalgie","lumbar_pain"], "lower_back_pain")
    add(["light_sensitivity","photophobia","photophobie","photophobie"],
        "sensitivity_to_light")
    add(["sensitivity_to_sound","phonophobia"], "sensitivity_to_light_and_sound")

    # ── JOINT / MUSCLE ────────────────────────────────────────────────
    add(["joint_pain","arthralgia","arthralgies","douleur_articulaire",
         "douleurs_articulaires"], "joint_pain")
    add(["muscle_pain","myalgia","myalgies","douleur_musculaire",
         "courbatures","muscle_ache","body_aches"], "muscle_pain")
    add(["muscle_stiffness","stiffness","raideur_musculaire"], "muscle_stiffness")
    add(["swollen_joints","joint_swelling"], "joint_swelling")

    # ── LYMPH NODES ───────────────────────────────────────────────────
    add(["swollen_lymph_nodes","lymphadenopathy","adenopathie",
         "adénopathie","ganglions_enfles","swelled_lymph_nodes"],
        "swollen_lymph_nodes")

    # ── URINARY ───────────────────────────────────────────────────────
    add(["burning_urination","dysuria","brulures_urinaires",
         "painful_urination","urinary_burning"], "burning_micturition")
    add(["frequent_urination","pollakiuria","polyuria"],
        "frequent_urination")
    add(["blood_in_urine","hematuria"], "blood_in_urine")

    # ── VISION ────────────────────────────────────────────────────────
    add(["blurred_vision","vue_trouble","vision_floue","blurry_vision"],
        "blurred_and_distorted_vision")
    add(["vision_problems","vision_changes"], "vision_problems")
    add(["double_vision","diplopia"], "double_vision")

    # ── TRAVEL / EXPOSURE ─────────────────────────────────────────────
    add(["travel_africa","travel_west_africa","voyage_afrique"],
        "have_you_traveled_out_of_the_country_in__west_africa")
    add(["travel_north_africa"], "have_you_traveled_out_of_the_country_in__north_africa")
    add(["travel_asia","travel_southeast_asia"],
        "have_you_traveled_out_of_the_country_in__asia")
    add(["hiv_positive","vih","sida","hiv_infection"],
        "are_you_infected_with_the_human_immunodeficiency_virus")
    add(["immunosuppressed","immunocompromised","immunodeprime"],
        "are_you_immunosuppressed")

    # ── DIABETES ──────────────────────────────────────────────────────
    add(["diabetes","diabete","diabetic","has_diabetes"],
        "do_you_have_diabetes")
    add(["excessive_thirst","polydipsia","soif_excessive"],
        "excessive_thirst")
    add(["excessive_hunger","polyphagia","hunger_excessive"],
        "excessive_hunger")

    # ── RESPIRATORY HISTORY ───────────────────────────────────────────
    add(["asthma","asthme","has_asthma"],
        "do_you_have_asthma_or_have_you_ever")
    add(["copd","bpco","chronic_obstructive"],
        "do_you_have_a_chronic_obstructive_pulmonary_disease")

    # ── MENTAL HEALTH ─────────────────────────────────────────────────
    add(["anxiety","anxiete","angoisse","anxious"], "anxiety")
    add(["depression","depressive","deprime"], "depression")
    add(["mood_swings","sautes_d_humeur"], "mood_swings")
    add(["irritability","irritabilite"], "irritability")

    # ── BLEEDING ──────────────────────────────────────────────────────
    add(["bleeding","saignement","hemorrhage","hemorragie"],
        "bleeding")
    add(["easy_bruising","bruising","ecchymose"], "easy_bruising")

    resolved = sum(1 for v in synonym_map.values() if v in valid)
    logger.info(f"Synonym map: {len(synonym_map)} aliases, {resolved} resolve to valid features")
    return synonym_map



# ---------------------------------------------------------------------------
# SAVE
# ---------------------------------------------------------------------------

def save_artifacts(model, mlb, symptom_names, synonym_map,
                   bilingual_labels_arg, label_encoder, metadata, all_feature_names=None):
    os.makedirs(MODELS_DIR, exist_ok=True)
    
    if all_feature_names is None:
        all_feature_names = symptom_names

    # Build bilingual labels from symptom names
    bilingual_labels = {}
    for name in symptom_names:
        readable = name.replace("_", " ").strip()
        bilingual_labels[name] = {
            "en": readable.capitalize(),
            "fr": readable.capitalize(),
            "code": name,
        }

    payload = {
        "model": model,
        "mlb": mlb,
        "symptoms_list": symptom_names,
        "full_feature_list": all_feature_names,
        "diseases": metadata["diseases"],
        "version": metadata["version"],
        "model_type": metadata["model_type"],
        "dataset": metadata["dataset"],
        "f1_score": metadata["f1_score"],
        "cv_scores": metadata.get("cv_scores", []),
        "cv_mean": metadata.get("cv_mean", 0),
        "cv_std": metadata.get("cv_std", 0),
        "training_date": metadata["training_date"],
        "n_training_samples": metadata["n_training_samples"],
        "icd10_map": {},
        "severity_map": {},
        "names_fr": {d: d for d in metadata["diseases"]},
        "names_en": {d: d for d in metadata["diseases"]},
        "synonym_map": synonym_map,
        "bilingual_labels": bilingual_labels,
        "label_encoder": label_encoder,
        "model_type_algo": "RandomForest",
        "disclaimer_fr": DISCLAIMER_FR,
        "disclaimer_en": DISCLAIMER_EN,
    }

    model_path = os.path.join(MODELS_DIR, "symptom_classifier.joblib")
    joblib.dump(payload, model_path, compress=1)
    size_mb = os.path.getsize(model_path) / 1024 / 1024
    logger.info(f"Model saved: {model_path} ({size_mb:.1f} MB)")

    # Metadata JSON
    meta_out = {k: v for k, v in metadata.items()}
    meta_out["n_symptoms"] = len(symptom_names)
    meta_out["n_synonym_aliases"] = len(synonym_map)
    with open(os.path.join(MODELS_DIR, "model_metadata.json"), "w") as f:
        json.dump(meta_out, f, indent=2, ensure_ascii=False)

    # Symptoms list
    symptoms_out = [
        {
            "value": name,
            "label_en": bilingual_labels[name]["en"],
            "label_fr": bilingual_labels[name]["fr"],
        }
        for name in symptom_names
    ]
    with open(os.path.join(MODELS_DIR, "symptoms_list.json"), "w") as f:
        json.dump(symptoms_out, f, indent=2, ensure_ascii=False)

    # Diseases list
    diseases_out = [
        {"name": d, "name_en": d, "name_fr": d, "icd10": "", "severity": 3}
        for d in metadata["diseases"]
    ]
    with open(os.path.join(MODELS_DIR, "diseases_list.json"), "w") as f:
        json.dump(diseases_out, f, indent=2, ensure_ascii=False)

    logger.info("All artifacts saved.")
    return model_path


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main(include_ddxplus: bool = False):
    logger.info("=" * 60)
    logger.info("MEDERA AI — EXTENDED TRAINING PIPELINE (CLINICAL CONTEXT)")
    logger.info("=" * 60)

    # 1. Load augmented dataset
    ext_path = os.path.join(DATA_DIR, "clinical_augmented_dataset.csv")
    if not os.path.exists(ext_path):
        logger.info("Augmented dataset not found, running augmentation...")
        from training.augment_clinical_data import augment_clinical_data
        augment_clinical_data()
        
    feature_lists, labels, context_df = load_extended(ext_path)

    # 2. Fit MultiLabelBinarizer (Symptoms)
    logger.info("Building symptom matrix...")
    mlb = MultiLabelBinarizer(sparse_output=True)
    X_symptoms = mlb.fit_transform(feature_lists)
    symptom_names = sorted(mlb.classes_.tolist())
    
    # 3. Concatenate Context Features
    from scipy.sparse import hstack, csr_matrix
    
    context_values = context_df.values
    X_combined = hstack([X_symptoms, csr_matrix(context_values)])
    
    all_feature_names = symptom_names + list(context_df.columns)
    logger.info(f"Combined feature matrix: {X_combined.shape}")
    logger.info(f"Context Features: {list(context_df.columns)}")

    # 4. Train/test split
    logger.info("Splitting train/test (80/20 stratified)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X_combined, labels,
        test_size=0.2,
        random_state=42,
        stratify=labels,
    )

    # 5. Train RandomForest
    calibrated_model, base_rf, label_encoder = train_model(X_train, y_train)

    # Log top 10 features by importance
    importances = base_rf.feature_importances_
    top_15_idx = np.argsort(importances)[-15:][::-1]
    logger.info("Top 15 most important features (Symptoms + Context):")
    for i in top_15_idx:
        logger.info(f"  {all_feature_names[i]:40s} {importances[i]:.4f}")

    logger.info(f"Diseases: {len(label_encoder.classes_)}")

    # 6. Evaluate
    y_pred_enc = calibrated_model.predict(X_test)
    y_pred = label_encoder.inverse_transform(y_pred_enc)
    f1_test = f1_score(y_test, y_pred, average="weighted", zero_division=0)
    logger.info(f"Test F1 (weighted): {f1_test:.4f}")

    # 7. Build synonym map
    synonym_map = build_extended_synonym_map(symptom_names)

    # 8. Save
    diseases = sorted(set(labels))
    metadata = {
        "version": "4.3.0",
        "model_type": "RandomForest+ClinicalContext",
        "dataset": "Augmented_Extended_Patients",
        "f1_score": round(f1_test, 4),
        "training_date": datetime.now().isoformat(),
        "n_training_samples": X_train.shape[0],
        "n_features": X_combined.shape[1],
        "diseases": diseases,
    }

    save_artifacts(
        calibrated_model, mlb, symptom_names, synonym_map,
        {}, label_encoder, metadata,
        all_feature_names=all_feature_names
    )

    logger.info("\n" + "=" * 60)
    logger.info("TRAINING COMPLETE")
    logger.info(f"  Version:   4.3.0")
    logger.info(f"  Algorithm: RandomForest+ClinicalContext")
    logger.info(f"  Diseases:  {len(diseases)}")
    logger.info(f"  Features:  {X_combined.shape[1]}")
    logger.info(f"  Test F1:   {f1_test:.4f}")
    logger.info("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--ddxplus", action="store_true",
        help="Include DDXPlus data as supplement"
    )
    args = parser.parse_args()
    main(include_ddxplus=args.ddxplus)
