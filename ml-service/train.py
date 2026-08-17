"""
train.py

Reproduces the validated training run from the team's Colab session:
  1. Chronological train/test split (last ~20% by time -> test)
  2. Tuned Random Forest (max_depth=30, min_samples_leaf=5, class_weight=balanced)
  3. Isolation Forest (contamination = train fraud rate)
  4. Combined 3-tier evaluation
  5. Saves everything ml-service/app.py needs to models/

Locked, validated results from the team's run (Sparkov, 1.85M rows):
  auto_block:    precision 86.06%  (416 txns)
  auto_approve:  fraud rate  0.50% (364,697 txns)
  manual_review: fraud rate 16.34% (5,366 txns)
  Total recall (auto_block + manual_review): 40.3%

Usage:
    python train.py --data processed_transactions.csv --out-dir models/
"""

import argparse
import json
import os

import joblib
import numpy as np
import pandas as pd
import shap
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.metrics import classification_report

RF_HIGH, RF_LOW, ISO_HIGH = 0.5, 0.10, 0.02


def chronological_split(df, test_frac=0.2):
    df = df.sort_values("trans_date_trans_time").reset_index(drop=True)
    cutoff_index = int(len(df) * (1 - test_frac))
    cutoff_date = df.iloc[cutoff_index]["trans_date_trans_time"]

    train_df = df[df["trans_date_trans_time"] < cutoff_date].copy()
    test_df = df[df["trans_date_trans_time"] >= cutoff_date].copy()

    print(f"Cutoff date: {cutoff_date}")
    print(f"Train: {len(train_df):,} rows, fraud rate {train_df['is_fraud'].mean():.4%}")
    print(f"Test:  {len(test_df):,} rows, fraud rate {test_df['is_fraud'].mean():.4%}")

    train_df = train_df.drop(columns=["trans_date_trans_time"])
    test_df = test_df.drop(columns=["trans_date_trans_time"])
    return train_df, test_df


def get_tier(rf_p, iso_s):
    rf_flag = rf_p >= RF_HIGH
    iso_flag = iso_s >= ISO_HIGH
    if rf_flag and iso_flag:
        return "auto_block"
    if rf_p < RF_LOW and iso_s < ISO_HIGH:
        return "auto_approve"
    return "manual_review"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="processed_transactions.csv",
                         help="Output of prepare_dataset.py (must still have trans_date_trans_time)")
    parser.add_argument("--out-dir", default="models")
    args = parser.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)

    print("1/6 Loading and splitting data chronologically...")
    df = pd.read_csv(args.data)
    df["trans_date_trans_time"] = pd.to_datetime(df["trans_date_trans_time"])
    train_df, test_df = chronological_split(df)

    X_train = train_df.drop(columns=["is_fraud"])
    y_train = train_df["is_fraud"]
    X_test = test_df.drop(columns=["is_fraud"])
    y_test = test_df["is_fraud"]
    FEATURE_ORDER = list(X_train.columns)

    print("\n2/6 Training tuned Random Forest...")
    rf_model = RandomForestClassifier(
        n_estimators=100, max_depth=30, min_samples_leaf=5,
        class_weight="balanced", random_state=42, n_jobs=-1
    )
    rf_model.fit(X_train, y_train)
    rf_proba_test = rf_model.predict_proba(X_test)[:, 1]
    print(classification_report(y_test, (rf_proba_test >= RF_HIGH).astype(int), digits=4))

    print("3/6 Training Isolation Forest...")
    iso_model = IsolationForest(
        n_estimators=100, contamination=y_train.mean(), random_state=42, n_jobs=-1
    )
    iso_model.fit(X_train)
    iso_scores_test = -iso_model.decision_function(X_test)

    print("\n4/6 Evaluating combined 3-tier system...")
    tiers = [get_tier(rf_proba_test[i], iso_scores_test[i]) for i in range(len(y_test))]
    tier_result = pd.DataFrame({"tier": tiers, "is_fraud": y_test.values})
    print(tier_result.groupby("tier")["is_fraud"].agg(["count", "sum", "mean"]))
    total_caught = tier_result[tier_result["tier"] != "auto_approve"]["is_fraud"].sum()
    print(f"Total fraud surfaced: {total_caught}/{y_test.sum()} ({total_caught / y_test.sum():.1%} recall)")

    print("\n5/6 Verifying SHAP explainability...")
    explainer = shap.TreeExplainer(rf_model)
    fraud_idx = y_test[y_test == 1].index[0]
    row = X_test.loc[[fraud_idx]]
    shap_vals = explainer.shap_values(row)
    if isinstance(shap_vals, list):
        row_vals = shap_vals[1][0]
    elif np.array(shap_vals).ndim == 3:
        row_vals = np.array(shap_vals)[0, :, 1]
    else:
        row_vals = shap_vals[0]
    pairs = sorted(zip(row.columns, row_vals), key=lambda x: abs(x[1]), reverse=True)[:3]
    print("Sample explanation:", [{"feature": f, "impact": round(float(v), 4)} for f, v in pairs])

    print("\n6/6 Saving artifacts...")
    joblib.dump(rf_model, os.path.join(args.out_dir, "random_forest.pkl"))
    joblib.dump(iso_model, os.path.join(args.out_dir, "isolation_forest.pkl"))
    with open(os.path.join(args.out_dir, "feature_order.json"), "w") as f:
        json.dump(FEATURE_ORDER, f)
    with open(os.path.join(args.out_dir, "thresholds.json"), "w") as f:
        json.dump({"rf_high": RF_HIGH, "rf_low": RF_LOW, "iso_high": ISO_HIGH}, f)

    print(f"\nDONE. Saved random_forest.pkl, isolation_forest.pkl, feature_order.json, "
          f"thresholds.json to {args.out_dir}")
    print("(encoder.pkl from prepare_dataset.py must also be copied into this same folder)")


if __name__ == "__main__":
    main()