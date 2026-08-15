import os
from flask import Blueprint, request, jsonify, current_app
from marshmallow import ValidationError
from .model import model_service
from .schemas import PredictSchema

api_bp = Blueprint("api", __name__)
predict_schema = PredictSchema()

INTERNAL_TOKEN = os.environ.get("AI_INTERNAL_TOKEN", "medera-internal-secret-token-dev")


def require_token():
    token = request.headers.get("X-Internal-Token", "")
    if token != INTERNAL_TOKEN:
        return jsonify({"error": "Unauthorized"}), 401
    return None


@api_bp.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok" if model_service.is_loaded else "degraded",
        "model_loaded": model_service.is_loaded,
        "version": getattr(model_service, "version", "unknown"),
        "model_algorithm": getattr(model_service, "model_algorithm", "SGD"),
        "n_estimators": getattr(model_service, "n_estimators", None),
        "n_symptoms": len(getattr(model_service, "symptoms_list", [])),
        "n_diseases": len(getattr(model_service, "diseases", [])),
        "f1_score": getattr(model_service, "f1_score", 0),
        "clinical_engine": {
            "loaded": model_service.is_loaded,
            "version": getattr(model_service, "version", "none"),
            "n_diseases": len(getattr(model_service, "diseases", [])),
        }
    })


@api_bp.route("/predict", methods=["POST"])
def predict():
    auth_error = require_token()
    if auth_error:
        return auth_error

    try:
        json_data = request.get_json(force=True) or {}
        current_app.logger.info(f"Incoming predict request: {json_data}")
        data = predict_schema.load(json_data)
    except ValidationError as e:
        return jsonify({"error": "Invalid input", "details": e.messages}), 400

    try:
        # Prepare context data (all fields except symptoms, lang, min_confidence)
        context_fields = [
            "age", "sex", "history_diabetes", "history_hypertension",
            "history_heart_disease", "history_asthma_copd", "history_cancer",
            "history_smoking", "travel_tropical", "travel_high_risk",
            "exposure_sick_contact", "exposure_animals", "alcohol_consumption",
            "recent_surgery", "pregnancy", "high_stress"
        ]
        context = {k: data.get(k) for k in context_fields if k in data}

        result = model_service.predict(
            data["symptoms"], 
            lang=data["lang"],
            min_confidence=data.get("min_confidence"),
            context=context,
            free_text=data.get("free_text")
        )
        return jsonify(result)
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        current_app.logger.error(f"Prediction error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@api_bp.route("/feedback", methods=["POST"])
def feedback():
    """Telemetry endpoint for clinician feedback (v5.0)."""
    auth_error = require_token()
    if auth_error:
        return auth_error

    from .schemas import FeedbackSchema
    feedback_schema = FeedbackSchema()
    try:
        json_data = request.get_json(force=True) or {}
        data = feedback_schema.load(json_data)
    except ValidationError as e:
        return jsonify({"error": "Invalid input", "details": e.messages}), 400

    success = model_service.save_feedback(data)
    if success:
        return jsonify({"status": "success", "message": "Feedback recorded"}), 201
    return jsonify({"error": "Failed to save feedback"}), 500


@api_bp.route("/symptoms", methods=["GET"])
def symptoms():
    auth_error = require_token()
    if auth_error:
        return auth_error

    lang = request.args.get("lang", "en")
    query = request.args.get("q", "")
    symptom_list = model_service.get_symptoms(lang=lang, query=query)
    return jsonify({
        "count": len(symptom_list),
        "symptoms": symptom_list,
    })


@api_bp.route("/extract_symptoms", methods=["POST"])
def extract_symptoms():
    """NLP prose extraction endpoint (v5.0)."""
    auth_error = require_token()
    if auth_error:
        return auth_error

    try:
        json_data = request.get_json(force=True) or {}
        text = json_data.get("text", "")
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        extracted = model_service.extract_symptoms_from_text(text)
        return jsonify({
            "count": len(extracted),
            "symptoms": extracted
        })
    except Exception as e:
        current_app.logger.error(f"NLP extraction error: {e}")
        return jsonify({"error": str(e)}), 500


@api_bp.route("/diseases", methods=["GET"])
def diseases():
    auth_error = require_token()
    if auth_error:
        return auth_error

    diseases_out = []
    for d in getattr(model_service, "diseases", []):
        diseases_out.append({
            "name": d,
            "name_en": model_service.names_en.get(d, d),
            "name_fr": model_service.names_fr.get(d, d),
            "icd10": str(model_service.icd10_map.get(d, "")),
            "severity": int(model_service.severity_map.get(d, 3)),
        })
    return jsonify({"count": len(diseases_out), "diseases": diseases_out})
