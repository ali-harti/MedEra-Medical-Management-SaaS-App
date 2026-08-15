import requests
import json

BASE_URL = "http://localhost:5000/api"
HEADERS = {"X-Internal-Token": "medera-internal-secret-token-dev"}

def test_french_parity():
    print("\nTesting French Parity for Broad-Spectrum Diseases...")
    # Test a few known diseases that were previously untranslated
    cases = [
        {"symptoms": ["abdominal_pain", "nausea"], "name": "Abdominal Injury"},
        {"symptoms": ["vomiting", "headache"], "name": "Acute Pancreatitis"},
    ]
    
    for case in cases:
        payload = {
            "symptoms": case["symptoms"],
            "lang": "fr",
            "age": 30,
            "sex": "M"
        }
        response = requests.post(f"{BASE_URL}/predict", json=payload, headers=HEADERS)
        data = response.json()
        
        print(f"\nRequest Symptoms: {case['symptoms']}")
        for p in data.get("predictions", []):
            print(f" - {p['disease']} -> FR: {p['name_fr']}")

if __name__ == "__main__":
    test_french_parity()
