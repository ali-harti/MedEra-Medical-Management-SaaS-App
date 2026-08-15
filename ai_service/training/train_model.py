"""
MedEra AI Service — DDXPlus Bilingual Training Pipeline (FR + EN)

Dataset: DDXPlus (English version with French metadata preserved)
  - 1,025,602 training patients
  - 49 pathologies
  - 223 evidences (symptoms + antecedents)

Pipeline:
  1. Load DDXPlus CSVs and metadata JSONs
  2. Decode evidence codes to English canonical names
  3. Build bilingual synonym map (FR + EN aliases)
  4. Build binary feature matrix (one column per evidence value)
  5. Train RandomForest with calibrated probabilities
  6. Cross-validate to get honest F1 scores
  7. Save model + metadata + bilingual symptom vocabulary

Usage:
    python training/train_model.py
    python training/train_model.py --samples 200000  # faster for dev
    python training/train_model.py --samples 0       # full dataset
"""

import argparse
import ast
import json
import logging
import os
import sys
import warnings
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.preprocessing import MultiLabelBinarizer

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
# TEXT NORMALIZATION
# ---------------------------------------------------------------------------

def normalize_text(text):
    """
    Normalize a string to a clean snake_case feature name.
    Handles French accented characters.
    """
    if not text:
        return ""
    replacements = {
        "é": "e", "è": "e", "ê": "e", "ë": "e",
        "à": "a", "â": "a", "ä": "a",
        "î": "i", "ï": "i",
        "ô": "o", "ö": "o",
        "ù": "u", "û": "u", "ü": "u",
        "ç": "c", "œ": "oe", "æ": "ae",
        "É": "e", "È": "e", "Ê": "e",
        "À": "a", "Â": "a",
        "Î": "i", "Ô": "o", "Û": "u", "Ç": "c",
    }
    result = text.lower().strip()
    for accented, plain in replacements.items():
        result = result.replace(accented, plain)
    for char in ["?", "(", ")", ",", ".", "'", '"', "!", ";"]:
        result = result.replace(char, "")
    for char in [" ", "-", "/", "\\", "__"]:
        result = result.replace(char, "_")
    # Collapse multiple underscores
    while "__" in result:
        result = result.replace("__", "_")
    result = result.strip("_")
    # Truncate to keep names manageable
    parts = result.split("_")[:8]
    return "_".join(parts)


# ---------------------------------------------------------------------------
# EVIDENCE VOCABULARY BUILDER
# ---------------------------------------------------------------------------

def load_metadata():
    """
    Load and parse release_evidences.json and release_conditions.json.

    Returns:
        evidences: raw dict from JSON
        conditions: raw dict from JSON
        code_to_name: dict mapping evidence code/value to canonical EN name
        code_to_name_fr: dict mapping evidence code/value to canonical FR name
        symptom_codes: set of evidence codes that are symptoms
        bilingual_labels: dict canonical_en_name -> {en, fr} labels
    """
    evid_path = os.path.join(DATA_DIR, "release_evidences.json")
    cond_path = os.path.join(DATA_DIR, "release_conditions.json")

    with open(evid_path, encoding="utf-8") as f:
        evidences = json.load(f)

    with open(cond_path, encoding="utf-8") as f:
        conditions = json.load(f)

    code_to_name = {}       # code -> canonical EN feature name
    code_to_name_fr = {}    # code -> canonical FR feature name
    symptom_codes = set()
    bilingual_labels = {}   # canonical_en -> {en: str, fr: str}

    for code, meta in evidences.items():
        question_en = meta.get("question_en", code)
        question_fr = meta.get("question_fr", question_en)
        data_type = meta.get("data_type", "B")
        is_antecedent = meta.get("is_antecedent", False)

        canonical_en = normalize_text(question_en)
        canonical_fr = normalize_text(question_fr)

        if data_type == "B":
            code_to_name[code] = canonical_en
            code_to_name_fr[code] = canonical_fr
            bilingual_labels[canonical_en] = {
                "en": question_en.rstrip("?").strip(),
                "fr": question_fr.rstrip("?").strip(),
                "code": code,
            }
        else:
            # Categorical / multi-choice: each non-default value = feature
            default_val = meta.get("default_value", "")
            for value, meanings in meta.get("value_meaning", {}).items():
                if value == default_val:
                    continue
                val_en = meanings.get("en", value)
                val_fr = meanings.get("fr", value)
                if val_en in ("NA", "N/A", ""):
                    continue

                val_en_norm = normalize_text(val_en)
                val_fr_norm = normalize_text(val_fr)

                feature_en = f"{canonical_en}__{val_en_norm}"
                feature_fr = f"{canonical_fr}__{val_fr_norm}"
                composite_key = f"{code}_@_{value}"

                code_to_name[composite_key] = feature_en
                code_to_name_fr[composite_key] = feature_fr
                bilingual_labels[feature_en] = {
                    "en": f"{question_en.rstrip('?').strip()} — {val_en}",
                    "fr": f"{question_fr.rstrip('?').strip()} — {val_fr}",
                    "code": composite_key,
                }

        if not is_antecedent:
            symptom_codes.add(code)

    logger.info(f"Evidence codes mapped: {len(code_to_name)}")
    logger.info(f"Symptom codes (non-antecedent): {len(symptom_codes)}")
    logger.info(f"Bilingual labels: {len(bilingual_labels)}")

    return (
        evidences, conditions,
        code_to_name, code_to_name_fr,
        symptom_codes, bilingual_labels
    )


def build_condition_metadata(conditions):
    """
    Extract bilingual metadata from conditions for prediction response.

    Returns:
        icd10_map: disease_name -> icd10 code
        severity_map: disease_name -> severity int
        names_fr: disease_name -> French name
        names_en: disease_name -> English name
    """
    icd10_map = {}
    severity_map = {}
    names_fr = {}
    names_en = {}

    for key, meta in conditions.items():
        name = meta.get("condition_name", key)
        icd10_map[name] = meta.get("icd10-id", "")
        severity_map[name] = meta.get("severity", 3)
        names_fr[name] = meta.get("cond-name-fr", name)
        names_en[name] = meta.get("cond-name-eng", name)

    return icd10_map, severity_map, names_fr, names_en


# ---------------------------------------------------------------------------
# DATA LOADING AND FEATURE ENGINEERING
# ---------------------------------------------------------------------------

def parse_evidences_column(evidences_str):
    """
    Parse the EVIDENCES column from string representation of a list.
    Example: "['E_48', 'E_50', 'E_54_@_V_161']" -> list of strings
    """
    try:
        if isinstance(evidences_str, list):
            return evidences_str
        return ast.literal_eval(evidences_str)
    except Exception:
        return []


