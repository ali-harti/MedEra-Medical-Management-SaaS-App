import json
import os
import re

# Comprehensive medical translation map
MED_MAP = {
    "Hemorrhage": "Hémorragie",
    "Hydrocephalus": "Hydrocéphalie",
    "Brain": "Cerveau",
    "Subdural": "Sous-dural",
    "Cerebral": "Cérébral",
    "Malignant": "Malin / Maligne",
    "Benign": "Bénin",
    "Obstruction": "Obstruction",
    "Intestinal": "Intestinal",
    "Gastric": "Gastrique",
    "Abdominal": "Abdominal",
    "Abscess": "Abcès",
    "Injury": "Lésion / Traumatisme",
    "Vertigo": "Vertige",
    "Nose": "Nez",
    "Lung": "Poumon",
    "Carcinoma": "Carcinome",
    "Acne": "Acné",
    "Acinic Cell": "Cellules acineuses",
    "Acute": "Aigu",
    "Chronic": "Chronique",
    "Inflammation": "Inflammation",
    "Infection": "Infection",
    "Allergy": "Allergie",
    "Anemia": "Anémie",
    "Arthritis": "Arthrite",
    "Asthma": "Asthme",
    "Bacterial": "Bactérien",
    "Bronchitis": "Bronchite",
    "Cancer": "Cancer",
    "Cardiac": "Cardiaque",
    "Cerebral": "Cérébral",
    "Colitis": "Colite",
    "Cough": "Toux",
    "Cyst": "Kyste",
    "Dermatitis": "Dermatite",
    "Diabetes": "Diabète",
    "Disease": "Maladie",
    "Disorder": "Trouble",
    "Ear": "Oreille",
    "Edema": "Oedème",
    "Embolism": "Embolie",
    "Epilepsy": "Épilepsie",
    "Fever": "Fièvre",
    "Fracture": "Fracture",
    "Gastritis": "Gastrite",
    "Glaucoma": "Glaucome",
    "Heart": "Coeur",
    "Hepatitis": "Hépatite",
    "Hernia": "Hernie",
    "Hypertension": "Hypertension",
    "Influenza": "Grippe",
    "Jaundice": "Jaunisse",
    "Kidney": "Rein",
    "Laryngitis": "Laryngite",
    "Leukemia": "Leucémie",
    "Liver": "Foie",
    "Malaria": "Paludisme",
    "Measles": "Rougeole",
    "Meningitis": "Méningite",
    "Migraine": "Migraine",
    "Myocardial": "Myocardique",
    "Infarction": "Infarctus",
    "Nausea": "Nausée",
    "Neoplasm": "Néoplasme",
    "Nerve": "Nerf",
    "Obesity": "Obésité",
    "Osteoarthritis": "Arthrose",
    "Pain": "Douleur",
    "Palsy": "Paralysie",
    "Pancreatitis": "Pancréatite",
    "Paralysis": "Paralysie",
    "Pneumonia": "Pneumonie",
    "Poisoning": "Empoisonnement",
    "Pregnancy": "Grossesse",
    "Psoriasis": "Psoriasis",
    "Reflux": "Reflux",
    "Renal": "Rénal",
    "Respiratory": "Respiratoire",
    "Sclerosis": "Sclérose",
    "Seizure": "Crise d'épilepsie",
    "Sinusitis": "Sinusite",
    "Skin": "Peau",
    "Stroke": "AVC",
    "Syndrome": "Syndrome",
    "Tachycardia": "Tachycardie",
    "Tetanus": "Tétanos",
    "Thyroid": "Thyroïde",
    "Tonsillitis": "Amygdalite",
    "Trauma": "Traumatisme",
    "Tuberculosis": "Tuberculose",
    "Tumor": "Tumeur",
    "Ulcer": "Ulcère",
    "Urinary": "Urinaire",
    "Vascular": "Vasculaire",
    "Virus": "Virus",
    "Viral": "Viral",
    "Weakness": "Faiblesse",
    " Of The ": " du ",
    " Of ": " de ",
    " The ": " le ",
}

def translate_phrase(phrase):
    p = phrase
    special = {
        "Fungal infection": "Infection fongique",
        "Common Cold": "Rhume",
        "Drug Reaction": "Réaction médicamenteuse",
        "Peptic ulcer diseae": "Ulcère gastroduodénal",
        "AIDS": "SIDA",
        "GERD": "RGO",
        "Paroymsal Positional Vertigo": "Vertige positionnel paroxystique",
        "Hyperthyroidism": "Hyperthyroïdie",
        "Hypothyroidism": "Hypothyroïdie",
        "Varicose veins": "Varices",
        "Chicken pox": "Varicelle",
        "Allergic rhinitis": "Rhinite allergique",
    }
    if p in special: return special[p]
    
    sorted_keys = sorted(MED_MAP.keys(), key=len, reverse=True)
    for eng in sorted_keys:
        fra = MED_MAP[eng]
        p = re.sub(r'\b' + re.escape(eng) + r'\b', fra, p, flags=re.IGNORECASE)
    
    if "Aigu " in p: p = p.replace("Aigu ", "") + " Aigu(ë)"
    if "Chronique " in p: p = p.replace("Chronique ", "") + " Chronique"
    
    p = p.replace(" de du", " du")
    p = p.replace(" de le", " du")
    p = p.replace(" de Nez", " du nez")
    p = p.replace(" de Poumon", " du poumon")
    p = p.replace(" de Foie", " du foie")
    p = p.replace(" du Cerveau", " cérébral(e)")
    
    return p.strip()

def finalize_translations():
    diseases_path = r"c:\Users\dell\OneDrive\Documents\MedEra\ai_service\models\diseases_list.json"
    if not os.path.exists(diseases_path): return
    with open(diseases_path, 'r', encoding='utf-8', errors='replace') as f:
        data = json.load(f)
    names_fr = {}
    for item in data:
        name_en = item.get("name")
        names_fr[name_en] = translate_phrase(name_en)
    mapping_path = r"c:\Users\dell\OneDrive\Documents\MedEra\ai_service\models\names_fr.json"
    with open(mapping_path, 'w', encoding='utf-8') as f:
        json.dump(names_fr, f, indent=4, ensure_ascii=False)
    print(f"Finalized mapping for {len(names_fr)} diseases.")

if __name__ == "__main__":
    finalize_translations()
