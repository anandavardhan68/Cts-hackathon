"""
prepare_dataset.py

Prepares the Sparkov Credit Card Fraud Detection dataset (Kaggle) for a
fraud-detection model that combines transaction-behavior features with a
synthetic device-graph layer.

This is the FINAL, validated version — includes both fixes found during
review (hop_distance_to_flagged now reachable via the secondary-device
mechanism; fraud-bias now actually flips genuine rows instead of a no-op
multiply on a binary label). Validated on the full 1,852,394-row Sparkov
train+test set: 6,894 rows with hop_distance_to_flagged == 1, 8,537
genuine rows flipped to fraud, final fraud rate ~0.98%.

Usage:
    python prepare_dataset.py \
        --train fraudTrain.csv \
        --test fraudTest.csv \
        --out processed_transactions.csv \
        --encoder encoder.pkl \
        --seed 42

Output columns (in order):
    trans_date_trans_time, amount, hour_of_day, day_of_week,
    merchant_category_encoded, distance_from_last_txn_km, velocity_kmh,
    txn_count_last_1hr, txn_count_last_24hr, amount_deviation_from_user_avg,
    is_new_device_for_user, hop_distance_to_flagged, linked_account_count,
    is_fraud

NOTE: trans_date_trans_time is kept (unlike an earlier draft that dropped
it) specifically so downstream code can do a proper chronological
train/test split. Drop it right before training — the model itself
should only ever see hour_of_day/day_of_week, never a raw date.
"""

import argparse
import sys

import numpy as np
import pandas as pd
import joblib
from sklearn.preprocessing import LabelEncoder


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def haversine_km(lat1, lon1, lat2, lon2):
    """Vectorized Haversine distance in km between two sets of lat/long."""
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2.0) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2.0) ** 2
    c = 2 * np.arcsin(np.sqrt(np.clip(a, 0, 1)))
    r_earth = 6371.0
    return r_earth * c


def load_and_concat(train_path, test_path):
    print(f"Loading train from {train_path} ...")
    train_df = pd.read_csv(train_path)
    print(f"  -> {len(train_df):,} rows")

    print(f"Loading test from {test_path} ...")
    test_df = pd.read_csv(test_path)
    print(f"  -> {len(test_df):,} rows")

    for df in (train_df, test_df):
        unnamed_cols = [c for c in df.columns if c.startswith("Unnamed")]
        if unnamed_cols:
            df.drop(columns=unnamed_cols, inplace=True)

    df = pd.concat([train_df, test_df], ignore_index=True)
    print(f"Concatenated working dataframe: {len(df):,} rows")
    return df


# --------------------------------------------------------------------------
# Step 1 — basic cleaning
# --------------------------------------------------------------------------