def load_and_encode(csv_path, code_to_name, max_samples=None):
    """
    Load a DDXPlus CSV memory-efficiently using chunked reading,
    then encode evidences into readable feature lists.
    """
    logger.info(f"Loading {os.path.basename(csv_path)}...")

    # Read in chunks to avoid OOM on large files
    chunk_size = 50000
    chunks = []
    total_rows = 0

    for chunk in pd.read_csv(
        csv_path,
        chunksize=chunk_size,
        dtype={"AGE": "int16", "SEX": "category", "PATHOLOGY": "category"},
        low_memory=True,
        engine="c",
    ):
        chunks.append(chunk[["PATHOLOGY", "EVIDENCES"]])
        total_rows += len(chunk)
        if max_samples and total_rows >= max_samples * 1.2:
            break  # read a bit more than needed for stratified sampling

    df = pd.concat(chunks, ignore_index=True)
    df["PATHOLOGY"] = df["PATHOLOGY"].astype(str)
    logger.info(f"Loaded {len(df)} rows from disk")

    if max_samples and max_samples < len(df):
        df = (
            df.groupby("PATHOLOGY", group_keys=False)
            .apply(lambda x: x.sample(
                min(len(x), max(1, int(max_samples * len(x) / len(df)))),
                random_state=42
            ))
            .reset_index(drop=True)
        )
        logger.info(f"Sampled to {len(df)} rows (stratified)")

    logger.info(f"Encoding {len(df)} patients...")

    def encode_row(evidences_str):
        raw = parse_evidences_column(evidences_str)
        features = []
        for item in raw:
            if item in code_to_name:
                features.append(code_to_name[item])
        return features

    df["feature_list"] = df["EVIDENCES"].apply(encode_row)
    labels = df["PATHOLOGY"].values

    logger.info(f"Done. Unique pathologies in split: {len(set(labels))}")
    return df, labels



# ---------------------------------------------------------------------------
# BILINGUAL SYNONYM MAP
# ---------------------------------------------------------------------------

