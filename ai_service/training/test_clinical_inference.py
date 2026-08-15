import requests
import json

# Configuration
URL = "http://localhost:5000/predict"
TOKEN = "medera-internal-secret-token-dev"

def test_case(name, symptoms, age=30, sex="M"):
    print(f"\n--- Testing Case: {name} ---")
    payload = {
        "symptoms": symptoms,
        "age": age,
        "sex": sex,
        "lang": "en"
    }
    headers = {
        "X-Internal-Token": TOKEN,
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(URL, json=payload, headers=headers)
        if response.status_code == 200:
            result = response.json()
            print(f"Predictions: {len(result['predictions'])}")
            for i, p in enumerate(result['predictions'][:3]):
                note = f" [{p.get('clinical_note')}]" if p.get('clinical_note') else ""
                print(f"{i+1}. {p['disease']} ({p['confidence']*100:.1f}%){note}")
            
            if result.get("clinical_note"):
                print(f"Top Note: {result['clinical_note']}")
        else:
            print(f"Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    # Test cases designed to trigger clinical model boosts
    test_case("Classic Pneumonia", ["fever", "cough", "shortness_of_breath"], age=45, sex="M")
    test_case("Chest Pain / Cardiac", ["chest_pain", "shortness_of_breath", "sweating"], age=65, sex="M")
    test_case("Geriatric Fatigue", ["fatigue", "loss_of_appetite", "weight_loss"], age=82, sex="F")
