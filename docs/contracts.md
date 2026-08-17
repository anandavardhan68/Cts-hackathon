# FDaaS — Service Contracts

**Every field name below is final.** If a name needs to change, edit this file first and tell the team — every service depends on these exact names matching.

## Simulator → Gateway

`POST /api/v1/evaluate-risk`

```json
{
  "user_id": "u_1042",
  "device_id": "dev_88a1",
  "amount": 50000,
  "merchant_category": "electronics",
  "timestamp": "2026-08-17T02:14:00Z",
  "location": { "lat": 17.385, "lng": 78.4867 }
}
```

## Gateway → ML service

`POST /predict`

```json
{
  "amount": 50000,
  "hour_of_day": 2,
  "day_of_week": 5,
  "merchant_category": "electronics",
  "distance_from_last_txn_km": 6200,
  "velocity_kmh": 4100,
  "txn_count_last_1hr": 1,
  "txn_count_last_24hr": 3,
  "amount_deviation_from_user_avg": 8.2,
  "is_new_device_for_user": true,
  "hop_distance_to_flagged": 1,
  "linked_account_count": 3
}
```

12 features, exact order/names as above. `distance_from_last_txn_km` and `velocity_kmh` are computed in application code (Haversine), not in Postgres.

## ML service → Gateway

Response from `/predict`:

```json
{
  "isolation_forest_score": 0.91,
  "random_forest_score": 0.88,
  "tier": "auto_block",
  "shap_factors": [
    { "feature": "hour_of_day", "impact": 0.40 },
    { "feature": "distance_from_last_txn_km", "impact": 0.33 }
  ]
}
```

**Tier logic (defined once, in Flask, nowhere else):**
- Both scores > 0.7 → `auto_block`
- Both scores < 0.3 → `auto_approve`
- Anything else (including disagreement) → `manual_review`

## Gateway → Frontend

Socket.IO event `transaction_result`:

```json
{
  "transaction": { "...original request fields..." },
  "features": { "...the 12-feature payload above..." },
  "result": { "...the ML service response above..." }
}
```

Frontend behavior on receipt:
- **Transaction Stream (Panel A)** — always updates
- **SHAP Chart (Panel B)** — always updates
- **Network Alert Card (Panel C)** — only renders if `linked_account_count > 0` or `hop_distance_to_flagged` is not the "none" sentinel

## PostgreSQL schema

```sql
CREATE TABLE transactions (
    id                BIGSERIAL PRIMARY KEY,
    user_id           VARCHAR(64) NOT NULL,
    device_id         VARCHAR(128) NOT NULL,
    amount            NUMERIC(12,2) NOT NULL,
    merchant_category VARCHAR(64) NOT NULL,
    txn_timestamp     TIMESTAMPTZ NOT NULL,
    lat               DOUBLE PRECISION NOT NULL,
    lng               DOUBLE PRECISION NOT NULL,
    is_fraud          BOOLEAN,
    created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_txn_user_time ON transactions (user_id, txn_timestamp DESC);
```

Queries needed: last transaction per user (for Haversine in app code), rolling 1hr/24hr counts (`COUNT(*) FILTER (WHERE ...)`), historical avg/stddev amount per user — all filtered to `txn_timestamp < current` to avoid leakage.

> The exact query text for these was worked out separately and isn't captured in this file yet — see `gateway/src/services/postgresService.js` for the source of truth, or ask the Lead Architect to reproduce it here.

## Neo4j graph schema

**Nodes:** `(:User {id})`, `(:Device {hash, is_blocklisted})`, `(:Merchant {id})`
**Relationships:** `(User)-[:USED]->(Device)`, `(User)-[:TRANSACTED_AT]->(Merchant)`

Device identifiers are always stored as an HMAC-SHA256 hash, never the raw device ID.

See `graph/queries/cypherQueries.md` for the query set.