def build_synonym_map(code_to_name, code_to_name_fr, bilingual_labels):
    """
    Build a bilingual synonym map from clinical terms to canonical EN names.
    Aliases are verified against the real DDXPlus feature vocabulary.
    """
    valid_features = set(code_to_name.values())

    # Identity map for all canonical EN names
    synonym_map = {v: v for v in valid_features}

    # Map all FR canonical names to their EN equivalents
    for code, en_name in code_to_name.items():
        fr_name = code_to_name_fr.get(code)
        if fr_name and fr_name != en_name and en_name in valid_features:
            synonym_map[fr_name] = en_name

    # Verified manual aliases — mapped to real DDXPlus feature names
    # Format: alias -> exact canonical feature name
    verified_aliases = {

        # ── FEVER / FIÈVRE ──────────────────────────────────────────
        "fever":                    "do_you_have_a_fever_either_felt_or",
        "fievre":                   "do_you_have_a_fever_either_felt_or",
        "fièvre":                   "do_you_have_a_fever_either_felt_or",
        "high_fever":               "do_you_have_a_fever_either_felt_or",
        "mild_fever":               "do_you_have_a_fever_either_felt_or",
        "low_grade_fever":          "do_you_have_a_fever_either_felt_or",
        "febrile":                  "do_you_have_a_fever_either_felt_or",
        "febrile_state":            "do_you_have_a_fever_either_felt_or",
        "pyrexia":                  "do_you_have_a_fever_either_felt_or",
        "hyperthermia":             "do_you_have_a_fever_either_felt_or",
        "thinks_has_fever":         "do_you_think_you_have_a_fever",
        "subjective_fever":         "do_you_think_you_have_a_fever",

        # ── COUGH / TOUX ────────────────────────────────────────────
        "cough":                    "do_you_have_a_cough",
        "toux":                     "do_you_have_a_cough",
        "dry_cough":                "do_you_have_a_cough",
        "toux_seche":               "do_you_have_a_cough",
        "toux_grasse":              "do_you_have_a_cough_that_produces_colored",
        "productive_cough":         "do_you_have_a_cough_that_produces_colored",
        "colored_sputum":           "do_you_have_a_cough_that_produces_colored",
        "coughing_fits":            "do_you_have_intense_coughing_fits",
        "whooping":                 "does_the_person_have_a_whooping_cough",
        "coqueluche":               "does_the_person_have_a_whooping_cough",
        "coughing_blood":           "have_you_been_coughing_up_blood",
        "hemoptysis":               "have_you_been_coughing_up_blood",
        "crachat_sang":             "have_you_been_coughing_up_blood",
        "pain_on_coughing":         "are_the_symptoms_or_pain_increased_with_coughing",
        "vomit_after_coughing":     "did_you_vomit_after_coughing",

        # ── BREATHING / DYSPNÉE ─────────────────────────────────────
        "shortness_of_breath":      "are_you_experiencing_shortness_of_breath_or_difficulty",
        "breathlessness":           "are_you_experiencing_shortness_of_breath_or_difficulty",
        "difficulty_breathing":     "are_you_experiencing_shortness_of_breath_or_difficulty",
        "dyspnea":                  "are_you_experiencing_shortness_of_breath_or_difficulty",
        "dyspnee":                  "are_you_experiencing_shortness_of_breath_or_difficulty",
        "dyspnée":                  "are_you_experiencing_shortness_of_breath_or_difficulty",
        "essoufflement":            "are_you_experiencing_shortness_of_breath_or_difficulty",
        "gene_respiratoire":        "are_you_experiencing_shortness_of_breath_or_difficulty",
        "exertional_dyspnea":       "do_you_feel_out_of_breath_with_minimal",
        "effort_dyspnea":           "do_you_feel_out_of_breath_with_minimal",
        "dyspnee_effort":           "do_you_feel_out_of_breath_with_minimal",
        "choking":                  "do_you_have_bouts_of_choking_or_shortness",
        "suffocation":              "have_you_ever_felt_like_you_were_suffocating",
        "wheezing":                 "have_you_noticed_a_wheezing_sound_when_you",
        "sifflement":               "have_you_noticed_a_wheezing_sound_when_you",
        "stridor":                  "have_you_noticed_a_high_pitched_sound_when",
        "apnea":                    "do_you_ever_temporarily_stop_breathing_while_you're",
        "sleep_apnea":              "do_you_ever_temporarily_stop_breathing_while_you're",

        # ── CHEST PAIN / DOULEUR THORACIQUE ─────────────────────────
        "chest_pain":               "do_you_have_chest_pain_even_at_rest",
        "douleur_thoracique":       "do_you_have_chest_pain_even_at_rest",
        "douleur_poitrine":         "do_you_have_chest_pain_even_at_rest",
        "oppression_thoracique":    "do_you_have_chest_pain_even_at_rest",
        "thoracic_pain":            "do_you_have_chest_pain_even_at_rest",
        "angina":                   "do_you_have_chest_pain_even_at_rest",
        "chest_tightness":          "do_you_have_chest_pain_even_at_rest",
        "pain_upper_chest":         "do_you_feel_pain_somewhere__upper_chest",
        "pain_lower_chest":         "do_you_feel_pain_somewhere__lower_chest",
        "pain_left_chest":          "do_you_feel_pain_somewhere__side_of_the_chestl",
        "pain_right_chest":         "do_you_feel_pain_somewhere__side_of_the_chestr",
        "pain_posterior_chest":     "do_you_feel_pain_somewhere__posterior_chest_walll",
        "heartburn":                "do_you_have_a_burning_sensation_that_starts",
        "acid_reflux":              "do_you_have_a_burning_sensation_that_starts",
        "brulures_estomac":         "do_you_have_a_burning_sensation_that_starts",

        # ── HEADACHE / CÉPHALÉE ─────────────────────────────────────
        "headache":                 "do_you_feel_pain_somewhere__forehead",
        "cephalee":                 "do_you_feel_pain_somewhere__forehead",
        "céphalée":                 "do_you_feel_pain_somewhere__forehead",
        "cephalees":                "do_you_feel_pain_somewhere__forehead",
        "mal_de_tete":              "do_you_feel_pain_somewhere__forehead",
        "head_pain":                "do_you_feel_pain_somewhere__top_of_the_head",
        "temporal_headache":        "do_you_feel_pain_somewhere__templel",
        "occipital_headache":       "do_you_feel_pain_somewhere__occiput",
        "migraine":                 "have_you_ever_had_a_migraine_or_is",
        "migraines":                "have_you_ever_had_a_migraine_or_is",

        # ── NAUSEA / NAUSÉE ─────────────────────────────────────────
        "nausea":                   "are_you_feeling_nauseous_or_do_you_feel",
        "nausee":                   "are_you_feeling_nauseous_or_do_you_feel",
        "nausée":                   "are_you_feeling_nauseous_or_do_you_feel",
        "nausees":                  "are_you_feeling_nauseous_or_do_you_feel",
        "feeling_nauseous":         "are_you_feeling_nauseous_or_do_you_feel",

        # ── VOMITING / VOMISSEMENT ──────────────────────────────────
        "vomiting":                 "are_you_feeling_nauseous_or_do_you_feel",
        "vomissement":              "are_you_feeling_nauseous_or_do_you_feel",
        "vomissements":             "are_you_feeling_nauseous_or_do_you_feel",
        "vomited":                  "are_you_feeling_nauseous_or_do_you_feel",
        "throwing_up":              "are_you_feeling_nauseous_or_do_you_feel",
        "repeated_vomiting":        "have_you_vomited_several_times_or_have_you",
        "forceful_vomiting":        "have_you_vomited_several_times_or_have_you",
        "vomissement_repete":       "have_you_vomited_several_times_or_have_you",
        "hematemesis":              "have_you_recently_thrown_up_blood_or_something",
        "blood_in_vomit":           "have_you_recently_thrown_up_blood_or_something",
        "vomissement_sang":         "have_you_recently_thrown_up_blood_or_something",

        # ── DIARRHEA / DIARRHÉE ─────────────────────────────────────
        "diarrhea":                 "have_you_had_diarrhea_or_an_increase_in",
        "diarrhoea":                "have_you_had_diarrhea_or_an_increase_in",
        "diarrhee":                 "have_you_had_diarrhea_or_an_increase_in",
        "diarrhée":                 "have_you_had_diarrhea_or_an_increase_in",
        "loose_stools":             "have_you_had_diarrhea_or_an_increase_in",
        "selles_liquides":          "have_you_had_diarrhea_or_an_increase_in",
        "frequent_stools":          "have_you_had_diarrhea_or_an_increase_in",
        "constipation":             "do_you_usually_have_3_or_fewer_bowel",
        "black_stools":             "have_you_recently_had_stools_that_were_black",
        "melena":                   "have_you_recently_had_stools_that_were_black",
        "blood_in_stool":           "have_you_noticed_light_red_blood_or_blood",
        "rectal_bleeding":          "have_you_noticed_light_red_blood_or_blood",
        "bloating":                 "do_you_feel_your_abdomen_is_bloated_or",
        "abdominal_bloating":       "do_you_feel_your_abdomen_is_bloated_or",
        "ballonnements":            "do_you_feel_your_abdomen_is_bloated_or",

        # ── FATIGUE / ASTHÉNIE ──────────────────────────────────────
        "fatigue":                  "do_you_constantly_feel_fatigued_or_do_you",
        "asthenie":                 "do_you_constantly_feel_fatigued_or_do_you",
        "asthénie":                 "do_you_constantly_feel_fatigued_or_do_you",
        "exhaustion":               "do_you_constantly_feel_fatigued_or_do_you",
        "epuisement":               "do_you_constantly_feel_fatigued_or_do_you",
        "tired":                    "do_you_constantly_feel_fatigued_or_do_you",
        "extreme_fatigue":          "do_you_feel_so_tired_that_you_are",
        "weakness":                 "do_you_feel_so_tired_that_you_are",
        "faiblesse":                "do_you_feel_so_tired_that_you_are",
        "new_fatigue":              "have_you_noticed_any_new_fatigue_generalized_and",
        "generalized_fatigue":      "have_you_noticed_any_new_fatigue_generalized_and",
        "fatigue_generalisee":      "have_you_noticed_any_new_fatigue_generalized_and",

        # ── CHILLS / FRISSONS ───────────────────────────────────────
        "chills":                   "have_you_had_chills_or_shivers",
        "frissons":                 "have_you_had_chills_or_shivers",
        "frisson":                  "have_you_had_chills_or_shivers",
        "rigors":                   "have_you_had_chills_or_shivers",
        "shivering":                "have_you_had_chills_or_shivers",
        "shivers":                  "have_you_had_chills_or_shivers",

        # ── SWEATING / TRANSPIRATION ─────────────────────────────────
        "sweating":                 "have_you_had_significantly_increased_sweating",
        "night_sweats":             "have_you_had_significantly_increased_sweating",
        "sueurs_nocturnes":         "have_you_had_significantly_increased_sweating",
        "transpiration":            "have_you_had_significantly_increased_sweating",
        "diaphoresis":              "have_you_had_significantly_increased_sweating",
        "sueurs":                   "have_you_had_significantly_increased_sweating",
        "hyperhidrosis":            "have_you_had_significantly_increased_sweating",

        # ── ABDOMINAL PAIN / DOULEUR ABDOMINALE ─────────────────────
        "abdominal_pain":           "do_you_feel_pain_somewhere__belly",
        "stomach_pain":             "do_you_feel_pain_somewhere__belly",
        "belly_pain":               "do_you_feel_pain_somewhere__belly",
        "douleur_abdominale":       "do_you_feel_pain_somewhere__belly",
        "douleur_ventre":           "do_you_feel_pain_somewhere__belly",
        "mal_au_ventre":            "do_you_feel_pain_somewhere__belly",
        "epigastric_pain":          "do_you_feel_pain_somewhere__epigastric",
        "douleur_epigastrique":     "do_you_feel_pain_somewhere__epigastric",
        "right_iliac_pain":         "do_you_feel_pain_somewhere__iliac_fossar",
        "left_iliac_pain":          "do_you_feel_pain_somewhere__iliac_fossal",
        "flank_pain_right":         "do_you_feel_pain_somewhere__flankr",
        "flank_pain_left":          "do_you_feel_pain_somewhere__flankl",
        "pubic_pain":               "do_you_feel_pain_somewhere__pubis",

        # ── BACK PAIN / DOULEUR DORSALE ─────────────────────────────
        "back_pain":                "do_you_feel_pain_somewhere__thoracic_spine",
        "douleur_dos":              "do_you_feel_pain_somewhere__thoracic_spine",
        "dorsalgie":                "do_you_feel_pain_somewhere__thoracic_spine",
        "lombalgie":                "do_you_feel_pain_somewhere__lumbar_spine",
        "low_back_pain":            "do_you_feel_pain_somewhere__lumbar_spine",
        "lumbar_pain":              "do_you_feel_pain_somewhere__lumbar_spine",
        "neck_pain":                "do_you_feel_pain_somewhere__back_of_the_neck",
        "douleur_nuque":            "do_you_feel_pain_somewhere__back_of_the_neck",
        "cervical_pain":            "do_you_feel_pain_somewhere__cervical_spine",
        "douleur_cervicale":        "do_you_feel_pain_somewhere__cervical_spine",

        # ── JOINT PAIN / DOULEUR ARTICULAIRE ────────────────────────
        "joint_pain":               "do_you_feel_pain_somewhere__kneel",
        "arthralgia":               "do_you_feel_pain_somewhere__kneel",
        "arthralgies":              "do_you_feel_pain_somewhere__kneel",
        "douleur_articulaire":      "do_you_feel_pain_somewhere__kneel",
        "knee_pain":                "do_you_feel_pain_somewhere__kneel",
        "knee_pain_right":          "do_you_feel_pain_somewhere__kneer",
        "knee_pain_left":           "do_you_feel_pain_somewhere__kneel",
        "hip_pain":                 "do_you_feel_pain_somewhere__hipl",
        "shoulder_pain":            "do_you_feel_pain_somewhere__shoulderl",
        "ankle_pain":               "do_you_feel_pain_somewhere__anklel",
        "wrist_pain":               "do_you_feel_pain_somewhere__dorsal_aspect_of_the_wristl",

        # ── MUSCLE PAIN / MYALGIE ───────────────────────────────────
        "muscle_pain":              "do_you_have_diffuse_widespread_muscle_pain",
        "myalgia":                  "do_you_have_diffuse_widespread_muscle_pain",
        "myalgies":                 "do_you_have_diffuse_widespread_muscle_pain",
        "douleur_musculaire":       "do_you_have_diffuse_widespread_muscle_pain",
        "courbatures":              "do_you_have_diffuse_widespread_muscle_pain",
        "muscle_soreness":          "do_you_feel_that_muscle_spasms_or_soreness",
        "muscle_spasms":            "do_you_have_annoying_muscle_spasms_in_your",
        "arm_weakness":             "do_you_feel_weakness_in_both_arms_and",
        "facial_weakness":          "have_you_noticed_weakness_in_your_facial_muscles",

        # ── SORE THROAT / MAL DE GORGE ──────────────────────────────
        "sore_throat":              "do_you_have_a_sore_throat",
        "mal_de_gorge":             "do_you_have_a_sore_throat",
        "gorge_irritee":            "do_you_have_a_sore_throat",
        "pharyngite":               "do_you_have_a_sore_throat",
        "angine":                   "do_you_have_a_sore_throat",
        "throat_pain":              "do_you_feel_pain_somewhere__pharynx",
        "tonsil_pain":              "do_you_feel_pain_somewhere__tonsill",
        "dysphagia":                "do_you_have_difficulty_swallowing_or_have_a",
        "difficulty_swallowing":    "do_you_have_difficulty_swallowing_or_have_a",
        "deglutition":              "do_you_have_difficulty_swallowing_or_have_a",
        " hoarseness":               "do_you_have_persistent_hoarseness",
        "dysphonia":                "do_you_have_persistent_hoarseness",
        "enrouement":               "do_you_have_persistent_hoarseness",
        "white_spots_mouth":        "do_you_have_white_spots_inside_your_mouth",
        "oral_ulcers":              "do_you_have_ulcers_on_your_tongue_or",
        "aphthous":                 "do_you_have_ulcers_on_your_tongue_or",

        # ── NASAL / RHINOLOGIE ──────────────────────────────────────
        "nasal_congestion":         "do_you_have_nasal_congestion_or_a_stuffy",
        "congestion":               "do_you_have_nasal_congestion_or_a_stuffy",
        "congestion_nasale":        "do_you_have_nasal_congestion_or_a_stuffy",
        "nez_bouche":               "do_you_have_nasal_congestion_or_a_stuffy",
        "stuffy_nose":              "do_you_have_nasal_congestion_or_a_stuffy",
        "rhinorrhea":               "do_you_have_greenish_or_yellowish_nasal_discharge",
        "nasal_discharge":          "do_you_have_greenish_or_yellowish_nasal_discharge",
        "ecoulement_nasal":         "do_you_have_greenish_or_yellowish_nasal_discharge",
        "runny_nose":               "is_your_nose_or_the_back_of_your",
        "rhinorrhee":               "is_your_nose_or_the_back_of_your",
        "nez_qui_coule":            "is_your_nose_or_the_back_of_your",
        "loss_of_smell":            "have_you_lost_your_sense_of_smell",
        "anosmia":                  "have_you_lost_your_sense_of_smell",
        "anosmie":                  "have_you_lost_your_sense_of_smell",
        "perte_odorat":             "have_you_lost_your_sense_of_smell",
        "sinusitis":                "have_you_been_diagnosed_with_chronic_sinusitis",

        # ── DIZZINESS / VERTIGES ─────────────────────────────────────
        "dizziness":                "do_you_feel_lightheaded_and_dizzy_or_do",
        "vertigo":                  "do_you_feel_lightheaded_and_dizzy_or_do",
        "vertige":                  "do_you_feel_lightheaded_and_dizzy_or_do",
        "vertiges":                 "do_you_feel_lightheaded_and_dizzy_or_do",
        "lightheadedness":          "do_you_feel_lightheaded_and_dizzy_or_do",
        "etourdissement":           "do_you_feel_lightheaded_and_dizzy_or_do",
        "tete_qui_tourne":          "do_you_feel_lightheaded_and_dizzy_or_do",
        "slightly_dizzy":           "do_you_feel_slightly_dizzy_or_lightheaded",
        "unsteady":                 "do_you_feel_lightheaded_and_dizzy_or_do",

        # ── SKIN / DERMATOLOGIE ──────────────────────────────────────
        "rash":                     "do_you_have_any_lesions_redness_or_problems",
        "skin_rash":                "do_you_have_any_lesions_redness_or_problems",
        "eruption_cutanee":         "do_you_have_any_lesions_redness_or_problems",
        "lesions":                  "do_you_have_skin_lesions_that_are_characterized",
        "skin_lesions":             "do_you_have_skin_lesions_that_are_characterized",
        "lesions_cutanees":         "do_you_have_skin_lesions_that_are_characterized",
        "itching":                  "do_you_have_severe_itching_that_gets_worse",
        "prurit":                   "do_you_have_severe_itching_that_gets_worse",
        "demangeaisons":            "do_you_have_severe_itching_that_gets_worse",
        "démangeaisons":            "do_you_have_severe_itching_that_gets_worse",
        "blisters":                 "do_you_have_recurrent_blisters_on_the_same",
        "vesicles":                 "do_you_have_recurrent_blisters_on_the_same",
        "pallor":                   "is_your_skin_much_paler_than_usual",
        "pale_skin":                "is_your_skin_much_paler_than_usual",
        "paleur":                   "is_your_skin_much_paler_than_usual",
        "red_cheeks":               "did_your_cheeks_suddenly_turn_red",
        "flushing":                 "did_your_cheeks_suddenly_turn_red",
        "diffuse_redness":          "have_you_noticed_a_diffuse_widespread_redness_in",
        "rash_pale":                "what_color_is_the_rash__pale",
        "rash_pink":                "what_color_is_the_rash__pink",
        "rash_red":                 "what_color_is_the_rash__red",
        "rash_yellow":              "what_color_is_the_rash__yellow",

        # ── APPETITE / WEIGHT ────────────────────────────────────────
        "loss_of_appetite":         "do_you_have_a_decrease_in_appetite",
        "anorexia":                 "do_you_have_a_decrease_in_appetite",
        "anorexie":                 "do_you_have_a_decrease_in_appetite",
        "perte_appetit":            "do_you_have_a_decrease_in_appetite",
        "decreased_appetite":       "do_you_have_a_decrease_in_appetite",
        "recent_loss_of_appetite":  "have_you_recently_had_a_loss_of_appetite",
        "weight_loss":              "have_you_been_unintentionally_losing_weight_or_have",
        "perte_de_poids":           "have_you_been_unintentionally_losing_weight_or_have",
        "amaigrissement":           "have_you_been_unintentionally_losing_weight_or_have",
        "involuntary_weight_loss":  "have_you_had_an_involuntary_weight_loss_over",
        "weight_gain":              "have_you_gained_weight_recently",
        "prise_de_poids":           "have_you_gained_weight_recently",
        "obesity":                  "are_you_significantly_overweight_compared_to_people_of",

        # ── CARDIOVASCULAR ───────────────────────────────────────────
        "palpitations":             "do_you_feel_your_heart_is_beating_fast",
        "heart_palpitations":       "do_you_feel_your_heart_is_beating_fast",
        "palpitations_cardiaques":  "do_you_feel_your_heart_is_beating_fast",
        "tachycardia":              "do_you_feel_your_heart_is_beating_fast",
        "tachycardie":              "do_you_feel_your_heart_is_beating_fast",
        "rapid_heartbeat":          "do_you_feel_your_heart_is_beating_very",
        "heart_racing":             "do_you_feel_your_heart_is_beating_very",
        "heart_failure":            "do_you_have_heart_failure",
        "hypertension":             "do_you_have_high_blood_pressure_or_do",
        "high_blood_pressure":      "do_you_have_high_blood_pressure_or_do",
        "hypertension_arterielle":  "do_you_have_high_blood_pressure_or_do",
        "consulting_hypertension":  "are_you_consulting_because_you_have_high_blood",
        "high_cholesterol":         "do_you_have_high_cholesterol_or_do_you",
        "hypercholesterolemie":     "do_you_have_high_cholesterol_or_do_you",
        "heart_attack_history":     "have_you_ever_had_a_heart_attack_or",
        "known_heart_defect":       "do_you_have_a_known_heart_defect",
        "swelling":                 "do_you_have_swelling_anywhere",
        "edema":                    "do_you_have_swelling_anywhere",
        "oedeme":                   "do_you_have_swelling_anywhere",
        "ankle_swelling":           "where_is_the_swelling_located__anklel",
        "calf_swelling":            "where_is_the_swelling_located__calfl",
        "dvt":                      "have_you_ever_had_deep_vein_thrombosis_dvt",
        "thrombose":                "have_you_ever_had_deep_vein_thrombosis_dvt",
        "prominent_veins":          "where_is_the_swelling_located__calfl",

        # ── NEUROLOGICAL ─────────────────────────────────────────────
        "confusion":                "have_you_felt_confused_or_disorientated_lately",
        "disorientation":           "have_you_felt_confused_or_disorientated_lately",
        "confusion_mentale":        "have_you_felt_confused_or_disorientated_lately",
        "numbness":                 "do_you_have_numbness_or_tingling_anywhere_in",
        "tingling":                 "do_you_have_numbness_or_tingling_anywhere_in",
        "paresthesia":              "do_you_have_numbness_or_tingling_anywhere_in",
        "paresthesie":              "do_you_have_numbness_or_tingling_anywhere_in",
        "engoudissement":           "do_you_have_numbness_or_tingling_anywhere_in",
        "recent_numbness":          "have_you_recently_had_numbness_loss_of_sensation",
        "loss_of_consciousness":    "did_you_lose_consciousness",
        "syncope":                  "did_you_lose_consciousness",
        "unconscious":              "did_you_lose_consciousness",
        "convulsions":              "have_you_lost_consciousness_associated_with_violent_and",
        "seizures":                 "have_you_lost_consciousness_associated_with_violent_and",
        "paralysis":                "have_you_had_weakness_or_paralysis_on_one",
        "hemiplegia":               "have_you_had_weakness_or_paralysis_on_one",
        "stroke_history":           "have_you_ever_had_a_stroke",
        "head_trauma":              "have_you_ever_had_a_head_trauma",
        "traumatisme_cranien":      "have_you_ever_had_a_head_trauma",
        "speech_difficulty":        "do_you_have_difficulty_articulating_words_speaking",
        "dysarthria":               "do_you_have_difficulty_articulating_words_speaking",
        "slurred_speech":           "do_you_have_difficulty_articulating_words_speaking",
        "tone_changes":             "have_you_noticed_that_the_tone_of_your",
        "restless_legs":            "do_you_sometimes_feel_the_urge_to_move",
        "anxiety":                  "do_you_feel_anxious",
        "anxiete":                  "do_you_feel_anxious",
        "angoisse":                 "do_you_feel_anxious",
        "panic":                    "do_you_feel_like_you_are_dying_or",
        "panic_attack":             "do_you_feel_like_you_are_dying_or",
        "depersonalization":        "do_you_feel_like_you_are_detached_from",
        "dissociation":             "do_you_feel_like_you_are_detached_from",
        "depression":               "do_you_have_symptoms_of_depression_such_as",
        "depressive_symptoms":      "do_you_have_symptoms_of_depression_such_as",
        "depression_diagnostiquee": "have_you_ever_been_diagnosed_with_depression",
        "irritability":             "are_you_more_irritable_or_has_your_mood",
        "mood_changes":             "are_you_more_irritable_or_has_your_mood",
        "light_sensitivity":        "do_you_have_unusual_sensitivity_to_light",
        "photophobia":              "do_you_have_unusual_sensitivity_to_light",
        "photophobie":              "do_you_have_unusual_sensitivity_to_light",

        # ── VISION ──────────────────────────────────────────────────
        "vision_problems":          "do_you_have_problems_with_your_vision",
        "blurred_vision":           "do_you_have_problems_with_your_vision",
        "vue_trouble":              "do_you_have_problems_with_your_vision",
        "excessive_tearing":        "do_you_feel_that_your_eyes_produce_excessive",
        "watery_eyes":              "do_you_feel_that_your_eyes_produce_excessive",
        "eye_pain_right":           "do_you_feel_pain_somewhere__eyer",
        "eye_pain_left":            "do_you_feel_pain_somewhere__eyel",

        # ── URINARY / RÉNAL ──────────────────────────────────────────
        "urinary_burning":          "do_you_feel_pain_somewhere__pubis",
        "dysuria":                  "do_you_feel_pain_somewhere__pubis",
        "brulures_urinaires":       "do_you_feel_pain_somewhere__pubis",
        "kidney_problem":           "do_you_have_a_known_kidney_problem_resulting",
        "chronic_kidney_failure":   "do_you_have_chronic_kidney_failure",
        "dialysis":                 "do_you_currently_undergo_dialysis",
        "vaginal_discharge":        "have_you_had_any_vaginal_discharge",
        "pertes_vaginales":         "have_you_had_any_vaginal_discharge",

        # ── BLEEDING / HÉMOSTASE ─────────────────────────────────────
        "bleeding":                 "have_you_noticed_any_unusual_bleeding_or_bruising",
        "bruising":                 "have_you_noticed_any_unusual_bleeding_or_bruising",
        "saignement":               "have_you_noticed_any_unusual_bleeding_or_bruising",
        "ecchymose":                "have_you_noticed_any_unusual_bleeding_or_bruising",
        "anticoagulants":           "are_you_taking_any_new_oral_anticoagulants_noacs",

        # ── RESPIRATORY HISTORY ──────────────────────────────────────
        "asthma":                   "do_you_have_asthma_or_have_you_ever",
        "asthme":                   "do_you_have_asthma_or_have_you_ever",
        "copd":                     "do_you_have_a_chronic_obstructive_pulmonary_disease",
        "bpco":                     "do_you_have_a_chronic_obstructive_pulmonary_disease",
        "pneumonia_history":        "have_you_ever_had_pneumonia",
        "pneumothorax_history":     "have_you_ever_had_a_spontaneous_pneumothorax",
        "fluid_in_lungs":           "have_you_ever_had_fluid_in_your_lungs",
        "asthma_attacks":           "have_you_had_2_or_more_asthma_attacks",
        "hospitalized_asthma":      "have_you_been_hospitalized_for_an_asthma_attack",
        "night_symptoms":           "are_your_symptoms_more_prominent_at_night",
        "symptoms_worse_lying":     "are_your_symptoms_worse_when_lying_down_and",
        "symptoms_worse_coughing":  "are_the_symptoms_or_pain_increased_with_coughing",

        # ── INFECTIOUS / EXPOSURE ────────────────────────────────────
        "contact_sick_person":      "have_you_been_in_contact_with_a_person",
        "contact_malade":           "have_you_been_in_contact_with_a_person",
        "recent_viral_infection":   "have_you_recently_had_a_viral_infection",
        "recent_cold":              "have_you_had_a_cold_in_the_last",
        "travel_asia":              "have_you_traveled_out_of_the_country_in__asia",
        "travel_africa":            "have_you_traveled_out_of_the_country_in__west_africa",
        "travel_north_africa":      "have_you_traveled_out_of_the_country_in__north_africa",
        "travel_south_america":     "have_you_traveled_out_of_the_country_in__south_america",
        "travel_caribbean":         "have_you_traveled_out_of_the_country_in__caraibes",
        "immunosuppressed":         "are_you_immunosuppressed",
        "immunosupprime":           "are_you_immunosuppressed",
        "hiv_positive":             "are_you_infected_with_the_human_immunodeficiency_virus",
        "vih":                      "are_you_infected_with_the_human_immunodeficiency_virus",
        "sida":                     "are_you_infected_with_the_human_immunodeficiency_virus",
        "daycare_exposure":         "do_you_attend_or_work_in_a_daycare",
        "vaccinations_not_uptodate": "are_your_vaccinations_up_to_date",
        "intravenous_drugs":        "are_you_currently_using_intravenous_drugs",
        "iv_drugs":                 "are_you_currently_using_intravenous_drugs",

        # ── LIFESTYLE / ANTECEDENTS ──────────────────────────────────
        "smoker":                   "do_you_smoke_cigarettes",
        "fumeur":                   "do_you_smoke_cigarettes",
        "tabac":                    "do_you_smoke_cigarettes",
        "former_smoker":            "are_you_a_former_smoker",
        "ex_fumeur":                "are_you_a_former_smoker",
        "secondhand_smoke":         "are_you_exposed_to_secondhand_cigarette_smoke_on",
        "alcohol":                  "do_you_drink_alcohol_excessively_or_do_you",
        "alcool":                   "do_you_drink_alcohol_excessively_or_do_you",
        "energy_drinks":            "do_you_consume_energy_drinks_regularly",
        "exercises_regularly":      "do_you_exercise_regularly_4_times_per_week",
        "poor_diet":                "do_you_have_a_poor_diet",
        "diabetes":                 "do_you_have_diabetes",
        "diabete":                  "do_you_have_diabetes",
        "family_diabetes":          "does_anyone_in_your_family_have_diabetes",
        "osteoporosis_treatment":   "are_you_being_treated_for_osteoporosis",
        "eating_disorder":          "do_you_struggle_with_an_eating_disorder",
        "trouble_alimentaire":      "do_you_struggle_with_an_eating_disorder",
        "cancer":                   "do_you_have_an_active_cancer",
        "cancer_actif":             "do_you_have_an_active_cancer",
        "hormones":                 "do_you_currently_take_hormones",
        "mining_worker":            "do_you_work_in_the_mining_sector",
        "anemia_history":           "have_you_ever_had_a_diagnosis_of_anemia",
        "anemie":                   "have_you_ever_had_a_diagnosis_of_anemia",
        "premature_birth":          "were_you_born_prematurely_or_did_you_suffer",
        "poor_circulation":         "do_you_have_a_problem_with_poor_circulation",
        "circulation":              "do_you_have_a_problem_with_poor_circulation",
        "cystic_fibrosis":          "do_you_have_cystic_fibrosis",
        "mucoviscidose":            "do_you_have_cystic_fibrosis",
    }

    # Add verified aliases — only those pointing to real features
    for alias, target in verified_aliases.items():
        if alias not in synonym_map:
            if target in valid_features:
                synonym_map[alias] = target
            else:
                # Log missing targets for debugging
                logger.warning(
                    f"Synonym target not in vocabulary: "
                    f"'{alias}' -> '{target}'"
                )

    mapped = sum(1 for v in synonym_map.values() if v in valid_features)
    logger.info(
        f"Synonym map: {len(synonym_map)} total aliases, "
        f"{mapped} resolve to valid features"
    )
    return synonym_map



