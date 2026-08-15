from marshmallow import Schema, fields, validates, ValidationError, post_load, EXCLUDE, validate

class ClinicalContextSchema(Schema):
    """Base schema for clinical context fields (New in v4.2.0)."""
    age = fields.Int(load_default=30, validate=validate.Range(min=0, max=120))
    sex = fields.Str(load_default="M", validate=validate.OneOf(["M", "F", "male", "female"]))
    history_diabetes = fields.Bool(load_default=False)
    history_hypertension = fields.Bool(load_default=False)
    history_heart_disease = fields.Bool(load_default=False)
    history_asthma_copd = fields.Bool(load_default=False)
    history_cancer = fields.Bool(load_default=False)
    history_smoking = fields.Bool(load_default=False)
    travel_tropical = fields.Bool(load_default=False)
    travel_high_risk = fields.Bool(load_default=False)
    exposure_sick_contact = fields.Bool(load_default=False)
    exposure_animals = fields.Bool(load_default=False)
    alcohol_consumption = fields.Bool(load_default=False)
    recent_surgery = fields.Bool(load_default=False)
    pregnancy = fields.Bool(load_default=False)
    high_stress = fields.Bool(load_default=False)

class PredictSchema(ClinicalContextSchema):
    class Meta:
        unknown = EXCLUDE

    symptoms = fields.List(
        fields.Str(required=True),
        required=True
    )
    lang = fields.Str(load_default="en")
    min_confidence = fields.Float(
        load_default=None,
        allow_none=True,
        validate=validate.Range(min=0.0, max=1.0)
    )
    free_text = fields.Str(load_default=None, allow_none=True)

    @validates("symptoms")
    def validate_symptoms(self, value, **kwargs):
        # We allow empty if free_text is provided, but the route check handles that
        for s in value:
            if not s or not s.strip():
                raise ValidationError("symptoms cannot contain empty strings")

    @post_load
    def clean(self, data, **kwargs):
        data["symptoms"] = list({
            s.strip().lower().replace(" ", "_").replace("-", "_")
            for s in data["symptoms"]
            if s.strip()
        })
        # Default lang to 'en' if not provided or invalid
        if data.get("lang") not in ("en", "fr"):
            data["lang"] = "en"
        
        # Normalize sex
        s = str(data.get("sex", "M")).upper()
        data["sex"] = "F" if s in ("F", "FEMALE") else "M"
        
        return data

class FeedbackSchema(Schema):
    """Clinician feedback for telemetry (v5.0)."""
    telemetry_id = fields.Str(required=True)
    predicted_disease = fields.Str(required=True)
    correct_disease = fields.Str(required=True)
    physician_id = fields.Str(required=False, allow_none=True)
    clinical_notes = fields.Str(required=False, allow_none=True)
    doctor_notes = fields.Str(required=False, allow_none=True)
    timestamp = fields.DateTime(dump_only=True)

class DiseasePredictionSchema(Schema):
    """Schema for a single disease prediction object."""
    disease = fields.Str()
    name_en = fields.Str()
    name_fr = fields.Str()
    confidence = fields.Float()
    icd10 = fields.Str()
    severity = fields.Int()
    clinical_note = fields.Str(allow_none=True)

class PredictionResponseSchema(Schema):
    """Top-level schema for the predictive response."""
    predictions = fields.List(fields.Nested(DiseasePredictionSchema))
    known_symptoms = fields.List(fields.Str())
    unknown_symptoms = fields.List(fields.Str())
    coverage = fields.Dict()
    degraded = fields.Bool()
    disclaimer = fields.Str()
    lang = fields.Str()
    clinical_note = fields.Str(allow_none=True)
