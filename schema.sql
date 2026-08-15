CREATE TABLE IF NOT EXISTS transactions (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             VARCHAR(64) NOT NULL,
    device_id           VARCHAR(128) NOT NULL,
    amount              NUMERIC(12,2) NOT NULL,
    merchant_category   VARCHAR(64) NOT NULL,
    txn_timestamp       TIMESTAMPTZ NOT NULL,
    lat                 DOUBLE PRECISION NOT NULL,
    lng                 DOUBLE PRECISION NOT NULL,
    is_fraud            BOOLEAN,
    created_at          TIMESTAMPTZ DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_txn_user_time ON transactions (user_id, txn_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_txn_user_device ON transactions (user_id, device_id);


CREATE TABLE IF NOT EXISTS scored_transactions (
    id                          BIGSERIAL PRIMARY KEY,
    transaction_id              BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    isolation_forest_score      NUMERIC(6,4) NOT NULL,
    random_forest_score         NUMERIC(6,4) NOT NULL,
    tier                        VARCHAR(20)  NOT NULL CHECK (tier IN ('auto_approve', 'auto_block', 'manual_review')),
    shap_factors                JSONB,
    linked_account_count        INTEGER DEFAULT 0,
    hop_distance_to_flagged     INTEGER,
    scored_at                   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scored_txn_tier ON scored_transactions (tier);
CREATE INDEX IF NOT EXISTS idx_scored_txn_txn_id ON scored_transactions (transaction_id);
