"""
MedEra — Extended Dataset Builder v2
Fixes: TB dominated by Pulmonary Eosinophilia, rare catch-all diseases,
common diseases under-represented.
"""

import os, re, json, random, logging
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)
random.seed(42)
np.random.seed(42)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUT_PATH = os.path.join(DATA_DIR, "extended_patients.csv")

# These diseases have symptom profiles so broad they act as catch-alls.
# Pulmonary Eosinophilia alone caused TB to be suppressed entirely.
EXCLUDED_DISEASES = {
    "Pulmonary Eosinophilia",
    "Amyloidosis",
    "Cryptococcosis",
    "Paracoccidioidomycosis",
    "Chromoblastomycosis",
    "Dimorphic Fungi Infections",
}

# Common/critical diseases get more cases to compete with rare ones.
# Multiplier applied to base cases_per_disease.
DISEASE_MULTIPLIER = {
    "Tuberculosis": 4.0,
    "Tb": 4.0,
    "Malaria": 3.0,
    "Typhoid Fever": 3.0,
    "Typhoid": 3.0,
    "Pneumonia": 3.0,
    "Influenza": 3.0,
    "Common Cold": 3.0,
    "Upper Respiratory Tract Infection": 3.0,
    "Urti": 3.0,
    "Gastroenteritis": 3.0,
    "Hypertension": 3.0,
    "Diabetes Mellitus": 3.0,
    "Diabetes": 3.0,
    "Hepatitis": 2.5,
    "Hepatitis A": 2.5,
    "Hepatitis B": 2.5,
    "Hiv/Aids": 2.5,
    "Hiv": 2.5,
    "Heart Attack": 2.5,
    "Myocardial Infarction": 2.5,
    "Peptic Ulcer Disease": 2.5,
    "Peptic Ulcer": 2.5,
    "Anemia": 2.5,
    "Meningitis": 2.5,
    "Urinary Tract Infection": 2.5,
    "Bronchitis": 2.0,
    "Asthma": 2.0,
    "Dengue": 2.0,
    "Chickenpox": 2.0,
    # Broad-profile rare diseases — reduce their dominance
    "Systemic Lupus Erythematosus": 0.4,
    "Lupus": 0.4,
    "Sarcoidosis": 0.4,
    "Fibromyalgia": 0.4,
    "Chronic Fatigue Syndrome": 0.4,
    "Lymphoma": 0.5,
}


def normalize_symptom(s):
    s = s.lower().strip()
    for a, b in [("é","e"),("è","e"),("ê","e"),("à","a"),("â","a"),
                 ("î","i"),("ô","o"),("ù","u"),("û","u"),("ç","c"),("œ","oe")]:
        s = s.replace(a, b)
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s


def normalize_disease(name):
    return name.strip().title()


def load_kaggle(path):
    logger.info("Loading Kaggle dataset...")
    df = pd.read_csv(path)
    df = df.loc[:, ~df.columns.str.startswith("Unnamed")]
    label_col = "prognosis"
    symptom_cols = [c for c in df.columns if c != label_col]
    rows = []
    for _, row in df.iterrows():
        disease = normalize_disease(str(row[label_col]))
        if disease in EXCLUDED_DISEASES:
            continue
        symptoms = [normalize_symptom(c) for c in symptom_cols if row[c] == 1]
        if len(symptoms) >= 3:
            rows.append({"PATHOLOGY": disease, "SYMPTOMS_LIST": ",".join(symptoms), "SOURCE": "kaggle"})
    result = pd.DataFrame(rows)
    logger.info(f"Kaggle: {len(result)} rows, {result['PATHOLOGY'].nunique()} diseases")
    return result


def parse_symptom_list(text):
    if not isinstance(text, str):
        return []
    parts = [normalize_symptom(p.strip()) for p in text.split(",") if p.strip()]
    return [s for s in parts if len(s) >= 3]


