import joblib
import os

def check_translations():
    model_path = r"c:\Users\dell\OneDrive\Documents\MedEra\ai_service\models\symptom_classifier.joblib"
    if not os.path.exists(model_path):
        print("Model not found.")
        return
    
    payload = joblib.load(model_path)
    diseases = payload.get("diseases", [])
    names_fr = payload.get("names_fr", {})
    
    missing = [d for d in diseases if d not in names_fr or names_fr[d] == d]
    
    print(f"Total diseases: {len(diseases)}")
    print(f"Translated: {len(names_fr)}")
    print(f"Missing or Identical: {len(missing)}")
    
    if missing:
        print("\nSample missing translations:")
        for m in missing[:20]:
            print(f"- {m}")

if __name__ == "__main__":
    check_translations()
