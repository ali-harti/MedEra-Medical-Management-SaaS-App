import joblib
import json
import os

def extract_diseases():
    model_path = r"c:\Users\dell\OneDrive\Documents\MedEra\ai_service\models\symptom_classifier.joblib"
    if not os.path.exists(model_path):
        print("Model not found.")
        return
    
    # Load with mmap_mode to save memory
    payload = joblib.load(model_path, mmap_mode='r')
    diseases = payload.get("diseases", [])
    names_fr = payload.get("names_fr", {})
    
    # Output to a json for me to read
    result = {
        "diseases": diseases,
        "existing_names_fr": names_fr
    }
    
    with open("temp_diseases.json", "w") as f:
        json.dump(result, f, indent=4)
    
    print(f"Extracted {len(diseases)} diseases.")

if __name__ == "__main__":
    extract_diseases()
