"""
ml-service/app.py

Flask scoring service. Loads the pre-trained Random Forest + Isolation
Forest (trained separately in Colab, see docs/ or the training notebook)
at startup, and scores incoming transactions via POST /predict.

Never trains at request time — models are loaded once from /models.
"""

import json
import os

import joblib
import numpy as np
import shap
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# ---------------------------------------------------------------------
# Load everything once at startup
# ---------------------------------------------------------------------
print("Loading models...")
rf_model = joblib.load(os.path.join(MODELS_DIR, "random_forest.pkl"))
iso_model = joblib.load(os.path.join(MODELS_DIR, "isolation_forest.pkl"))
encoder = joblib.load(os.path.join(MODELS_DIR, "encoder.pkl"))

with open(os.path.join(MODELS_DIR, "feature_order.json")) as f:
    FEATURE_ORDER = json.load(f)

with open(os.path.join(MODELS_DIR, "thresholds.json")) as f:
    THRESHOLDS = json.load(f)
    RF_HIGH = THRESHOLDS["rf_high"]
    RF_LOW = THRESHOLDS["rf_low"]
    ISO_HIGH = THRESHOLDS["iso_high"]

explainer = shap.TreeExplainer(rf_model)
print(f"Models loaded. Thresholds: {THRESHOLDS}")
print(f"Feature order: {FEATURE_ORDER}")


def get_tier(rf_proba, iso_score):
    rf_flag = rf_proba >= RF_HIGH
    iso_flag = iso_score >= ISO_HIGH
    if rf_flag and iso_flag:
        return "auto_block"
    if rf_proba < RF_LOW and iso_score < ISO_HIGH:
        return "auto_approve"
    return "manual_review"


def build_feature_vector(payload):
    row = dict(payload)
    try:
        row["merchant_category_encoded"] = int(
            encoder.transform([row["merchant_category"]])[0]
        )
    except ValueError:
        # Unknown category — fall back to the most common training
        # category rather than hard-failing the whole transaction.
        fallback = encoder.classes_[0]
        row["merchant_category_encoded"] = int(encoder.transform([fallback])[0])
    try:
        vector = [row[feat] for feat in FEATURE_ORDER]
    except KeyError as e:
        raise ValueError(f"Missing required feature: {e}")
    return np.array(vector, dtype=float).reshape(1, -1)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/predict", methods=["POST"])
def predict():
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Expected a JSON body with the 12 feature fields"}), 400

    try:
        X = build_feature_vector(payload)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to encode merchant_category: {e}"}), 400

    rf_proba = float(rf_model.predict_proba(X)[0, 1])
    iso_score = float(-iso_model.decision_function(X)[0])
    tier = get_tier(rf_proba, iso_score)

    # SHAP explanation for this single transaction
    shap_vals = explainer.shap_values(X)
    if isinstance(shap_vals, list):
        row_vals = shap_vals[1][0]
    elif np.array(shap_vals).ndim == 3:
        row_vals = np.array(shap_vals)[0, :, 1]
    else:
        row_vals = shap_vals[0]

    pairs = sorted(zip(FEATURE_ORDER, row_vals), key=lambda x: abs(x[1]), reverse=True)[:3]
    shap_factors = [{"feature": f, "impact": round(float(v), 4)} for f, v in pairs]

    return jsonify({
        "isolation_forest_score": round(iso_score, 4),
        "random_forest_score": round(rf_proba, 4),
        "tier": tier,
        "shap_factors": shap_factors,
    })


if __name__ == "__main__":
    port = int(os.environ.get("FLASK_PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False)