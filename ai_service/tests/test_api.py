"""
MedEra AI Service — Pytest Test Suite
Covers: health, predict (EN/FR), edge cases, auth, symptoms, diseases
Run: pytest tests/ -v --tb=short
"""

import pytest
import json
import os
import sys

# Make sure app is importable from tests/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("AI_INTERNAL_TOKEN", "medera-internal-secret-token-dev")

from app import create_app
from app.model import model_service


TOKEN = "medera-internal-secret-token-dev"
AUTH = {"X-Internal-Token": TOKEN}
WRONG_AUTH = {"X-Internal-Token": "wrong-token"}
JSON_CT = {"Content-Type": "application/json"}


# ---------------------------------------------------------------------------
# FIXTURES
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def app():
    app = create_app()
    app.config["TESTING"] = True
    with app.app_context():
        if not model_service.is_loaded:
            model_service.load()
    return app


@pytest.fixture(scope="session")
def client(app):
    return app.test_client()


def post_predict(client, body: dict, headers: dict = None):
    h = {**AUTH, **JSON_CT}
    if headers:
        h.update(headers)
    return client.post(
        "/api/predict",
        data=json.dumps(body),
        headers=h,
    )


# ---------------------------------------------------------------------------
# HEALTH ENDPOINT
# ---------------------------------------------------------------------------

