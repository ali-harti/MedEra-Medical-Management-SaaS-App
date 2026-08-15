import joblib
import json
import pandas as pd
import matplotlib.pyplot as plt
import os

def audit_features():
    models_dir = r"c:\Users\dell\OneDrive\Documents\MedEra\ai_service\models"
    metadata_path = os.path.join(models_dir, "clinical_metadata.json")
    model_path = os.path.join(models_dir, "clinical_rf_v1.pkl")
    
    print("Loading clinical metadata...")
    with open(metadata_path, 'r') as f:
        metadata = json.load(f)
    
    feature_names = metadata["features"]
    
    print("Loading clinical model (this may take a moment)...")
    with open(model_path, 'rb') as f:
        calibrator = joblib.load(f)
    
    # Access the base estimator (RandomForest)
    # For CalibratedClassifierCV, we check the first fold's estimator if cv was used, 
    # or the single estimator if it was pre-fitted.
    if hasattr(calibrator, "calibrated_classifiers_"):
        rf = calibrator.calibrated_classifiers_[0].estimator
    else:
        rf = calibrator.estimator
    
    # Extract importances
    importances = rf.feature_importances_
    
    # Create DataFrame
    feat_imp = pd.DataFrame({
        'feature': feature_names,
        'importance': importances
    }).sort_values(by='importance', ascending=False)
    
    print("\nTop 20 Clinical Features (DDXPlus Engine):")
    print(feat_imp.head(20).to_string(index=False))
    
    # Save to CSV for reference
    feat_imp.to_csv(os.path.join(models_dir, "clinical_feature_importances.csv"), index=False)
    
    # Generate a report snippet
    report = ["# Clinical Engine Feature Audit", "## Top 10 Diagnostic Drivers", ""]
    for i, row in feat_imp.head(10).iterrows():
        report.append(f"{i+1}. **{row['feature']}**: {row['importance']:.4f}")
    
    with open(os.path.join(models_dir, "clinical_audit_summary.txt"), 'w') as f:
        f.write("\n".join(report))
    
    print(f"\nAudit complete. Summary saved to models/clinical_audit_summary.txt")

if __name__ == "__main__":
    audit_features()
