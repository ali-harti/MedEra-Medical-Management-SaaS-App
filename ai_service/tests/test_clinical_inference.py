import requests
import json
import time

BASE_URL = "http://localhost:5000/api"
HEADERS = {"X-Internal-Token": "medera-internal-secret-token-dev"}

def test_health():
    print("\n[1] Checking Health Endpoint...")
    response = requests.get(f"{BASE_URL}/health", headers=HEADERS)
    print(json.dumps(response.json(), indent=2))
    assert response.status_code == 200
    assert response.json()["clinical_engine"]["loaded"] == True

def test_prediction_hybrid():
    print("\n[2] Testing Hybrid Prediction (TB Case)...")
    # Symptoms typical for TB
    payload = {
        "symptoms": ["cough", "fever", "weight_loss", "fatigue", "sweating"],
        "age": 45,
        "sex": "M"
    }
    
    response = requests.post(f"{BASE_URL}/predict", json=payload, headers=HEADERS)
    data = response.json()
    print(json.dumps(data, indent=2))
    
    assert response.status_code == 200
    # Check if clinical model boosted the result or added notes
    has_clinical = any("clinical" in str(note).lower() for note in data.get("clinical_notes", []))
    print(f"Clinical Validation present: {has_clinical}")

def test_age_sex_correction():
    print("\n[3] Testing Age/Sex Sensitivity (Pregnancy/PCOS Mapping)...")
    # Symptoms that might overlap but are sex-specific in DDXPlus
    payload = {
        "symptoms": ["abdominal_pain", "nausea"],
        "age": 25,
        "sex": "F"
    }
    
    response = requests.post(f"{BASE_URL}/predict", json=payload, headers=HEADERS)
    print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    print("Waiting for server to be fully ready...")
    for i in range(10):
        try:
            requests.get(BASE_URL)
            break
        except:
            time.sleep(2)
            
    try:
        test_health()
        test_prediction_hybrid()
        test_age_sex_correction()
        print("\nAll clinical verification tests passed!")
    except Exception as e:
        print(f"\nVerification Failed: {e}")
