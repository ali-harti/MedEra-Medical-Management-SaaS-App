import pandas as pd
import json
import os
import ast
import numpy as np
from tqdm import tqdm
from scipy.sparse import lil_matrix
import pickle

DATA_DIR = r"c:\Users\dell\OneDrive\Documents\MedEra\ai_service\data"
TRAIN_FILE = os.path.join(DATA_DIR, "release_train_patients.csv")
EVIDENCES_FILE = os.path.join(DATA_DIR, "release_evidences.json")
OUTPUT_FOLDER = os.path.join(DATA_DIR, "processed_clinical")

os.makedirs(OUTPUT_FOLDER, exist_ok=True)

def preprocess():
    print("Loading mappings...")
    with open(EVIDENCES_FILE, 'r', encoding='utf-8') as f:
        evidences_map = json.load(f)
    
    def get_semantic_name(ev_code):
        if "_@_" in ev_code:
            code, val = ev_code.split("_@_")
            info = evidences_map.get(code)
            if not info: return ev_code
            if info['data_type'] == 'M':
                val_meaning = info['value_meaning'].get(val, {}).get('en', val)
                return f"{code}_{val_meaning.replace(' ', '_').lower()}"
            else:
                return f"{code}_val_{val}"
        else:
            info = evidences_map.get(ev_code)
            if not info: return ev_code
            name = info['question_en'].replace('?', '').replace('Do you have ', '').replace(' ', '_').lower()
            return f"{ev_code}_{name[:30]}"

    print("Step 1: First pass to identify all unique features...")
    df_iter = pd.read_csv(TRAIN_FILE, chunksize=100000)
    all_features = set()
    all_pathologies = set()
    
    for chunk in tqdm(df_iter, desc="Scanning for features"):
        for evs_str in chunk['EVIDENCES']:
            evs = ast.literal_eval(evs_str)
            for e in evs:
                all_features.add(get_semantic_name(e))
        for path in chunk['PATHOLOGY']:
            all_pathologies.add(path)

    feature_list = sorted(list(all_features))
    pathology_list = sorted(list(all_pathologies))
    feature_to_idx = {feat: i for i, feat in enumerate(feature_list)}
    
    print(f"Total features: {len(feature_list)}")
    print(f"Total diseases: {len(pathology_list)}")

    print("Step 2: Second pass to build sparse matrix...")
    df_iter = pd.read_csv(TRAIN_FILE, chunksize=50000)
    
    total_rows = 1025602 # Approximate
    X_sparse = lil_matrix((total_rows, len(feature_list) + 2), dtype=np.int8)
    y = []
    
    current_row = 0
    for chunk in tqdm(df_iter, desc="Building matrix"):
        for _, row in chunk.iterrows():
            # Basic features
            X_sparse[current_row, 0] = row['AGE']
            X_sparse[current_row, 1] = 1 if row['SEX'] == 'M' else 0
            
            # Evidence features
            evs = ast.literal_eval(row['EVIDENCES'])
            for e in evs:
                semantic = get_semantic_name(e)
                if semantic in feature_to_idx:
                    X_sparse[current_row, feature_to_idx[semantic] + 2] = 1
            
            y.append(row['PATHOLOGY'])
            current_row += 1

    print("Saving artifacts...")
    # Trim sparse matrix if we overestimated rows
    X_sparse = X_sparse[:current_row, :]
    
    with open(os.path.join(OUTPUT_FOLDER, "X_sparse.pkl"), "wb") as f:
        pickle.dump(X_sparse.tocsr(), f)
    
    with open(os.path.join(OUTPUT_FOLDER, "y_labels.pkl"), "wb") as f:
        pickle.dump(y, f)
        
    with open(os.path.join(OUTPUT_FOLDER, "feature_names.json"), "w") as f:
        json.dump(["age", "sex"] + feature_list, f)
        
    with open(os.path.join(OUTPUT_FOLDER, "disease_labels.json"), "w") as f:
        json.dump(pathology_list, f)

    print("Done!")

if __name__ == "__main__":
    preprocess()