def basic_cleaning(df):
    df = df.copy()
    df["trans_date_trans_time"] = pd.to_datetime(df["trans_date_trans_time"])
    df.rename(
        columns={"cc_num": "user_id", "merchant": "merchant_name", "category": "merchant_category"},
        inplace=True,
    )
    df.sort_values(["user_id", "trans_date_trans_time"], inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df


# --------------------------------------------------------------------------
# Step 2 — behavioral features (all leakage-safe: only look backward)
# --------------------------------------------------------------------------

def add_time_features(df):
    df["hour_of_day"] = df["trans_date_trans_time"].dt.hour
    df["day_of_week"] = df["trans_date_trans_time"].dt.dayofweek
    return df


def add_distance_and_velocity(df):
    grp = df.groupby("user_id")
    prev_lat = grp["lat"].shift(1)
    prev_long = grp["long"].shift(1)
    prev_unix = grp["unix_time"].shift(1)

    dist = haversine_km(df["lat"], df["long"], prev_lat, prev_long).fillna(0.0)
    df["distance_from_last_txn_km"] = dist

    hours_elapsed = (df["unix_time"] - prev_unix) / 3600.0
    velocity = (dist / hours_elapsed).replace([np.inf, -np.inf], np.nan).fillna(0.0)
    df["velocity_kmh"] = velocity
    return df


def add_rolling_txn_counts(df):
    df = df.sort_values(["user_id", "trans_date_trans_time"]).copy()

    def rolling_counts(group):
        s = pd.Series(1, index=group["trans_date_trans_time"])
        count_1hr = s.rolling("1h").count().to_numpy() - 1
        count_24hr = s.rolling("24h").count().to_numpy() - 1
        return pd.DataFrame(
            {"txn_count_last_1hr": count_1hr, "txn_count_last_24hr": count_24hr},
            index=group.index,
        )

    rolled = df.groupby("user_id", group_keys=False).apply(rolling_counts)
    df["txn_count_last_1hr"] = rolled["txn_count_last_1hr"].astype(int)
    df["txn_count_last_24hr"] = rolled["txn_count_last_24hr"].astype(int)
    return df


def add_amount_deviation(df):
    df = df.sort_values(["user_id", "trans_date_trans_time"]).copy()
    grp = df.groupby("user_id")["amt"]

    running_mean = grp.apply(lambda s: s.shift(1).expanding().mean()).reset_index(level=0, drop=True)
    running_std = grp.apply(lambda s: s.shift(1).expanding().std()).reset_index(level=0, drop=True)

    deviation = (df["amt"] - running_mean) / running_std
    deviation = deviation.replace([np.inf, -np.inf], np.nan).fillna(0.0)
    df["amount_deviation_from_user_avg"] = deviation
    return df


# --------------------------------------------------------------------------
# Step 3 — synthetic device-graph layer (both bugs fixed, see docstring)
# --------------------------------------------------------------------------

def add_synthetic_device_graph(df, rng, shared_device_frac=0.07,
                                blocklist_frac=0.15, fraud_bias_mult=4.0,
                                secondary_device_frac=0.30,
                                secondary_device_txn_frac=0.5,
                                max_ring_fraud_rate=0.25):
    df = df.copy()
    unique_users = df["user_id"].unique()
    n_users = len(unique_users)

    primary_device_ids = np.array([f"DEV-{i:07d}" for i in range(n_users)])
    user_to_primary_device = dict(zip(unique_users, primary_device_ids))

    n_shared_devices = max(1, int(round(shared_device_frac * n_users)))
    shared_device_pool = rng.choice(primary_device_ids, size=n_shared_devices, replace=False)

    remaining_users = list(unique_users)
    rng.shuffle(remaining_users)
    ring_user_ids = set()
    cursor = 0
    for shared_dev in shared_device_pool:
        ring_size = rng.integers(2, 4)
        if cursor + ring_size > len(remaining_users):
            break
        ring_members = remaining_users[cursor: cursor + ring_size]
        cursor += ring_size
        for u in ring_members:
            user_to_primary_device[u] = shared_dev
            ring_user_ids.add(u)

    # Secondary devices — this is what makes hop-1 actually reachable
    # (see master doc §8, "Bug 1"): a user needs a SECOND device to ever
    # be "one hop from" a blocklisted device without being on it directly.
    ring_user_list = sorted(ring_user_ids, key=str)
    n_secondary = int(round(secondary_device_frac * len(ring_user_list)))
    secondary_users = set(rng.choice(ring_user_list, size=n_secondary, replace=False)) if n_secondary > 0 else set()
    user_to_secondary_device = {u: f"DEV-SEC-{i:07d}" for i, u in enumerate(sorted(secondary_users, key=str))}

    has_secondary = df["user_id"].isin(user_to_secondary_device.keys())
    use_secondary = has_secondary & (rng.random(len(df)) < secondary_device_txn_frac)
    primary_series = df["user_id"].map(user_to_primary_device)
    secondary_series = df["user_id"].map(user_to_secondary_device)
    df["device_id"] = np.where(use_secondary, secondary_series, primary_series)

    df = df.sort_values(["user_id", "trans_date_trans_time"]).copy()
    df["is_new_device_for_user"] = ~df.duplicated(subset=["user_id", "device_id"], keep="first")

    linked_counts = df.groupby("device_id")["user_id"].nunique()
    df["linked_account_count"] = (df["device_id"].map(linked_counts) - 1).clip(lower=0)

    n_blocklisted = max(1, int(round(blocklist_frac * len(shared_device_pool))))
    blocklisted_devices = set(rng.choice(shared_device_pool, size=n_blocklisted, replace=False))
    df["is_blocklisted"] = df["device_id"].isin(blocklisted_devices)

    user_devices = df.groupby("user_id")["device_id"].apply(set)
    users_touching_blocklisted = {u for u, devs in user_devices.items() if devs & blocklisted_devices}

    df["hop_distance_to_flagged"] = np.where(
        df["is_blocklisted"], -1,
        np.where(df["user_id"].isin(users_touching_blocklisted), 1, -1),
    )
    n_hop1 = int((df["hop_distance_to_flagged"] == 1).sum())

    # Fraud-bias — this is Bug 2's fix: flip a flat target fraction of
    # genuine ring-device rows to fraud directly, rather than multiplying
    # an already-binary 0/1 label (which is a no-op on every 0).
    is_ring_txn = df["device_id"].isin(shared_device_pool) | df["device_id"].isin(user_to_secondary_device.values())
    base_fraud_rate = df["is_fraud"].mean()
    target_ring_fraud_rate = min(base_fraud_rate * fraud_bias_mult, max_ring_fraud_rate)

    genuine_ring_idx = df.index[is_ring_txn & (df["is_fraud"] == 0)]
    flip_roll = rng.random(len(genuine_ring_idx))
    flip_mask = flip_roll < target_ring_fraud_rate
    n_flipped = int(flip_mask.sum())
    df.loc[genuine_ring_idx[flip_mask], "is_fraud"] = 1

    print(f"  Synthetic device graph: {n_users:,} users -> {n_users:,} primary devices "
          f"({n_shared_devices:,} shared/ring devices, {len(ring_user_ids):,} users in rings, "
          f"{len(user_to_secondary_device):,} of them also given a secondary device)")
    print(f"  Blocklisted devices: {n_blocklisted:,} / {n_shared_devices:,} ring devices "
          f"-> {n_hop1:,} rows with hop_distance_to_flagged == 1")
    print(f"  Fraud label bias: flipped {n_flipped:,} genuine ring-device txns to fraud "
          f"(target ring fraud rate ~{target_ring_fraud_rate:.2%} vs base {base_fraud_rate:.4%})")

    df.drop(columns=["is_blocklisted"], inplace=True)
    return df


# --------------------------------------------------------------------------
# Step 4 — encode merchant_category
# --------------------------------------------------------------------------

def encode_merchant_category(df, encoder_path):
    n_unique = df["merchant_category"].nunique()
    print(f"  merchant_category cardinality: {n_unique}")
    encoder = LabelEncoder()
    df["merchant_category_encoded"] = encoder.fit_transform(df["merchant_category"].astype(str))
    joblib.dump(encoder, encoder_path)
    print(f"  Saved fitted LabelEncoder -> {encoder_path}")
    return df


# --------------------------------------------------------------------------
# Step 5 — final assembly
# --------------------------------------------------------------------------

FINAL_COLUMNS = [
    "trans_date_trans_time",  # kept for the chronological split; drop before training
    "amount", "hour_of_day", "day_of_week", "merchant_category_encoded",
    "distance_from_last_txn_km", "velocity_kmh",
    "txn_count_last_1hr", "txn_count_last_24hr",
    "amount_deviation_from_user_avg", "is_new_device_for_user",
    "hop_distance_to_flagged", "linked_account_count", "is_fraud",
]


def finalize(df, out_path):
    df = df.rename(columns={"amt": "amount"})

    missing = [c for c in FINAL_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing expected output columns: {missing}")

    final_df = df[FINAL_COLUMNS].copy()
    final_df["is_new_device_for_user"] = final_df["is_new_device_for_user"].astype(int)
    final_df["is_fraud"] = final_df["is_fraud"].astype(int)

    fraud_rate = final_df["is_fraud"].mean() * 100
    print("\n=== Class balance ===")
    print(f"  Fraud:   {fraud_rate:.4f}%  ({final_df['is_fraud'].sum():,} rows)")
    print(f"  Genuine: {100 - fraud_rate:.4f}%  ({(final_df['is_fraud'] == 0).sum():,} rows)")

    nan_counts = final_df.isna().sum()
    nan_counts = nan_counts[nan_counts > 0]
    if len(nan_counts) > 0:
        print("\n=== NaN counts before fill ===")
        for col, cnt in nan_counts.items():
            print(f"  {col}: {cnt:,} NaNs -> filled with 0")
        final_df = final_df.fillna(0)
    else:
        print("\nNo NaNs found in final columns.")

    final_df.to_csv(out_path, index=False)
    print("\n=== Final summary ===")
    print(f"  Rows saved: {len(final_df):,}")
    print(f"  Fraud rate: {fraud_rate:.4f}%")
    print(f"  Output file: {out_path}")
    return final_df


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Prepare Sparkov fraud dataset")
    parser.add_argument("--train", default="fraudTrain.csv")
    parser.add_argument("--test", default="fraudTest.csv")
    parser.add_argument("--out", default="processed_transactions.csv")
    parser.add_argument("--encoder", default="encoder.pkl")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    rng = np.random.default_rng(args.seed)
    df = load_and_concat(args.train, args.test)

    print("\nStep 1: basic cleaning ...")
    df = basic_cleaning(df)

    print("Step 2: behavioral features ...")
    df = add_time_features(df)
    df = add_distance_and_velocity(df)
    df = add_rolling_txn_counts(df)
    df = add_amount_deviation(df)

    print("Step 3: synthetic device-graph layer ...")
    df = add_synthetic_device_graph(df, rng)

    print("Step 4: encoding merchant_category ...")
    df = encode_merchant_category(df, args.encoder)

    print("Step 5: finalizing output ...")
    finalize(df, args.out)


if __name__ == "__main__":
    try:
        main()
    except FileNotFoundError as e:
        print(f"\nERROR: could not find input file: {e}", file=sys.stderr)
        sys.exit(1)