class TestHealth:
    def test_health_200(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200

    def test_health_status_ok(self, client):
        data = r = client.get("/api/health").get_json()
        assert data["status"] == "ok"

    def test_health_model_loaded(self, client):
        data = client.get("/api/health").get_json()
        assert data["model_loaded"] is True

    def test_health_has_version(self, client):
        data = client.get("/api/health").get_json()
        assert "version" in data
        assert data["version"] == "4.0.0"

    def test_health_n_symptoms(self, client):
        data = client.get("/api/health").get_json()
        assert data["n_symptoms"] > 0

    def test_health_n_diseases(self, client):
        data = client.get("/api/health").get_json()
        assert data["n_diseases"] == 351

    def test_health_f1_score(self, client):
        data = client.get("/api/health").get_json()
        # Optimized RF on 351-class dataset achieves ~0.98 F1
        assert data["f1_score"] >= 0.85

    def test_health_cv_metrics(self, client):
        data = client.get("/api/health").get_json()
        assert "cv_mean" in data
        # CV on 30k stratified subset with 100-tree RF; consistent with test F1
        assert data["cv_mean"] >= 0.70

    def test_health_no_auth_required(self, client):
        # health endpoint is public
        r = client.get("/api/health")
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# AUTH
# ---------------------------------------------------------------------------

class TestAuth:
    def test_predict_no_token_401(self, client):
        r = client.post(
            "/api/predict",
            data=json.dumps({"symptoms": ["fever"]}),
            headers=JSON_CT,
        )
        assert r.status_code == 401

    def test_predict_wrong_token_401(self, client):
        r = post_predict(client, {"symptoms": ["fever"]}, headers=WRONG_AUTH)
        assert r.status_code == 401

    def test_symptoms_no_token_401(self, client):
        r = client.get("/api/symptoms")
        assert r.status_code == 401

    def test_diseases_no_token_401(self, client):
        r = client.get("/api/diseases")
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# PREDICT — ENGLISH
# ---------------------------------------------------------------------------

class TestPredictEnglish:
    def test_basic_200(self, client):
        r = post_predict(client, {"symptoms": ["fever", "cough"]})
        assert r.status_code == 200

    def test_returns_predictions_list(self, client):
        data = post_predict(
            client, {"symptoms": ["fever", "cough", "difficulty_breathing"]}
        ).get_json()
        assert isinstance(data["predictions"], list)

    def test_predictions_not_empty(self, client):
        data = post_predict(
            client, {"symptoms": ["fever", "cough", "difficulty_breathing"]}
        ).get_json()
        assert len(data["predictions"]) > 0

    def test_prediction_fields(self, client):
        data = post_predict(
            client, {"symptoms": ["fever", "cough"]}
        ).get_json()
        if data["predictions"]:
            p = data["predictions"][0]
            assert "disease" in p
            assert "name_en" in p
            assert "name_fr" in p
            assert "confidence" in p
            assert "icd10" in p
            assert "severity" in p

    def test_confidence_range(self, client):
        data = post_predict(
            client, {"symptoms": ["fever", "cough", "difficulty_breathing"]}
        ).get_json()
        for p in data["predictions"]:
            assert 0.0 <= p["confidence"] <= 1.0

    def test_predictions_sorted_by_confidence(self, client):
        data = post_predict(
            client, {"symptoms": ["fever", "cough", "difficulty_breathing"]}
        ).get_json()
        confs = [p["confidence"] for p in data["predictions"]]
        assert confs == sorted(confs, reverse=True)

    def test_coverage_field(self, client):
        data = post_predict(
            client, {"symptoms": ["fever", "cough"]}
        ).get_json()
        assert "coverage" in data
        cov = data["coverage"]
        assert "submitted" in cov
        assert "recognized" in cov
        assert "ratio" in cov

    def test_known_symptoms_populated(self, client):
        data = post_predict(
            client, {"symptoms": ["fever", "cough"]}
        ).get_json()
        assert len(data["known_symptoms"]) > 0

    def test_disclaimer_present(self, client):
        data = post_predict(
            client, {"symptoms": ["fever"]}
        ).get_json()
        assert "disclaimer" in data
        assert len(data["disclaimer"]) > 10

    def test_english_disclaimer_in_english(self, client):
        data = post_predict(
            client, {"symptoms": ["fever"], "lang": "en"}
        ).get_json()
        # English disclaimer should not start with French marker
        assert "Ces suggestions" not in data["disclaimer"]

    def test_symptom_deduplication(self, client):
        data = post_predict(
            client, {"symptoms": ["fever", "fever", "cough"]}
        ).get_json()
        assert data["coverage"]["submitted"] in (2, 3)  # either is acceptable
        known = data["known_symptoms"]
        assert len(known) == len(set(known))

    def test_icd10_format(self, client):
        data = post_predict(
            client, {"symptoms": ["fever", "cough", "difficulty_breathing"]}
        ).get_json()
        for p in data["predictions"]:
            if p["icd10"]:
                # ICD10 codes match pattern like J18, A15, etc.
                assert len(p["icd10"]) >= 2


# ---------------------------------------------------------------------------
# PREDICT — FRENCH
# ---------------------------------------------------------------------------

class TestPredictFrench:
    def test_french_input_200(self, client):
        r = post_predict(
            client, {"symptoms": ["fievre", "toux", "fatigue"], "lang": "fr"}
        )
        assert r.status_code == 200

    def test_french_returns_predictions(self, client):
        data = post_predict(
            client, {"symptoms": ["fievre", "toux", "fatigue", "frissons", "courbatures"], "lang": "fr"}
        ).get_json()
        assert len(data["predictions"]) > 0

    def test_french_disclaimer(self, client):
        data = post_predict(
            client, {"symptoms": ["fievre", "toux"], "lang": "fr"}
        ).get_json()
        assert "Ces suggestions" in data["disclaimer"]

    def test_french_disease_names(self, client):
        data = post_predict(
            client, {"symptoms": ["fievre", "toux", "fatigue"], "lang": "fr"}
        ).get_json()
        for p in data["predictions"]:
            assert p["name_fr"]  # FR name should be populated

    def test_french_mixed_with_english(self, client):
        # Mix of FR and EN terms should both resolve
        data = post_predict(
            client, {"symptoms": ["fievre", "cough", "fatigue"]}
        ).get_json()
        assert data["coverage"]["recognized"] >= 2

    def test_french_cardiac_cluster(self, client):
        data = post_predict(
            client,
            {"symptoms": ["douleur_thoracique", "palpitations", "essoufflement"],
             "lang": "fr"}
        ).get_json()
        assert len(data["predictions"]) > 0
        # Top result confidence should be meaningful
        assert data["predictions"][0]["confidence"] > 0.1


# ---------------------------------------------------------------------------
# PREDICT — EDGE CASES
# ---------------------------------------------------------------------------

class TestPredictEdgeCases:
    def test_unknown_symptom_degraded(self, client):
        data = post_predict(
            client, {"symptoms": ["xyz_completely_fake_symptom_999"]}
        ).get_json()
        assert data["degraded"] is True

    def test_unknown_symptom_in_unknown_list(self, client):
        data = post_predict(
            client, {"symptoms": ["xyz_completely_fake_symptom_999"]}
        ).get_json()
        assert "xyz_completely_fake_symptom_999" in data["unknown_symptoms"]

    def test_empty_symptoms_400(self, client):
        r = post_predict(client, {"symptoms": []})
        assert r.status_code == 400

    def test_missing_symptoms_key_400(self, client):
        r = post_predict(client, {})
        assert r.status_code == 400

    def test_single_symptom(self, client):
        r = post_predict(client, {"symptoms": ["fever"]})
        assert r.status_code == 200

    def test_coverage_zero_for_all_unknown(self, client):
        data = post_predict(
            client, {"symptoms": ["fake1", "fake2"]}
        ).get_json()
        assert data["coverage"]["ratio"] == 0.0

    def test_coverage_partial(self, client):
        data = post_predict(
            client, {"symptoms": ["fever", "fake_unknown_symptom"]}
        ).get_json()
        cov = data["coverage"]
        assert cov["recognized"] == 1
        assert 0.0 < cov["ratio"] < 1.0

    def test_invalid_json_400(self, client):
        r = client.post(
            "/api/predict",
            data="not json at all",
            headers={**AUTH, "Content-Type": "application/json"},
        )
        assert r.status_code == 400

    def test_large_symptom_list(self, client):
        # Should handle gracefully without crashing
        symptoms = ["fever", "cough", "fatigue", "nausea", "chills",
                    "sweating", "headache", "dizziness", "vomiting", "rash"]
        r = post_predict(client, {"symptoms": symptoms})
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# SYMPTOMS ENDPOINT
# ---------------------------------------------------------------------------

class TestSymptoms:
    def test_symptoms_200(self, client):
        r = client.get("/api/symptoms", headers=AUTH)
        assert r.status_code == 200

    def test_symptoms_count(self, client):
        data = client.get("/api/symptoms", headers=AUTH).get_json()
        assert data["count"] > 0
        assert data["count"] == len(data["symptoms"])

    def test_symptom_has_bilingual_fields(self, client):
        data = client.get("/api/symptoms", headers=AUTH).get_json()
        s = data["symptoms"][0]
        assert "value" in s
        assert "label_en" in s
        assert "label_fr" in s

    def test_autocomplete_filter(self, client):
        data = client.get(
            "/api/symptoms?q=fever", headers=AUTH
        ).get_json()
        assert data["count"] > 0
        for s in data["symptoms"]:
            assert (
                "fever" in s["value"].lower() or
                "fever" in s["label_en"].lower() or
                "fever" in s["label_fr"].lower()
            )

    def test_autocomplete_no_results_for_nonsense(self, client):
        data = client.get(
            "/api/symptoms?q=zzznomatch999", headers=AUTH
        ).get_json()
        assert data["count"] == 0

    def test_lang_param_accepted(self, client):
        r = client.get("/api/symptoms?lang=fr", headers=AUTH)
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# DISEASES ENDPOINT
# ---------------------------------------------------------------------------

class TestDiseases:
    def test_diseases_200(self, client):
        r = client.get("/api/diseases", headers=AUTH)
        assert r.status_code == 200

    def test_diseases_count(self, client):
        data = client.get("/api/diseases", headers=AUTH).get_json()
        assert data["count"] == 351

    def test_disease_fields(self, client):
        data = client.get("/api/diseases", headers=AUTH).get_json()
        d = data["diseases"][0]
        assert "name" in d
        assert "name_en" in d
        assert "name_fr" in d
        assert "icd10" in d
        assert "severity" in d

    def test_severity_range(self, client):
        data = client.get("/api/diseases", headers=AUTH).get_json()
        for d in data["diseases"]:
            assert isinstance(d["severity"], (int, float))