# ---------------------------------------------------------------------------
# TRAINING
# ---------------------------------------------------------------------------

def train_model(X_train, y_train):
    """Train RandomForest with isotonic calibration."""
    logger.info("Training RandomForestClassifier (200 trees)...")
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=20,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        class_weight="balanced",
        n_jobs=1,
    )
    rf.fit(X_train, y_train)
    logger.info("Calibrating probabilities (sigmoid regression)...")
    calibrated = CalibratedClassifierCV(rf, method="sigmoid", cv="prefit")
    calibrated.fit(X_train, y_train)
    return calibrated, rf


def evaluate(model, X_test, y_test, label="Validation"):
    """Evaluate model on a held-out set."""
    y_pred = model.predict(X_test)
    f1 = f1_score(y_test, y_pred, average="weighted")
    logger.info(f"\n{label} F1 (weighted): {f1:.4f}")
    logger.info(classification_report(y_test, y_pred, zero_division=0))
    return f1


def cross_validate(rf, X, y, cv=5):
    """Stratified k-fold CV on base RF."""
    logger.info(f"Running {cv}-fold cross-validation...")
    skf = StratifiedKFold(n_splits=cv, shuffle=True, random_state=42)
    scores = cross_val_score(
        rf, X, y, cv=skf,
        scoring="f1_weighted", n_jobs=1
    )
    logger.info(
        f"CV F1 scores: {scores.round(4)} | "
        f"Mean: {scores.mean():.4f} ± {scores.std():.4f}"
    )
    return scores.tolist()


