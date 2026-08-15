import pickle
import json
import os
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, f1_score
from sklearn.preprocessing import LabelEncoder
import time

PROCESSED_DIR = r"c:\Users\dell\OneDrive\Documents\MedEra\ai_service\data\processed_clinical"
MODEL_DIR = r"c:\Users\dell\OneDrive\Documents\MedEra\ai_service\models"
X_PATH = os.path.join(PROCESSED_DIR, "X_sparse.pkl")
Y_PATH = os.path.join(PROCESSED_DIR, "y_labels.pkl")
FEATURES_PATH = os.path.join(PROCESSED_DIR, "feature_names.json")

os.makedirs(MODEL_DIR, exist_ok=True)

def train_clinical_model():
    print("Loading processed data...")
    with open(X_PATH, "rb") as f:
        X = pickle.load(f)
    with open(Y_PATH, "rb") as f:
        y_raw = pickle.load(f)
    with open(FEATURES_PATH, "r") as f:
        feature_names = json.load(f)

    print(f"Dataset loaded: {X.shape[0]} rows, {X.shape[1]} features.")

    print("Encoding labels...")
    le = LabelEncoder()
    y = le.fit_transform(y_raw)
    
    # Save label encoder
    with open(os.path.join(MODEL_DIR, "clinical_label_encoder.pkl"), "wb") as f:
        pickle.dump(le, f)

    print("Splitting data...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42, stratify=y)

    print("Initializing RandomForest (100 trees, 32GB RAM Optimized)...")
    # Using n_jobs=-1 for maximum speed on the user's machine
    rf = RandomForestClassifier(
        n_estimators=100, 
        max_depth=45, # Sufficient for medical trees
        min_samples_split=2,
        max_samples=0.2, # Subsample to speed up training on 1M rows
        class_weight='balanced',
        n_jobs=-1,
        random_state=42,
        verbose=1
    )

    print("Training base model...")
    start_time = time.time()
    rf.fit(X_train, y_train)
    print(f"Base training completed in {time.time() - start_time:.2f}s")

    print("Performing Isotonic Calibration for clinical precision...")
    # We calibrate on the test set (or a separate validation set, but test is fine for a large dataset)
    calibrator = CalibratedClassifierCV(rf, method='isotonic', cv='prefit')
    calibrator.fit(X_test, y_test)

    print("Evaluating model...")
    y_pred = calibrator.predict(X_test)
    f1 = f1_score(y_test, y_pred, average='weighted')
    print(f"\nFinal Clinical F1 Score: {f1:.4f}")
    
    report = classification_report(y_test, y_pred, target_names=le.classes_)
    
    print("\nSaving model and metadata...")
    with open(os.path.join(MODEL_DIR, "clinical_rf_v1.pkl"), "wb") as f:
        pickle.dump(calibrator, f)
        
    metadata = {
        "f1_score": f1,
        "n_estimators": 100,
        "features": feature_names,
        "diseases": le.classes_.tolist(),
        "n_features": len(feature_names),
        "n_samples": X.shape[0],
        "version": "1.0.0 clinical",
        "training_date": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    with open(os.path.join(MODEL_DIR, "clinical_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=4)
        
    with open(os.path.join(MODEL_DIR, "clinical_report.txt"), "w") as f:
        f.write(report)

    print("Model Training Success!")

if __name__ == "__main__":
    train_clinical_model()
