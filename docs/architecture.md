# FDaaS — Architecture

## 1. What we're building

A Fraud Detection as a Service (FDaaS) prototype for the Cognizant (CTS) NPN Hackathon. Problem statement: classify a credit card transaction as genuine or fraudulent using amount, merchant type, location, frequency, and time.

We are **not** building a single binary classifier. We are building:

- A **dual-model** scoring system (unsupervised Isolation Forest + supervised Random Forest) that outputs a **3-tier** result (`auto_approve` / `auto_block` / `manual_review`) based on model agreement, not a single number.
- **SHAP-based explainability** — every score comes with the top reasons behind it.
- A **device/account graph layer** (Neo4j) that catches fraud rings — devices linked across multiple accounts — before those devices are ever individually blocklisted.
- Feature engineering beyond the textbook example: rolling velocity windows, merchant-category deviation, new-device flags.

## 2. Tech stack (locked)

| Layer | Technology | Notes |
|---|---|---|
| API gateway | Node.js + Express | Orchestrates everything, owns Socket.IO |
| Structured storage | PostgreSQL (plain, no PostGIS) | Distance/velocity math happens in application code (Haversine in JS/Python), not in the database |
| Graph/network layer | Neo4j AuraDB | Cloud-hosted, free tier |
| AI scoring | Python + Flask | Loads pre-trained `.pkl` models at startup, never trains at request time |
| Models | scikit-learn `IsolationForest` + `RandomForestClassifier` | Plus SHAP `TreeExplainer` (not `KernelExplainer` — much faster) |
| Frontend | React | 3 panels, Socket.IO client for live updates |
| Real-time transport | Socket.IO | Server push, not client polling |
| Dataset | Sparkov (Kaggle) | Chosen over IEEE-CIS (no location) and ULB/Worldline (PCA-anonymized, kills explainability) |

## 3. The full transaction flow (in exact order)

1. **Simulator** POSTs a transaction to the Node gateway:
   `{ user_id, device_id, amount, merchant_category, timestamp, location: {lat, lng} }`
2. **Node runs two lookups in parallel** (`Promise.all` — never sequential, this was flagged early as a bottleneck risk):
   - **Postgres query** → distance from last transaction (Haversine, computed in app code) + velocity + rolling 1hr/24hr transaction counts + amount deviation from user's historical average
   - **Neo4j query** → is this device directly blocklisted? What's its hop-distance to a blocklisted device via a shared user? How many distinct accounts share this device?
3. Node merges the original transaction + both lookup results into **one 12-feature payload** (see `contracts.md`).
4. Node POSTs this payload to Flask `/predict`.
5. Flask returns `{ isolation_forest_score, random_forest_score, tier, shap_factors }`.
6. Node logs the full result to Postgres (audit trail) and emits it via Socket.IO as event `transaction_result`.
7. React dashboard updates: transaction stream (always), SHAP chart (always), network alert card (only if `linked_account_count > 0` or `hop_distance_to_flagged` is not the "none" sentinel).

## 4. Tier logic

Defined once, in Flask, nowhere else:
- Both scores > 0.7 → `auto_block`
- Both scores < 0.3 → `auto_approve`
- Anything else (including disagreement) → `manual_review`

Thresholds are chosen from an actual precision-recall curve during training, not a guess.

## 5. PostgreSQL

See `schema.sql` for the `transactions` table. Queries needed: last transaction per user (for Haversine in app code), rolling 1hr/24hr counts, historical avg/stddev amount per user — all filtered to `txn_timestamp < current` to avoid leakage.

## 6. Neo4j graph

**Nodes:** `(:User {id})`, `(:Device {hash, is_blocklisted})`, `(:Merchant {id})`
**Relationships:** `(User)-[:USED]->(Device)`, `(User)-[:TRANSACTED_AT]->(Merchant)`

Device identifiers are always stored as an **HMAC-SHA256 hash**, never the raw device ID — a deliberate privacy design choice (pseudonymization, not a formal ZK-proof-level guarantee).

**Important conceptual point:** hop-distance is meaningful only when a device is genuinely *shared* across users. If synthetic data assigns exactly one device per user, hop-distance traversal will never find anything. See `graph/queries/cypherQueries.md` for the traversal pattern that finds hop-1 risk.

## 7. Dataset preparation

Base dataset: Sparkov (`fraudTrain.csv` + `fraudTest.csv`). `prepare_dataset.py`:
- Cleans and renames Sparkov columns (`cc_num` → `user_id`, etc.)
- Derives 9 real features from Sparkov data: `hour_of_day`, `day_of_week`, `distance_from_last_txn_km`, `velocity_kmh`, `txn_count_last_1hr`, `txn_count_last_24hr`, `amount_deviation_from_user_avg` (all leakage-safe — computed only from prior transactions per user)
- Adds a **synthetic device-graph layer** on top (Sparkov has no real device data): assigns synthetic `device_id`s, deliberately shares ~7% of devices across 2–3 users each to simulate fraud rings, marks ~15% of shared devices as blocklisted
- Outputs `processed_transactions.csv` with the exact 12 model columns + `is_fraud` label, plus a saved `LabelEncoder` (`encoder.pkl`) for `merchant_category`

### Known bugs fixed before training

1. **`hop_distance_to_flagged` was always the "no path" constant.** Root cause: assigning each user exactly one device means they can never be "hop-1 via a shared device" without being directly on that device (already caught by the blocklist check). Fix: track ring membership as a proper group, so users in the same ring who don't personally use the blocklisted device still register as hop-1.
2. **The fraud-bias step flipped zero rows.** Root cause: it multiplied the binary `is_fraud` value (0 or 1) by a bias factor instead of working with a real probability — `0 × anything = 0`, so the "boost" never did anything. Fix: flip a flat target percentage of genuine ring-device transactions to fraud directly.

Before training: sanity-check the correlation (or a groupby comparison) between `linked_account_count` / `hop_distance_to_flagged` and `is_fraud` in the processed CSV. If it's ~0, the bugs above are still present.

## 8. Model training requirements

- Report **precision, recall, F1, and PR-AUC** — never accuracy alone (fraud is a rare-class problem; accuracy is misleadingly high even for a useless model).
- Handle class imbalance explicitly: `class_weight='balanced'` on Random Forest as a baseline, SMOTE on the **training set only** (after the split, never before) if needed.
- Use a stratified or time-based train/test split — never purely random in a way that breaks the temporal/leakage assumptions already built into the features.
- Tune `contamination` on Isolation Forest to match the real fraud rate, not the default.
- Use `RandomizedSearchCV` for Random Forest hyperparameters, not just defaults.
- Pick the 0.7/0.3 tier thresholds using an actual precision-recall curve, not a guess.

## 9. Frontend behavior

The network alert card (Panel C) is **conditional**, not always-visible — it only renders when the current transaction's features show `linked_account_count > 0` or a real hop-distance value. `react-force-graph-2d` (a live animated graph) was evaluated and rejected as too high-risk/high-effort for a 5–6 day build; a simple text alert card was chosen instead. A static `vis-network` render (physics disabled) is an optional stretch addition only if time allows.

## 10. What NOT to do

- Don't reintroduce MongoDB — Postgres is final.
- Don't run distance calculations inside the database — always application code.
- Don't use `react-force-graph-2d` — it was deliberately cut.
- Don't let Flask retrain models per-request — models are pre-trained and loaded once at startup.
- Don't rename any field in the contracts without updating `contracts.md` and telling the team — every service depends on these exact names matching.