# ---------------------------------------------------------------------------
# SAVE
# ---------------------------------------------------------------------------

def save_artifacts(
    model, mlb, symptom_names, synonym_map,
    bilingual_labels, metadata, output_dir
):
    """Save all model artifacts to disk."""
    os.makedirs(output_dir, exist_ok=True)

    payload = {
        "model": model,
        "mlb": mlb,
        "symptoms_list": symptom_names,
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
        "icd10_map": metadata.get("icd10_map", {}),
        "severity_map": metadata.get("severity_map", {}),
        "names_fr": metadata.get("names_fr", {}),
        "names_en": metadata.get("names_en", {}),
        "synonym_map": synonym_map,
        "bilingual_labels": bilingual_labels,
        "disclaimer_fr": DISCLAIMER_FR,
        "disclaimer_en": DISCLAIMER_EN,
    }

    model_path = os.path.join(output_dir, "symptom_classifier.joblib")
    joblib.dump(payload, model_path, compress=3)
    size_mb = os.path.getsize(model_path) / 1024 / 1024
    logger.info(f"Model saved: {model_path} ({size_mb:.1f} MB)")

    # Human-readable metadata JSON
    meta_out = {k: v for k, v in metadata.items()}
    meta_out["n_symptoms"] = len(symptom_names)
    meta_out["n_synonym_aliases"] = len(synonym_map)
    with open(os.path.join(output_dir, "model_metadata.json"), "w",
              encoding="utf-8") as f:
        json.dump(meta_out, f, indent=2, ensure_ascii=False)

    # Bilingual symptom vocabulary for frontend autocomplete
    symptoms_bilingual = []
    for name in symptom_names:
        label = bilingual_labels.get(name, {})
        symptoms_bilingual.append({
            "value": name,
            "label_en": label.get("en", name.replace("_", " ")),
            "label_fr": label.get("fr", name.replace("_", " ")),
        })

    with open(os.path.join(output_dir, "symptoms_list.json"), "w",
              encoding="utf-8") as f:
        json.dump(symptoms_bilingual, f, indent=2, ensure_ascii=False)

    # Bilingual disease list
    diseases_bilingual = []
    for d in metadata["diseases"]:
        diseases_bilingual.append({
            "name": d,
            "name_en": metadata.get("names_en", {}).get(d, d),
            "name_fr": metadata.get("names_fr", {}).get(d, d),
            "icd10": metadata.get("icd10_map", {}).get(d, ""),
            "severity": metadata.get("severity_map", {}).get(d, 3),
        })

    with open(os.path.join(output_dir, "diseases_list.json"), "w",
              encoding="utf-8") as f:
        json.dump(diseases_bilingual, f, indent=2, ensure_ascii=False)

    # Synonym map for documentation / debugging
    with open(os.path.join(output_dir, "synonym_map.json"), "w",
              encoding="utf-8") as f:
        json.dump(synonym_map, f, indent=2, ensure_ascii=False)

    logger.info("All artifacts saved.")
    return model_path


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main(max_samples=300000):
    logger.info("=" * 60)
    logger.info("MEDERA AI — DDXPLUS BILINGUAL TRAINING PIPELINE")
    logger.info("=" * 60)

    # 1. Load metadata
    (
        evidences, conditions,
        code_to_name, code_to_name_fr,
        symptom_codes, bilingual_labels
    ) = load_metadata()

    icd10_map, severity_map, names_fr, names_en = build_condition_metadata(
        conditions
    )

    # 2. Load and encode train + validation
    train_df, y_train = load_and_encode(
        os.path.join(DATA_DIR, "release_train_patients.csv"),
        code_to_name,
        max_samples=max_samples
    )
    val_df, y_val = load_and_encode(
        os.path.join(DATA_DIR, "release_validate_patients.csv"),
        code_to_name,
        max_samples=max_samples // 8
    )

    # 3. Fit MultiLabelBinarizer on train features (use sparse to save memory)
    logger.info("Building feature matrix (sparse)...")
    mlb = MultiLabelBinarizer(sparse_output=True)
    X_train = mlb.fit_transform(train_df["feature_list"])
    X_val = mlb.transform(val_df["feature_list"])

    # Free up memory — the raw DataFrames are huge and no longer needed
    del train_df
    del val_df


    symptom_names = sorted(mlb.classes_.tolist())
    logger.info(f"Feature matrix shape: {X_train.shape}")
    logger.info(f"Vocabulary: {len(symptom_names)} features")
    logger.info(f"Diseases in train: {len(set(y_train))}")

    # 4. Train
    calibrated_model, base_rf = train_model(X_train, y_train)

    # 5. Evaluate on validation set
    f1_val = evaluate(calibrated_model, X_val, y_val)

    # 6. Cross-validate on a subset (CV on 1M rows is slow)
    cv_size = min(100000, X_train.shape[0])
    rng = np.random.RandomState(42)
    idx = rng.choice(X_train.shape[0], cv_size, replace=False)
    cv_scores = cross_validate(base_rf, X_train[idx], y_train[idx], cv=5)


    # 7. Build bilingual synonym map
    synonym_map = build_synonym_map(
        code_to_name, code_to_name_fr, bilingual_labels
    )

    # 8. Assemble metadata and save
    diseases = sorted(set(y_train).union(set(y_val)))
    metadata = {
        "version": "2.0.0",
        "model_type": "RandomForest+IsotonicCalibration",
        "dataset": "DDXPlus-English-Bilingual",
        "f1_score": round(f1_val, 4),
        "cv_scores": cv_scores,
        "cv_mean": round(float(np.mean(cv_scores)), 4),
        "cv_std": round(float(np.std(cv_scores)), 4),
        "training_date": datetime.now().isoformat(),
        "n_training_samples": X_train.shape[0],
        "n_validation_samples": X_val.shape[0],
        "diseases": diseases,
        "n_diseases": len(diseases),
        "icd10_map": icd10_map,
        "severity_map": severity_map,
        "names_fr": names_fr,
        "names_en": names_en,
        "disclaimer_fr": DISCLAIMER_FR,
        "disclaimer_en": DISCLAIMER_EN,
    }

    model_path = save_artifacts(
        calibrated_model, mlb, symptom_names,
        synonym_map, bilingual_labels, metadata, MODELS_DIR
    )

    # 9. Sanity check with bilingual output
    logger.info("\nSanity check (bilingual output):")
    test_cases = [
        ["fever", "cough", "difficulty_breathing"],
        ["headache", "nausea", "dizziness"],
        ["fievre", "toux", "fatigue"],
        ["douleur_thoracique", "palpitations", "essoufflement"],
    ]
    for symptoms in test_cases:
        resolved = []
        for s in symptoms:
            canonical = synonym_map.get(
                normalize_text(s),
                synonym_map.get(s)
            )
            if canonical and canonical in mlb.classes_:
                resolved.append(canonical)
        if len(resolved) < 2:
            logger.info(f"  {symptoms} -> not enough known symptoms")
            continue
        X_t = mlb.transform([resolved])
        probs = calibrated_model.predict_proba(X_t)[0]
        top3_idx = np.argsort(probs)[-3:][::-1]
        classes = calibrated_model.classes_
        results = []
        for i in top3_idx:
            disease = classes[i]
            results.append({
                "en": names_en.get(disease, disease),
                "fr": names_fr.get(disease, disease),
                "confidence": round(float(probs[i]), 3),
                "icd10": icd10_map.get(disease, ""),
            })
        logger.info(f"  Input: {symptoms}")
        for r in results:
            logger.info(
                f"    → [{r['icd10']}] {r['en']} / {r['fr']} "
                f"({r['confidence']:.1%})"
            )

    logger.info("\n" + "=" * 60)
    logger.info("TRAINING COMPLETE")
    logger.info(f"  Model:      RandomForest + Isotonic Calibration")
    logger.info(f"  Dataset:    DDXPlus ({X_train.shape[0]:,} samples)")
    logger.info(f"  Languages:  English + French (bilingual)")
    logger.info(f"  Val F1:     {f1_val:.4f}")
    logger.info(
        f"  CV F1:      {np.mean(cv_scores):.4f} "
        f"± {np.std(cv_scores):.4f}"
    )
    logger.info(f"  Diseases:   {len(diseases)}")
    logger.info(f"  Features:   {len(symptom_names)}")
    logger.info(f"  Synonyms:   {len(synonym_map)} aliases")
    logger.info(f"  Saved:      {model_path}")
    logger.info("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Train MedEra bilingual symptom classifier"
    )
    parser.add_argument(
        "--samples", type=int, default=300000,
        help="Max training samples (0 = full dataset, default 300000)"
    )
    args = parser.parse_args()
    max_s = args.samples if args.samples > 0 else None
    main(max_samples=max_s)
