# MedEra Clinical Context Schema v1.0.0

This schema defines the non-symptom variables (Contextual Priors) used to strengthen the MedEra AI diagnostic engine.

## 1. Demographics
| Feature | Type | Description |
| :--- | :--- | :--- |
| `age` | Integer | Patient age in years. |
| `sex` | Categorical | M (Male), F (Female), O (Other). |

## 2. Clinical History (Antecedents)
| Feature | Type | Description |
| :--- | :--- | :--- |
| `history_diabetes` | Binary | Previous diagnosis of Diabetes (Type 1 or 2). |
| `history_hypertension` | Binary | Previous diagnosis of High Blood Pressure. |
| `history_heart_disease`| Binary | Previous cardiac events or chronic disease. |
| `history_asthma_copd` | Binary | Chronic respiratory conditions. |
| `history_cancer` | Binary | Active or previous malignancy. |
| `history_smoking` | Binary | Active smoker or significant smoking history. |

## 3. Epidemiological Context (Travel & Exposure)
| Feature | Type | Description |
| :--- | :--- | :--- |
| `travel_tropical` | Binary | Recent travel to tropical/sub-tropical regions (Malaria, Zika, Dengue risk). |
| `travel_high_risk` | Binary | Travel to areas with active outbreaks or poor sanitation (Typhoid, Cholera risk). |
| `exposure_sick_contact`| Binary | Direct contact with individuals having similar symptoms. |
| `exposure_animals` | Binary | Contact with livestock, bats, or wild animals (Zoonotic risk). |

## 4. Situational / Lifestyle
| Feature | Type | Description |
| :--- | :--- | :--- |
| `alcohol_consumption` | Binary | Significant/Regular alcohol use. |
| `recent_surgery` | Binary | Surgery or invasive procedure in the last 30 days. |
| `pregnancy` | Binary | Currently pregnant (influences differential diagnosis). |
| `high_stress` | Binary | Self-reported high stress (influences psychogenic/cardiac priors). |

## 5. Implementation Strategy
These variables are used as **Gating and Weighting Features** in the RandomForest model. During inference, if these context flags are provided, the model's posterior probability for relevant disease clusters is significantly boosted.
