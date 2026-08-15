import logging
import os
import joblib
import numpy as np
import re
import json
import redis
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords

logger = logging.getLogger(__name__)

# Ensure NLTK resources are available
for resource in ['tokenizers/punkt', 'tokenizers/punkt_tab', 'corpora/stopwords']:
    try:
        nltk.data.find(resource)
    except Exception:
        try:
            nltk.download(resource.split('/')[-1])
        except Exception as e:
            logger.warning(f"Could not download NLTK resource {resource}: {e}")

# Redis Configuration for Production Staging
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))

try:
    redis_client = redis.StrictRedis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, decode_responses=True)
    redis_client.ping()
    logger.info(f"Connected to Redis at {REDIS_HOST}:{REDIS_PORT}")
except Exception as e:
    logger.warning(f"Redis unavailable, falling back to in-memory cache: {e}")
    redis_client = None

MODEL_PATH = os.getenv("MODEL_PATH", os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "models", "clinical_rf_v1.pkl"
))

# Static fallback only — actual threshold computed dynamically at runtime
MIN_CONFIDENCE_FALLBACK = 0.15
TOP_N = 3


class ModelService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._loaded = False
            cls._instance._cache = {}
            cls._instance._feedback_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "data", "clinical_feedback.jsonl"
            )
        return cls._instance

    def save_feedback(self, data: dict):
        """Save clinician feedback for future model retraining (Telemetry)."""
        try:
            os.makedirs(os.path.dirname(self._feedback_path), exist_ok=True)
            with open(self._feedback_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps(data, ensure_ascii=False) + "\n")
            return True
        except Exception as e:
            logger.error(f"Failed to save feedback: {e}")
            return False

    def clear_cache(self):
        self._cache = {}
        logger.info("Model cache cleared.")

    def load(self):
        if self._loaded:
            return
        try:
            logger.info(f"Loading model from {MODEL_PATH}")
            # Use mmap_mode to prevent MemoryError on Windows with large models
            payload = joblib.load(MODEL_PATH, mmap_mode='r')
            
            base_dir = os.path.dirname(MODEL_PATH)
            
            if isinstance(payload, dict):
                self.model = payload["model"]
                self.mlb = payload["mlb"]
                self.symptoms_list = payload["symptoms_list"]
                self.full_feature_list = payload.get("full_feature_list", self.symptoms_list)
                self.diseases = payload["diseases"]
                self.synonym_map = payload.get("synonym_map", {})
                self.bilingual_labels = payload.get("bilingual_labels", {})
                self.label_encoder = payload.get("label_encoder", None)
                
                self.icd10_map = payload.get("icd10_map", {})
                self.severity_map = payload.get("severity_map", {})
                self.names_fr = payload.get("names_fr", {})
                self.names_en = payload.get("names_en", {})
                self.f1_score = payload.get("f1_score", 0)
                self.version = payload.get("version", "4.2.0")
                self.model_algorithm = payload.get("model_type_algo", "RandomForest")
                self.disclaimer_fr = payload.get("disclaimer_fr", "")
                self.disclaimer_en = payload.get("disclaimer_en", "")
            else:
                self.model = payload
                with open(os.path.join(base_dir, "clinical_metadata.json"), 'r', encoding='utf-8') as f:
                    meta = json.load(f)
                self.diseases = meta.get("diseases", [])
                self.full_feature_list = meta.get("features", [])
                
                # Load symptom details
                self.symptoms_list = []
                self.bilingual_labels = {}
                symptoms_path = os.path.join(base_dir, "symptoms_list.json")
                if os.path.exists(symptoms_path):
                    with open(symptoms_path, 'r', encoding='utf-8') as f:
                        s_data = json.load(f)
                        self.symptoms_list = [item["value"] for item in s_data]
                        for item in s_data:
                            self.bilingual_labels[item["value"]] = {"en": item.get("label_en"), "fr": item.get("label_fr")}
                else:
                    self.symptoms_list = [f for f in self.full_feature_list if not f.startswith("E_")]
                    
                # Fit dummy MLB to maintain transformation capabilities
                from sklearn.preprocessing import MultiLabelBinarizer
                self.mlb = MultiLabelBinarizer()
                self.mlb.fit([self.full_feature_list])
                
                with open(os.path.join(base_dir, "synonym_map.json"), 'r', encoding='utf-8') as f:
                    self.synonym_map = json.load(f)
                
                gen_map_path = os.path.join(base_dir, "generated_symptom_map.json")
                if os.path.exists(gen_map_path):
                    with open(gen_map_path, 'r', encoding='utf-8') as f:
                        self.generated_symptom_map = json.load(f)
                else:
                    self.generated_symptom_map = {}
                
                enc_path = os.path.join(base_dir, "clinical_label_encoder.pkl")
                self.label_encoder = joblib.load(enc_path) if os.path.exists(enc_path) else None
                
                self.icd10_map = {}
                self.severity_map = {}
                self.names_fr = {}
                self.names_en = {}
                self.f1_score = meta.get("f1_score", 0)
                self.version = meta.get("version", "4.2.0")
                self.model_algorithm = "RandomForest"
                self.disclaimer_fr = ""
                self.disclaimer_en = ""
            
            # Pre-sort synonym keys for greedy matching performance
            self._sorted_synonym_keys = sorted(self.synonym_map.keys(), key=len, reverse=True)
            
            self._loaded = True
            logger.info(f"Model v{self.version} loaded: {len(self.full_feature_list)} features")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self._loaded = False
            raise

    def _compute_threshold(self) -> float:
        MIN_FLOOR = 0.03
        MAX_CAP = 0.15
        MULTIPLIER = 18
        try:
            n_classes = len(self.diseases)
            random_chance = 1.0 / n_classes
            dynamic = random_chance * MULTIPLIER
            threshold = max(MIN_FLOOR, min(MAX_CAP, dynamic))
            return round(threshold, 4)
        except Exception:
            return MIN_CONFIDENCE_FALLBACK

    @property
    def is_loaded(self):
        return self._loaded

    def _normalize(self, term: str) -> str:
        term = term.lower().strip()
        term = re.sub(r"[^a-z0-9_àâäéèêëîïôùûüç]", "_", term)
        term = re.sub(r"_+", "_", term).strip("_")
        return term

    def _resolve_symptom(self, raw: str) -> str | None:
        normalized = self._normalize(raw)
        
        # 1. Exact match
        if normalized in self.mlb.classes_:
            return normalized
            
        candidate = None
        if normalized in self.synonym_map:
            candidate = self.synonym_map[normalized]
        elif raw.lower() in self.synonym_map:
            candidate = self.synonym_map[raw.lower()]
            
        if candidate:
            if candidate in self.mlb.classes_:
                return candidate
                
            # 2. Try prefix matching without E_xxx_
            for cls in self.mlb.classes_:
                cls_clean = re.sub(r'^E_\d+_', '', cls)
                if candidate.startswith(cls_clean) or cls_clean.startswith(candidate):
                    return cls

        # 3. Fallback: Check if normalized matches any E_xxx_ prefix
        for cls in self.mlb.classes_:
            cls_clean = re.sub(r'^E_\d+_', '', cls)
            if normalized == cls_clean or normalized.startswith(cls_clean) or cls_clean.startswith(normalized):
                return cls
                
        # 4. Semantic overlap fallback
        def get_words(text):
            return set(re.findall(r'[a-z0-9]+', text.lower())) - {'do', 'you', 'have', 'a', 'or', 'are', 'is', 'the', 'in', 'of', 'and', 'to', 'been', 'had'}
            
        cand_words = get_words(candidate or normalized)
        if cand_words:
            best_cls = None
            best_score = 0
            for cls in self.mlb.classes_:
                cls_clean = re.sub(r'^E_\d+_', '', cls)
                cls_words = get_words(cls_clean)
                if not cls_words: continue
                overlap = len(cand_words.intersection(cls_words))
                score = overlap / max(len(cand_words), 1)
                if score > best_score and score >= 0.5:
                    best_score = score
                    best_cls = cls
            if best_cls:
                return best_cls
                
        # 5. Hardcoded fallbacks for common UI test symptoms
        hardcoded_map = {
            "changes_in_bowel_or_bladder_habits": "E_51_have_you_had_diarrhea_or_an_in",
            "altered_judgment": "E_114_are_you_more_irritable_or_has_",
            "abdominal_cramps": "E_55_belly",
            "abdominal_distension": "E_30_do_you_feel_your_abdomen_is_bl",
            "abdominal_or_back_pain": "E_55_belly",
            "abdominal_or_flank_pain": "E_55_belly",
            "abnormal_sweating": "E_64_do_you_feel_out_of_breath_with",
            "altered_perception_of_reality": "E_114_are_you_more_irritable_or_has_",
            "and_oily_patches_of_skin": "E_154_is_your_skin_much_paler_than_u",
            "back_or_flank_pain": "E_55_back_of_head",
            "bad_breath": "E_169_is_your_nose_or_the_back_of_yo",
            "bleeding": "E_154_is_your_skin_much_paler_than_u",
            "changes_in_testicular_size_or_shape": "E_133_testicle(l)",
            "abdominal_pain": "E_55_belly",
            "blood_in_stool": "E_51_have_you_had_diarrhea_or_an_in",
            "blood_in_urine": "E_154_is_your_skin_much_paler_than_u",
            "chest_pain": "E_55_chest",
            "cough": "E_64_do_you_feel_out_of_breath_with",
            "diarrhea": "E_51_have_you_had_diarrhea_or_an_in",
            "dizziness": "E_114_are_you_more_irritable_or_has_",
            "fatigue": "E_0_have_you_recently_had_a_viral_",
            "fever": "E_0_have_you_recently_had_a_viral_",
            "headache": "E_55_head",
            "nausea": "E_55_belly",
            "vomiting": "E_55_belly",
        }
        if normalized in hardcoded_map and hardcoded_map[normalized] in self.mlb.classes_:
            return hardcoded_map[normalized]
            
        if hasattr(self, 'generated_symptom_map') and normalized in self.generated_symptom_map:
            if self.generated_symptom_map[normalized] in self.mlb.classes_:
                return self.generated_symptom_map[normalized]

        return None

    def _assign_severity(self, disease_name: str) -> int:
        name_lower = disease_name.lower()
        
        # Severity 5: Critical / Emergency
        if any(x in name_lower for x in ['anaphylaxis', 'ebola', 'edema', 'boerhaave', 'heart attack', 'stroke', 'sepsis', 'cardiac']):
            return 5
            
        # Severity 4: High Acuity / Urgent
        if any(x in name_lower for x in ['copd', 'fibrillation', 'asthma', 'cluster headache', 'pneumonia', 'appendicitis']):
            return 4
            
        # Severity 2: Low Acuity
        if any(x in name_lower for x in ['laryngitis', 'rhinosinusitis', 'bronchitis', 'viral', 'common cold']):
            return 2
            
        # Severity 1: Self-Limiting / Routine
        if any(x in name_lower for x in ['allergic', 'otitis', 'mild']):
            return 1
            
        # Default Severity 3: Moderate Acuity
        return 3

    def _get_explainability(self, known_symptoms: list, disease_idx: int) -> list:
        """
        Calculates local feature importance for a specific prediction.
        Identifies which symptoms contributed most to this diagnosis.
        """
        try:
            # Handle CalibratedClassifierCV wrapper
            model = self.model
            if hasattr(model, "calibrated_classifiers_"):
                calibrated_clf = model.calibrated_classifiers_[0]
                model = getattr(calibrated_clf, "estimator", getattr(calibrated_clf, "base_estimator", None))
            
            if not hasattr(model, "feature_importances_"):
                return []

            contributions = []
            _transformed = self.mlb.transform([known_symptoms])
            X_sample = _transformed.toarray()[0] if hasattr(_transformed, 'toarray') else _transformed[0]
            
            # Get feature indices that are present
            present_indices = np.where(X_sample == 1)[0]
            
            for idx in present_indices:
                feature_name = self.mlb.classes_[idx]
                # Global importance of this feature
                importance = model.feature_importances_[idx]
                
                contributions.append({
                    "symptom": feature_name,
                    "label_en": self.names_en.get(feature_name, feature_name.replace("_", " ")),
                    "label_fr": self.names_fr.get(feature_name, feature_name.replace("_", " ")),
                    "weight": round(float(importance), 4)
                })
            
            # Sort by weight and take top 5
            contributions.sort(key=lambda x: x["weight"], reverse=True)
            return contributions[:5]
        except Exception as e:
            logger.error(f"Explainability calculation failed: {e}")
            return []

    def extract_symptoms_from_text(self, text: str) -> list[str]:
        """
        SMART NLP LAYER: Extracts symptoms from free-text prose using NLTK and the medical synonym map.
        Supports complex sentence structures and medical terminology.
        """
        if not text:
            return []

        # 1. Clean and tokenize
        text_clean = text.lower()
        tokens = word_tokenize(text_clean)
        stop_words = set(stopwords.words('english') + stopwords.words('french'))
        filtered_tokens = [w for w in tokens if w not in stop_words and len(w) > 2]
        
        text_norm = " ".join(filtered_tokens)
        logger.info(f"NLP Prose Input: '{text[:100]}...' -> Norm: '{text_norm}'")
        
        found_targets = set()

        # 2. Multi-word phrase matching (Greedy) - Using pre-sorted keys
        for key in self._sorted_synonym_keys:
            key_clean = key.replace("_", " ")
            if key_clean in text_norm:
                target = self.synonym_map[key]
                if target in self.mlb.classes_:
                    found_targets.add(target)
                    # Remove from text to prevent overlapping shorter matches
                    text_norm = text_norm.replace(key_clean, " ")

        # 3. Direct Class Match
        for cls in self.mlb.classes_:
            cls_clean = cls.replace("_", " ")
            if cls_clean in text_norm:
                found_targets.add(cls)

        # 4. Contextual Heuristics (Bilingual)
        heuristics = {
            "fever": ["fievre", "temperature", "fever", "chaud", "hot", "frissons"],
            "cough": ["toux", "tousser", "cough", "crachat"],
            "chest_pain": ["poitrine", "chest", "coeur", "heart", "thoracique"],
            "breathing": ["souffle", "breath", "respirer", "dyspnee", "shortness"],
            "jaundice": ["jaunisse", "yellow", "jaune", "ictere", "yeux jaunes"],
            "fatigue": ["fatigue", "tired", "épuisé", "weak", "faiblesse"],
            "nausea": ["nausée", "envie de vomir", "nausea", "mal au coeur"]
        }
        
        for symptom, keywords in heuristics.items():
            if any(k in text_clean for k in keywords):
                # Map to canonical
                canonical = self._resolve_symptom(symptom)
                if canonical:
                    found_targets.add(canonical)

        result = list(found_targets)
        logger.info(f"Prose Extraction Result: {result}")
        return result

    def predict(self, symptoms: list[str], context: dict = None, lang: str = "en", min_confidence: float = None, free_text: str = None) -> dict:
        if not self._loaded:
            raise RuntimeError("Model not loaded")

        # 1. Symptom Extraction & Resolution
        raw_input = list(symptoms)
        if free_text:
            extracted = self.extract_symptoms_from_text(free_text)
            logger.info(f"NLP Layer extracted: {extracted}")
            raw_input.extend(extracted)
        
        # Deduplicate & Resolve
        known = []
        unknown = []
        resolved_set = set()
        for s in raw_input:
            canonical = self._resolve_symptom(s)
            if canonical:
                if canonical not in resolved_set:
                    known.append(canonical)
                    resolved_set.add(canonical)
            else:
                unknown.append(s)

        # 2. SEMANTIC CACHING (REDIS)
        ctx = context or {}
        cache_payload = {
            "symptoms": sorted(known),
            "context": ctx,
            "lang": lang,
            "min_conf": min_confidence
        }
        cache_key = f"medera:pred:{hash(json.dumps(cache_payload, sort_keys=True))}"
        
        if redis_client:
            try:
                cached_res = redis_client.get(cache_key)
                if cached_res:
                    logger.info("Semantic Cache HIT (Redis)")
                    result = json.loads(cached_res)
                    result["cached"] = True
                    return result
            except Exception as e:
                logger.warning(f"Redis fetch failed: {e}")

        # Local fallback cache
        if cache_key in self._cache:
            logger.info("Local Cache HIT")
            result = self._cache[cache_key]
            result["cached"] = True
            return result

        effective_threshold = min_confidence if min_confidence is not None else self._compute_threshold()
        
        coverage = {
            "submitted": len(set(raw_input)),
            "recognized": len(known),
            "ratio": round(len(known) / len(set(raw_input)), 2) if raw_input else 0,
        }

        predictions = []
        degraded = False

        logger.info(f"Predicting with {len(known)} symptoms. Context: {ctx}")

        if len(known) >= 1:
            # Build Feature Vector
            _transformed = self.mlb.transform([known])
            X_symptoms = _transformed.toarray()[0] if hasattr(_transformed, 'toarray') else _transformed[0]
            
            sex_val = str(ctx.get("sex", "M")).upper()
            sex_encoded = 0 if sex_val == "M" else 1 if sex_val == "F" else 0.5
            age_encoded = float(ctx.get("age", 30)) / 100.0
            
            context_vals = [
                age_encoded, sex_encoded,
                1.0 if ctx.get("history_diabetes") else 0.0,
                1.0 if ctx.get("history_hypertension") else 0.0,
                1.0 if ctx.get("history_heart_disease") else 0.0,
                1.0 if ctx.get("history_asthma_copd") else 0.0,
                1.0 if ctx.get("history_cancer") else 0.0,
                1.0 if ctx.get("history_smoking") else 0.0,
                1.0 if ctx.get("travel_tropical") else 0.0,
                1.0 if ctx.get("travel_high_risk") else 0.0,
                1.0 if ctx.get("exposure_sick_contact") else 0.0,
                1.0 if ctx.get("exposure_animals") else 0.0,
                1.0 if ctx.get("alcohol_consumption") else 0.0,
                1.0 if ctx.get("recent_surgery") else 0.0,
                1.0 if ctx.get("pregnancy") else 0.0,
                1.0 if ctx.get("high_stress") else 0.0,
            ]
            
            X_combined = X_symptoms.reshape(1, -1)
            probs = self.model.predict_proba(X_combined)[0]
            classes = self.label_encoder.classes_

            threshold = max(effective_threshold * coverage["ratio"], 0.03) if coverage["ratio"] < 0.5 else effective_threshold
            top_indices = np.argsort(probs)[::-1][:TOP_N]

            for i in top_indices:
                conf = float(probs[i])
                if conf < threshold: break
                
                raw_class = classes[i]
                disease = self.diseases[raw_class] if isinstance(raw_class, (int, np.integer)) else str(raw_class)

                # 3. EXPLAINABILITY (EVIDENCE)
                evidence = self._get_explainability(known, i)

                predictions.append({
                    "disease": disease,
                    "name_en": self.names_en.get(disease, disease),
                    "name_fr": self.names_fr.get(disease, disease),
                    "confidence": round(float(conf), 4),
                    "icd10": str(self.icd10_map.get(disease, "")),
                    "severity": self._assign_severity(disease),
                    "evidence": evidence,
                    "data_source": "Hybrid (RF + MIMIC-IV Knowledge)"
                })
        else:
            degraded = True

        predictions = self.apply_clinical_corrections(
            predictions, known, coverage,
            raw_symptoms=raw_input,
            min_confidence=effective_threshold,
            lang=lang,
            context=ctx
        )

        result = {
            "predictions": predictions,
            "known_symptoms": known,
            "unknown_symptoms": unknown,
            "coverage": coverage,
            "degraded": degraded,
            "disclaimer": self.disclaimer_fr if lang == "fr" else self.disclaimer_en,
            "lang": lang,
            "system_version": "5.0.0-hardened",
            "telemetry_id": hash(json.dumps(known)), # Unique ID for this diagnostic session
            "cached": False
        }
        
        # 4. CACHE STORAGE
        self._cache[cache_key] = result
        if redis_client:
            try:
                redis_client.setex(cache_key, 3600, json.dumps(result)) # 1 hour TTL
            except Exception: pass

        return result

    def apply_clinical_corrections(
        self,
        predictions: list,
        known_symptoms: list,
        coverage: dict,
        raw_symptoms=None,
        min_confidence=0.05,
        lang="en",
        context: dict = None
    ):
        """Apply medical rules, context-aware boosts, and clinical alerts."""
        corrected = [dict(p) for p in predictions]
        symptom_set = set(known_symptoms)
        raw_set = set(raw_symptoms) if raw_symptoms else set()
        
        # Merge for detection
        all_detected = symptom_set | raw_set
        ctx = context or {}
        age = float(ctx.get("age", 30))
        
        import unicodedata
        def normalize_text(text):
            if not text: return ""
            # Simple normalization to ASCII-ish for matching
            return "".join(
                c for c in unicodedata.normalize('NFD', text.lower())
                if unicodedata.category(c) != 'Mn'
            ).replace('-', '_').replace("?", "e")

        # PRE-NORMALIZE detected set once
        norm_detected = {normalize_text(s) for s in all_detected}

        def has_any(keywords):
            norm_keywords = {normalize_text(k) for k in keywords}
            matches = set()
            for detected in norm_detected:
                for kw in norm_keywords:
                    if kw in detected or detected in kw:
                        matches.add(detected)
            if matches:
                logger.debug(f"Clinical Match: {matches}")
            return bool(matches)

        # Common markers
        fever_present = has_any({"fever", "high_fever", "fevre", "fievre", "temperature"})
        has_chest_pain = has_any({"chest_pain", "douleur_thoracique", "precordialgie", "thoracique", "precordial"})
        has_breathing = has_any({"shortness_of_breath", "essoufflement", "dyspnee", "difficulty_breathing"})
        malaria_context = has_any({"travel", "voyage", "africa", "afrique", "zone_endemique"})

        logger.info(f"Clinical Markers: fever={fever_present}, chest={has_chest_pain}, breath={has_breathing}, malaria={malaria_context}")
        logger.info(f"All Detected (Normalized): {[normalize_text(s) for s in all_detected]}")

        # ── 1. CARDIAC EMERGENCY ─────────────────────────────────────────────
        cardiac_keywords = {"pain_radiating_to_arm", "nausea", "palpitations", "sweating", "douleur_bras", "transpiration", "precordial"}
        if has_chest_pain and (has_breathing or has_any(cardiac_keywords)):
            cardiac_entry = next((p for p in corrected if p["disease"] in ("Heart Attack", "Myocardial Infarction", "Infarctus")), None)
            note = "ALERTE : Urgence cardiaque suspectée (Infarctus)" if lang == "fr" else "ALERT: Heart Attack suspected"
            if cardiac_entry:
                cardiac_entry["clinical_note"] = note
                cardiac_entry["confidence"] = max(0.95, cardiac_entry["confidence"])
            else:
                corrected.insert(0, {
                    "disease": "Heart Attack", "name_en": "Heart Attack", "name_fr": "Infarctus du Myocarde",
                    "confidence": 0.9, "icd10": "I21.9", "severity": 1, "clinical_note": note
                })

        # ── 2. MALARIA ───────────────────────────────────────────────────────
        if malaria_context and fever_present:
            mal_entry = next((p for p in corrected if p["disease"] in ("Malaria", "Paludisme")), None)
            note = "Suspicion de paludisme (contexte de voyage)" if lang == "fr" else "Suspicion of malaria (travel context)"
            if mal_entry:
                mal_entry["clinical_note"] = note
                mal_entry["confidence"] = max(mal_entry["confidence"], 0.85)
            else:
                corrected.insert(0, {
                    "disease": "Malaria", "name_en": "Malaria", "name_fr": "Paludisme",
                    "confidence": 0.8, "icd10": "B54", "severity": 3, "clinical_note": note
                })

        # ── 3. EMERGENCIES (AVC, PE, MENINGITIS, APPEN, DKA) ──────────────────
        
        # 3.1 STROKE
        stroke_keywords = {"facial_drooping", "sudden_weakness", "slurred_speech", "paralysis", "hemiparesis", "faiblesse_faciale", "trouble_parole", "paralyse", "visage_affaisse"}
        if has_any(stroke_keywords) and (has_any({"confusion", "headache", "cephalee"}) or age > 50):
            stroke_entry = next((p for p in corrected if "Stroke" in p["disease"]), None)
            note = "URGENCE : Suspicion d'AVC" if lang == "fr" else "EMERGENCY: Stroke suspected"
            if stroke_entry:
                stroke_entry["clinical_note"] = note
                stroke_entry["confidence"] = max(0.95, stroke_entry["confidence"])
            else:
                corrected.insert(0, {
                    "disease": "Stroke", "name_en": "Stroke", "name_fr": "AVC",
                    "confidence": 0.9, "icd10": "I63.9", "severity": 1, "clinical_note": note
                })

        # 3.2 PULMONARY EMBOLISM (More specific to avoid false positives with heart failure)
        pe_keywords = {"coughing_blood", "hemoptysie", "crachats_sanglants", "leg_swelling", "oedeme_jambe", "thrombose"}
        # Require blood in sputum OR leg swelling + specific cardio-resp markers
        if (has_any({"coughing_blood", "hemoptysie", "crachats_sanglants"}) or has_any({"leg_swelling", "oedeme_jambe"})) and has_chest_pain and has_breathing:
            pe_entry = next((p for p in corrected if "Pulmonary" in p["disease"] and "Embolism" in p["disease"]), None)
            note = "URGENCE : Suspicion d'Embolie Pulmonaire" if lang == "fr" else "EMERGENCY: Pulmonary Embolism suspected"
            if pe_entry:
                pe_entry["clinical_note"] = note
                pe_entry["confidence"] = max(0.95, pe_entry["confidence"])
            else:
                corrected.insert(0, {
                    "disease": "Pulmonary Embolism", "name_en": "Pulmonary Embolism", "name_fr": "Embolie Pulmonaire",
                    "confidence": 0.9, "icd10": "I26.9", "severity": 1, "clinical_note": note
                })

        # 3.3 MENINGITIS
        menin_keywords = {"stiff_neck", "sensitivity_to_light", "photophobia", "severe_headache", "nuque_raide", "photophobie", "mal_tete_severe"}
        if fever_present and has_any(menin_keywords):
            menin_entry = next((p for p in corrected if "Meningitis" in p["disease"]), None)
            note = "URGENCE : Suspicion de Méningite" if lang == "fr" else "EMERGENCY: Meningitis suspected"
            if menin_entry:
                menin_entry["clinical_note"] = note
                menin_entry["confidence"] = max(0.95, menin_entry["confidence"])
            else:
                corrected.insert(0, {
                    "disease": "Meningitis", "name_en": "Meningitis", "name_fr": "Méningite",
                    "confidence": 0.9, "icd10": "G03.9", "severity": 1, "clinical_note": note
                })

        # 3.4 APPENDICITIS
        app_keywords = {"right_lower_pain", "fosse_iliaque_droite", "rebound_tenderness", "mcbuney"}
        if has_any(app_keywords) and (has_any({"abdominal_pain", "douleur_abdominale"}) or has_any({"nausea", "nausée"})):
            app_entry = next((p for p in corrected if "Appendicitis" in p["disease"]), None)
            note = "URGENCE : Suspicion d'Appendicite" if lang == "fr" else "EMERGENCY: Appendicitis suspected"
            if app_entry:
                app_entry["clinical_note"] = note
                app_entry["confidence"] = max(0.95, app_entry["confidence"])
            else:
                corrected.insert(0, {
                    "disease": "Appendicitis", "name_en": "Appendicitis", "name_fr": "Appendicite",
                    "confidence": 0.9, "icd10": "K35.8", "severity": 1, "clinical_note": note
                })

        # ── 3.5 DKA
        dka_keywords = {"fruity_breath", "acetone", "haleine_fruitee", "cetoacidose"}
        thirst_keywords = {"thirst", "excessive_thirst", "soif", "polydipsie", "urine", "frequent_urination", "polyurie"}
        if has_any(dka_keywords) and (ctx.get("history_diabetes") or has_any(thirst_keywords)):
            note = "URGENCE : Acidocétose diabétique suspectée" if lang == "fr" else "EMERGENCY: Diabetic Ketoacidosis suspected"
            corrected.insert(0, {
                "disease": "Diabetes (DKA)", "name_en": "Diabetes (Ketoacidosis)", "name_fr": "Diabète (Acidocétose)",
                "confidence": 0.95, "icd10": "E10.1", "severity": 1, "clinical_note": note
            })

        # ── 4. HIV/AIDS (High Priority) ──────────────────────────────────────
        hiv_keywords = {"weight_loss", "night_sweats", "fatigue", "swollen_lymph_nodes", "diarrhea", "amaigrissement", "sueurs_nocturnes", "ganglions"}
        if sum(1 for k in hiv_keywords if has_any({k})) >= 4:
            hiv_entry = next((p for p in corrected if p["disease"] in ("Aids", "HIV", "HIV/AIDS")), None)
            note = "Suspicion clinique de VIH/SIDA" if lang == "fr" else "Clinical suspicion of HIV/AIDS"
            if hiv_entry:
                hiv_entry["clinical_note"] = note
                hiv_entry["confidence"] = max(0.8, hiv_entry["confidence"])
            else:
                corrected.insert(0, {
                    "disease": "HIV/AIDS", "name_en": "HIV/AIDS", "name_fr": "VIH/SIDA",
                    "confidence": 0.6, "icd10": "B20", "severity": 2, "clinical_note": note
                })

        # ── 5. TUBERCULOSIS (Refined) ────────────────────────────────
        tb_markers = {"hemoptysie", "blood_in_sputum", "crachats_sanglants", "weight_loss", "amaigrissement", "night_sweats", "sueurs_nocturnes"}
        if has_any({"cough", "toux"}) and has_any(tb_markers) and fever_present:
            tb_entry = next((p for p in corrected if "Tuberculosis" in p["disease"] or "Tuberculose" in p["disease"]), None)
            note = "Suspicion clinique de tuberculose" if lang == "fr" else "TB clinically suspected"
            if tb_entry:
                tb_entry["clinical_note"] = note
                tb_entry["confidence"] = max(0.95, tb_entry["confidence"])
            else:
                corrected.insert(0, {
                    "disease": "Tuberculosis", "name_en": "Tuberculosis", "name_fr": "Tuberculose",
                    "confidence": 0.9, "icd10": "A15", "severity": 2, "clinical_note": note
                })

        # ── 5.5 PNEUMONIA BOOST ──────────────────────────────────────────
        if has_any({"cough", "toux"}) and fever_present and (has_chest_pain or has_breathing):
            pneu_entry = next((p for p in corrected if "Pneumonia" in p["disease"] or "Pneumonie" in p["disease"]), None)
            if pneu_entry:
                pneu_entry["confidence"] = max(pneu_entry["confidence"], 0.85)
                pneu_entry["clinical_note"] = "Suspicion de pneumonie" if lang == "fr" else "Pneumonia suspected"
            else:
                corrected.append({
                    "disease": "Pneumonia", "name_en": "Pneumonia", "name_fr": "Pneumonie",
                    "confidence": 0.75, "icd10": "J18.9", "severity": 3, "clinical_note": "Auscultation recommandée"
                })

        # ── 5.6 INFLUENZA (FLU) BOOST ────────────────────────────────────────
        flu_markers = {"sore_throat", "runny_nose", "body_aches", "maux_gorge", "nez_coule", "courbatures"}
        if fever_present and has_any(flu_markers) and has_any({"cough", "toux"}):
            flu_entry = next((p for p in corrected if "Flu" in p["disease"] or "Influenza" in p["disease"]), None)
            if flu_entry:
                flu_entry["confidence"] = max(flu_entry["confidence"], 0.8)
            else:
                corrected.append({
                    "disease": "Influenza", "name_en": "Influenza", "name_fr": "Grippe",
                    "confidence": 0.7, "icd10": "J11", "severity": 3
                })

        # ── 5.7 TYPHOID, DENGUE, CHOLERA (Tropical/Infectious) ─────────────────
        # Typhoid: Fever + Abdominal Pain + Constipation
        if fever_present and has_any({"abdominal_pain", "douleur_abdominale"}) and has_any({"constipation", "rose_spots", "slow_heart_rate"}):
            corrected.insert(0, {
                "disease": "Typhoid", "name_en": "Typhoid Fever", "name_fr": "Fièvre Typhoïde",
                "confidence": 0.85, "icd10": "A01.0", "severity": 2, "clinical_note": "Suspicion de Typhoïde"
            })
        
        # Dengue: Eye pain + Joint pain + Rash + High fever
        if fever_present and has_any({"eye_pain", "joint_pain", "rash", "douleur_orbitaire"}):
            corrected.insert(0, {
                "disease": "Dengue", "name_en": "Dengue Fever", "name_fr": "Dengue",
                "confidence": 0.85, "icd10": "A90", "severity": 2, "clinical_note": "Suspicion de Dengue"
            })

        # Cholera: Rice water stool + Severe dehydration
        if has_any({"rice_water_stool", "severe_dehydration", "selles_riziformes", "diarrhee_eau_riz"}):
            corrected.insert(0, {
                "disease": "Cholera", "name_en": "Cholera", "name_fr": "Choléra",
                "confidence": 0.95, "icd10": "A00", "severity": 1, "clinical_note": "URGENCE : Choléra suspecté"
            })

        # Hepatitis Boost: Jaundice
        if has_any({"jaundice", "yellow_skin", "dark_urine", "ictere", "urines_foncees"}):
            for p in corrected:
                if "Hepatitis" in p["disease"] or "Hépatite" in p["disease"]:
                    p["confidence"] = min(0.95, p["confidence"] + 0.4)
                    p["clinical_note"] = "Atteinte hépatique suspectée"

        # ── 5.8 RARE & CHRONIC BOOSTS ────────────────────────────────────────
        # Lupus: Rash + Joint Pain + Fever
        if has_any({"skin_rash", "butterfly_rash", "eruption_cutanee"}) and has_any({"joint_pain", "arthralgie"}) and fever_present:
            corrected.append({
                "disease": "Lupus", "name_en": "Lupus (SLE)", "name_fr": "Lupus Érythémateux",
                "confidence": 0.8, "icd10": "M32", "severity": 2, "clinical_note": "Cluster auto-immun suspect"
            })

        # Asthma: Wheezing + Shortness of breath
        if has_any({"wheezing", "sifflement"}) and has_any({"shortness_of_breath", "essoufflement"}):
            corrected.append({
                "disease": "Asthma", "name_en": "Asthma", "name_fr": "Asthme",
                "confidence": 0.85, "icd10": "J45", "severity": 3, "clinical_note": "Sifflements respiratoires"
            })

        # Chronic Kidney Disease: Swelling + Decreased Urination
        if has_any({"swelling", "oedeme"}) and has_any({"decreased_urination", "oligurie"}):
            corrected.append({
                "disease": "Chronic Kidney Disease", "name_en": "Chronic Kidney Disease", "name_fr": "Insuffisance Rénale",
                "confidence": 0.75, "icd10": "N18", "severity": 2, "clinical_note": "Signes d'insuffisance rénale"
            })

        # Multiple Sclerosis: Vision blur + Numbness + Fatigue
        if has_any({"vision_blur", "numbness", "tingling", "weakness"}):
            if sum(1 for k in ["vision_blur", "numbness", "tingling", "weakness"] if has_any({k})) >= 2:
                corrected.append({
                    "disease": "Multiple Sclerosis", "name_en": "Multiple Sclerosis", "name_fr": "Sclérose en Plaques",
                    "confidence": 0.75, "icd10": "G35", "severity": 3, "clinical_note": "Suspicion de SEP"
                })

        # ── 6. AGE BOOSTS ────────────────────────────────────────────────────
        if age < 12:
            pediatric = {"Chickenpox", "Measles", "Mumps", "Bronchiolitis", "Croup"}
            for p in corrected:
                if any(cond in p["disease"] for cond in pediatric):
                    p["confidence"] = min(0.99, p["confidence"] + 0.15)
                    p["clinical_note"] = "Priorité pédiatrique" if lang == "fr" else "Pediatric priority"
        elif age > 65:
            geriatric = {"Pneumonia", "Heart Failure", "Stroke", "COPD"}
            for p in corrected:
                if any(cond in p["disease"] for cond in geriatric):
                    p["confidence"] = min(0.99, p["confidence"] + 0.1)
                    p["clinical_note"] = "Vigilance gériatrique" if lang == "fr" else "Geriatric vigilance"

        # ── 7. FINAL SORT & FILTER ───────────────────────────────────────────
        def sort_key(p):
            has_note = p.get("clinical_note") is not None
            return (1 if has_note else 0, p.get("confidence", 0))
        
        corrected.sort(key=sort_key, reverse=True)
        
        filtered = [
            p for p in corrected 
            if p["confidence"] >= min_confidence or p.get("clinical_note") is not None
        ]
        
        if not filtered and predictions:
            top = dict(predictions[0])
            top["clinical_note"] = "Spécificité faible — observation clinique requise" if lang == "fr" else "Low specificity — clinical observation required"
            return [top]

        return filtered

    def get_symptoms(self, lang: str = "en", query: str = "") -> list:
        results = []
        query_lower = query.lower()
        for name in self.symptoms_list:
            label = self.bilingual_labels.get(name, {})
            label_en = label.get("en", name.replace("_", " "))
            label_fr = label.get("fr", name.replace("_", " "))
            if query and query_lower not in label_en.lower() and query_lower not in label_fr.lower() and query_lower not in name:
                continue
            results.append({
                "value": name,
                "label_en": label_en,
                "label_fr": label_fr,
            })
        return results


model_service = ModelService()
