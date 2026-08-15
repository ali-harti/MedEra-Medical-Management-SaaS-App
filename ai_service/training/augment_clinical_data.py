import pandas as pd
import numpy as np
import os

def augment_clinical_data():
    input_path = r"c:\Users\dell\OneDrive\Documents\MedEra\ai_service\data\extended_patients.csv"
    output_path = r"c:\Users\dell\OneDrive\Documents\MedEra\ai_service\data\clinical_augmented_dataset.csv"
    
    print(f"Loading base dataset from {input_path}...")
    df = pd.read_csv(input_path)
    
    # Check columns
    if "PATHOLOGY" in df.columns:
        disease_col = "PATHOLOGY"
    else:
        disease_col = "Name"
    
    # 1. Add Demographics
    # Default values
    df['age'] = np.random.randint(18, 75, size=len(df))
    df['sex'] = np.random.choice(['M', 'F'], size=len(df))
    
    # 2. Add Context Features (Initialize with zeros)
    context_features = [
        'history_diabetes', 'history_hypertension', 'history_heart_disease',
        'history_asthma_copd', 'history_cancer', 'history_smoking',
        'travel_tropical', 'travel_high_risk', 'exposure_sick_contact',
        'exposure_animals', 'alcohol_consumption', 'recent_surgery',
        'pregnancy', 'high_stress'
    ]
    for feat in context_features:
        df[feat] = 0
    
    # 3. Inject Medical Logic (Contextual Priors)
    print("Applying medical logic for augmentation...")
    
    # Heart Attack / Hypertension logic
    cardiac_diseases = ['Heart attack', 'Hypertension', 'Stroke', 'Myocardial Infarction']
    mask = df[disease_col].isin(cardiac_diseases)
    df.loc[mask, 'age'] = np.random.randint(45, 90, size=mask.sum())
    df.loc[mask, 'history_hypertension'] = np.random.choice([0, 1], size=mask.sum(), p=[0.2, 0.8])
    df.loc[mask, 'history_smoking'] = np.random.choice([0, 1], size=mask.sum(), p=[0.4, 0.6])
    
    # Tropical diseases logic (Malaria, Dengue)
    tropical_diseases = ['Malaria', 'Dengue', 'Zika', 'Chikungunya']
    mask = df[disease_col].isin(tropical_diseases)
    df.loc[mask, 'travel_tropical'] = np.random.choice([0, 1], size=mask.sum(), p=[0.1, 0.9])
    
    # Influenza Fix: Differentiate from Malaria
    # Influenza has sick contact, NO travel tropical, and specific symptoms
    mask = df[disease_col] == 'Influenza'
    df.loc[mask, 'travel_tropical'] = 0
    df.loc[mask, 'exposure_sick_contact'] = np.random.choice([0, 1], size=mask.sum(), p=[0.2, 0.8])
    # Inject specific symptoms to SYMPTOMS_LIST if missing
    for idx in df[mask].index:
        current = str(df.at[idx, 'SYMPTOMS_LIST'])
        added = []
        if 'cough' not in current: added.append('cough')
        if 'muscle_pain' not in current: added.append('muscle_pain')
        if 'sore_throat' not in current: added.append('sore_throat')
        if added:
            df.at[idx, 'SYMPTOMS_LIST'] = current + "," + ",".join(added)

    # Typhoid Fix: Specific markers
    mask = df[disease_col].isin(['Typhoid', 'Typhoid Fever'])
    df.loc[mask, 'travel_high_risk'] = np.random.choice([0, 1], size=mask.sum(), p=[0.3, 0.7])
    for idx in df[mask].index:
        current = str(df.at[idx, 'SYMPTOMS_LIST'])
        added = []
        # specific markers: stepladder fever (fièvre en plateau), rose spots, constipation, splenomegaly
        if 'fever' not in current: added.append('fever')
        added.append('stepladder_fever')
        added.append('rose_spots')
        if 'constipation' not in current: added.append('constipation')
        if 'splenomegaly' not in current: added.append('splenomegaly')
        df.at[idx, 'SYMPTOMS_LIST'] = current + "," + ",".join(added)
    
    # Respiratory diseases logic
    resp_diseases = ['Tuberculosis', 'Pneumonia', 'Bronchial Asthma', 'COPD']
    mask = df[disease_col].isin(resp_diseases)
    df.loc[mask, 'history_smoking'] = np.random.choice([0, 1], size=mask.sum(), p=[0.3, 0.7])
    df.loc[mask, 'exposure_sick_contact'] = np.random.choice([0, 1], size=mask.sum(), p=[0.6, 0.4])
    
    # Diabetes logic
    mask = df[disease_col] == 'Diabetes'
    df.loc[mask, 'age'] = np.random.randint(30, 80, size=mask.sum())
    df.loc[mask, 'history_diabetes'] = 1
    
    # Pregnancy logic
    pregnancy_diseases = ['Hyperemesis Gravidarum', 'Preeclampsia', 'Eclampsia']
    mask = df[disease_col].isin(pregnancy_diseases)
    df.loc[mask, 'sex'] = 'F'
    df.loc[mask, 'pregnancy'] = 1
    df.loc[mask, 'age'] = np.random.randint(18, 45, size=mask.sum())
    
    # Alcohol logic
    liver_diseases = ['Alcoholic hepatitis', 'Cirrhosis of liver', 'Fatty liver disease']
    mask = df[disease_col].isin(liver_diseases)
    df.loc[mask, 'alcohol_consumption'] = np.random.choice([0, 1], size=mask.sum(), p=[0.1, 0.9])
    
    # Stress logic
    anxiety_diseases = ['Panic disorder', 'Generalized anxiety disorder', 'Depression']
    mask = df[disease_col].isin(anxiety_diseases)
    df.loc[mask, 'high_stress'] = np.random.choice([0, 1], size=mask.sum(), p=[0.2, 0.8])
    
    # 4. Save Augmented Dataset
    print(f"Saving augmented dataset to {output_path}...")
    df.to_csv(output_path, index=False)
    print(f"Augmentation complete. Total samples: {len(df)}")
    print(f"New features added: {['age', 'sex'] + context_features}")

if __name__ == "__main__":
    augment_clinical_data()