def generate_cases(disease, symptoms, n_cases):
    if len(symptoms) < 3:
        return []
    core = symptoms[:max(2, len(symptoms) // 3)]
    variable = symptoms[len(core):]
    cases = []
    for _ in range(n_cases):
        selected = list(core)
        if variable:
            k = random.randint(max(1, len(variable) // 2), len(variable))
            selected += random.sample(variable, min(k, len(variable)))
        selected = list(dict.fromkeys(selected))
        random.shuffle(selected)
        if len(selected) >= 3:
            cases.append({"PATHOLOGY": normalize_disease(disease),
                          "SYMPTOMS_LIST": ",".join(selected), "SOURCE": "quyen"})
    return cases


def load_quyen(path, base_cases=100):
    logger.info("Loading QuyenAnhDE dataset...")
    df = pd.read_csv(path)
    all_rows = []
    excluded = skipped = 0
    for _, row in df.iterrows():
        disease = str(row.get("Name", "")).strip()
        symptom_text = str(row.get("Symptoms", "")).strip()
        if not disease or disease == "nan":
            skipped += 1
            continue
        disease_norm = normalize_disease(disease)
        if disease_norm in EXCLUDED_DISEASES:
            excluded += 1
            continue
        symptoms = parse_symptom_list(symptom_text)
        if len(symptoms) < 3:
            skipped += 1
            continue
        multiplier = DISEASE_MULTIPLIER.get(disease_norm, 1.0)
        n = max(20, int(base_cases * multiplier))
        all_rows.extend(generate_cases(disease, symptoms, n))
    result = pd.DataFrame(all_rows)
    logger.info(f"QuyenAnhDE: {len(result)} rows, {result['PATHOLOGY'].nunique()} diseases")
    logger.info(f"  Excluded: {excluded}, Skipped: {skipped}")
    return result


def merge_and_balance(kaggle_df, quyen_df, target=200, cap=600):
    combined = pd.concat([kaggle_df, quyen_df], ignore_index=True)
    combined = combined.dropna(subset=["PATHOLOGY", "SYMPTOMS_LIST"])
    combined = combined[combined["SYMPTOMS_LIST"].str.len() > 0]
    logger.info(f"Combined: {len(combined)} rows, {combined['PATHOLOGY'].nunique()} diseases")

    parts = []
    for disease, group in combined.groupby("PATHOLOGY"):
        n = len(group)
        disease_norm = normalize_disease(str(disease))
        is_boosted = DISEASE_MULTIPLIER.get(disease_norm, 1.0) > 1.0
        max_cap = cap if is_boosted else target * 3
        if n >= target:
            sampled = group.sample(min(n, max_cap), random_state=42)
        else:
            extra = group.sample(target - n, replace=True, random_state=42)
            sampled = pd.concat([group, extra], ignore_index=True)
        parts.append(sampled)

    result = pd.concat(parts, ignore_index=True).sample(frac=1, random_state=42).reset_index(drop=True)
    counts = result["PATHOLOGY"].value_counts()
    logger.info(f"After balancing: {len(result)} rows, {result['PATHOLOGY'].nunique()} diseases")
    logger.info(f"Cases/disease — min:{counts.min()} max:{counts.max()} mean:{counts.mean():.0f}")
    logger.info("Top 10 diseases:")
    for d, c in counts.head(10).items():
        logger.info(f"  {d:45s} {c}")
    return result


def main():
    logger.info("=" * 60)
    logger.info("MEDERA — EXTENDED DATASET BUILDER v2")
    logger.info("=" * 60)
    kaggle_path = os.path.join(DATA_DIR, "kaggle_training.csv")
    quyen_path = os.path.join(DATA_DIR, "quyen_diseases_symptoms.csv")
    for p in [kaggle_path, quyen_path]:
        if not os.path.exists(p):
            raise FileNotFoundError(f"Missing: {p}")

    kaggle_df = load_kaggle(kaggle_path)
    quyen_df = load_quyen(quyen_path, base_cases=100)
    merged = merge_and_balance(kaggle_df, quyen_df)

    all_symptoms = set()
    for sl in merged["SYMPTOMS_LIST"]:
        all_symptoms.update(s.strip() for s in str(sl).split(",") if s.strip())
    with open(os.path.join(DATA_DIR, "extended_vocabulary.json"), "w") as f:
        json.dump(sorted(all_symptoms), f, indent=2)

    merged.to_csv(OUT_PATH, index=False)
    logger.info(f"Saved: {OUT_PATH} ({os.path.getsize(OUT_PATH)/1024/1024:.1f} MB)")
    logger.info(f"Total cases: {len(merged):,} | Diseases: {merged['PATHOLOGY'].nunique()} | Symptoms: {len(all_symptoms)}")


if __name__ == "__main__":
    main()
