import requests
import json
import os

token = "medera-internal-secret-token-dev"
url = "http://localhost:5000/api/predict"

cases = [
    ("01: TB classic", {"symptoms":["cough","night_sweats","weight_loss","fatigue","coughing_blood","fever"],"lang":"en"}),
    ("03: Typhoid fever", {"symptoms":["fever","headache","abdominal_pain","constipation","fatigue","loss_of_appetite"],"lang":"en"}),
    ("06: Acute MI", {"symptoms":["chest_pain","shortness_of_breath","sweating","palpitations","dizziness","nausea"],"lang":"en"}),
    ("08: Hypertension", {"symptoms":["headache","dizziness","hypertension","blurred_vision","palpitations"],"lang":"en"}),
    ("09: URTI common cold", {"symptoms":["runny_nose","sore_throat","cough","fever","fatigue","nasal_congestion"],"lang":"en"}),
    ("12: Peptic ulcer", {"symptoms":["abdominal_pain","heartburn","nausea","loss_of_appetite","black_stools"],"lang":"en"}),
    ("15: FR Gastro", {"symptoms":["diarrhee","nausee","vomissement","douleur_abdominale","fièvre"],"lang":"fr"}),
    ("17: Ambiguous", {"symptoms":["fatigue","weight_loss","fever"],"lang":"en"}),
]

for label, payload in cases:
    print(f"\n=== {label} ===")
    try:
        r = requests.post(url, json=payload, headers={"X-Internal-Token": token}, timeout=10)
        print(json.dumps(r.json(), indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Error: {e}")
