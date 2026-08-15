// postgresService.js
//
// Owns every SQL query the gateway needs. Called from evaluateRisk.js as
// one leg of the Promise.all() alongside neo4jService's getGraphFeatures().
//
// LEAKAGE RULE (locked, §5): every query here filters to
// txn_timestamp < currentTxnTimestamp. We are always asking "what did we
// know about this user BEFORE this transaction happened" — never include
// the transaction being scored right now, and never look into the future.

const pool = require('../db/pool');
const { haversineDistanceKm, velocityKmh } = require('../utils/haversine');

/**
 * Last transaction this user made strictly before the current one.
 * Used for Haversine distance + implied velocity in app code.
 */
async function getLastTransaction(userId, currentTxnTimestamp) {
  const { rows } = await pool.query(
    `SELECT lat, lng, txn_timestamp
       FROM transactions
      WHERE user_id = $1
        AND txn_timestamp < $2
      ORDER BY txn_timestamp DESC
      LIMIT 1`,
    [userId, currentTxnTimestamp]
  );
  return rows[0] || null;
}

/**
 * Rolling 1hr / 24hr transaction counts, ending at the current transaction.
 * Single scan, both windows via FILTER — cheaper than two separate queries.
 */
async function getRollingCounts(userId, currentTxnTimestamp) {
  const { rows } = await pool.query(
    `SELECT
        COUNT(*) FILTER (
          WHERE txn_timestamp >= $2::timestamptz - INTERVAL '1 hour'
        ) AS txn_count_last_1hr,
        COUNT(*) FILTER (
          WHERE txn_timestamp >= $2::timestamptz - INTERVAL '24 hours'
        ) AS txn_count_last_24hr
     FROM transactions
     WHERE user_id = $1
       AND txn_timestamp < $2`,
    [userId, currentTxnTimestamp]
  );
  return {
    txn_count_last_1hr: Number(rows[0].txn_count_last_1hr),
    txn_count_last_24hr: Number(rows[0].txn_count_last_24hr),
  };
}

/**
 * Historical average + stddev of this user's transaction amounts,
 * used to compute amount_deviation_from_user_avg.
 */
async function getUserAmountStats(userId, currentTxnTimestamp) {
  const { rows } = await pool.query(
    `SELECT
        COALESCE(AVG(amount), 0)    AS avg_amount,
        COALESCE(STDDEV(amount), 0) AS stddev_amount
     FROM transactions
     WHERE user_id = $1
       AND txn_timestamp < $2`,
    [userId, currentTxnTimestamp]
  );
  return {
    avg_amount: Number(rows[0].avg_amount),
    stddev_amount: Number(rows[0].stddev_amount),
  };
}

/**
 * Has this user ever transacted from this device before?
 */
async function isNewDeviceForUser(userId, deviceId, currentTxnTimestamp) {
  const { rows } = await pool.query(
    `SELECT NOT EXISTS (
        SELECT 1 FROM transactions
         WHERE user_id = $1
           AND device_id = $2
           AND txn_timestamp < $3
     ) AS is_new_device`,
    [userId, deviceId, currentTxnTimestamp]
  );
  return rows[0].is_new_device;
}

/**
 * The one function evaluateRisk.js actually calls. Runs every lookup
 * above in parallel (Promise.all — never sequential, per §3 step 2),
 * then does the Haversine/velocity/deviation math in app code, and
 * returns the 7 Postgres-derived fields of the 12-feature payload.
 */
async function getVelocityFeatures({ userId, deviceId, amount, txnTimestamp, lat, lng }) {
  const [lastTxn, rollingCounts, amountStats, isNewDevice] = await Promise.all([
    getLastTransaction(userId, txnTimestamp),
    getRollingCounts(userId, txnTimestamp),
    getUserAmountStats(userId, txnTimestamp),
    isNewDeviceForUser(userId, deviceId, txnTimestamp),
  ]);

  let distanceFromLastTxnKm = 0;
  let velocityKmhValue = 0;
  if (lastTxn) {
    distanceFromLastTxnKm = haversineDistanceKm(lastTxn.lat, lastTxn.lng, lat, lng);
    velocityKmhValue = velocityKmh(distanceFromLastTxnKm, lastTxn.txn_timestamp, txnTimestamp);
  }

  const { avg_amount, stddev_amount } = amountStats;
  // Deviation in "number of stddevs from this user's average" — 0 stddev
  // history (new user / one prior txn) falls back to a raw ratio so it
  // doesn't divide by zero.
  const amountDeviationFromUserAvg =
    stddev_amount > 0
      ? (amount - avg_amount) / stddev_amount
      : avg_amount > 0
      ? amount / avg_amount
      : 0;

  return {
    distance_from_last_txn_km: Number(distanceFromLastTxnKm.toFixed(2)),
    velocity_kmh: Number.isFinite(velocityKmhValue) ? Number(velocityKmhValue.toFixed(2)) : 999999,
    txn_count_last_1hr: rollingCounts.txn_count_last_1hr,
    txn_count_last_24hr: rollingCounts.txn_count_last_24hr,
    amount_deviation_from_user_avg: Number(amountDeviationFromUserAvg.toFixed(2)),
    is_new_device_for_user: isNewDevice,
  };
}

/**
 * Insert the raw transaction row. Called first, before scoring, so we
 * have a transaction_id to attach the audit row to in logScoredResult().
 */
async function insertTransaction({ userId, deviceId, amount, merchantCategory, txnTimestamp, lat, lng }) {
  const { rows } = await pool.query(
    `INSERT INTO transactions
       (user_id, device_id, amount, merchant_category, txn_timestamp, lat, lng)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [userId, deviceId, amount, merchantCategory, txnTimestamp, lat, lng]
  );
  return rows[0].id;
}

/**
 * §3 step 6 — "Node logs the full result to Postgres (audit trail)".
 * Called after Flask returns its /predict response.
 */
async function logScoredResult(transactionId, flaskResponse, graphFeatures = {}) {
  const { isolation_forest_score, random_forest_score, tier, shap_factors } = flaskResponse;
  const { linked_account_count = 0, hop_distance_to_flagged = null } = graphFeatures;

  await pool.query(
    `INSERT INTO scored_transactions
       (transaction_id, isolation_forest_score, random_forest_score, tier,
        shap_factors, linked_account_count, hop_distance_to_flagged)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      transactionId,
      isolation_forest_score,
      random_forest_score,
      tier,
      JSON.stringify(shap_factors || []),
      linked_account_count,
      hop_distance_to_flagged,
    ]
  );
}

module.exports = {
  getVelocityFeatures,
  insertTransaction,
  logScoredResult,
};
