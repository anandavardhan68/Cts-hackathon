const express = require('express');
const router = express.Router();

const postgresService = require('../services/postgresService');
const neo4jService = require('../services/neo4jService');
const flaskClient = require('../services/flaskClient');
const { haversineKm, velocityKmh } = require('../utils/haversine');

/**
 * POST /api/v1/evaluate-risk
 *
 * Body (locked contract — docs/architecture.md §3 step 1):
 *   { user_id, device_id, amount, merchant_category, timestamp, location: { lat, lng } }
 *
 * Implements the full flow from §3:
 *   1. validate the incoming transaction
 *   2. Postgres + Neo4j lookups in parallel (Promise.all — never sequential)
 *   3. merge into the locked 12-feature payload (§4)
 *   4/5. POST to Flask /predict, get back the scored result
 *   6. log transaction + scored result to Postgres (audit trail), emit Socket.IO
 */
router.post('/evaluate-risk', async (req, res) => {
  const { user_id, device_id, amount, merchant_category, timestamp, location } = req.body;

  if (
    !user_id ||
    !device_id ||
    typeof amount !== 'number' ||
    !merchant_category ||
    !timestamp ||
    !location ||
    typeof location.lat !== 'number' ||
    typeof location.lng !== 'number'
  ) {
    return res.status(400).json({
      error:
        'Expected { user_id, device_id, amount, merchant_category, timestamp, location: { lat, lng } }',
    });
  }

  const txnTimestamp = new Date(timestamp);
  if (Number.isNaN(txnTimestamp.getTime())) {
    return res.status(400).json({ error: 'timestamp is not a valid date' });
  }

  try {
    // ---- Step 2: parallel lookups -----------------------------------
    const [velocity, graph] = await Promise.all([
      postgresService.getVelocityFeatures(user_id, txnTimestamp),
      neo4jService.getGraphFeatures(device_id, user_id),
    ]);

    // ---- Distance / velocity (application code, no PostGIS) ---------
    let distanceFromLastTxnKm = 0;
    let velocityKmhValue = 0;
    if (velocity.lastTransaction) {
      distanceFromLastTxnKm = haversineKm(
        location.lat,
        location.lng,
        velocity.lastTransaction.lat,
        velocity.lastTransaction.lng
      );
      velocityKmhValue = velocityKmh(
        distanceFromLastTxnKm,
        velocity.lastTransaction.txnTimestamp,
        txnTimestamp
      );
    }

    // ---- Amount deviation z-score, matching prepare_dataset.py ------
    const amountDeviationFromUserAvg =
      velocity.userStdDevAmount && velocity.userStdDevAmount > 0
        ? (amount - velocity.userAvgAmount) / velocity.userStdDevAmount
        : 0;

    // ---- hour_of_day / day_of_week, matching prepare_dataset.py -----
    // pandas .dt.dayofweek is Monday=0..Sunday=6; JS getUTCDay() is
    // Sunday=0..Saturday=6. Convert so train/inference agree.
    const hourOfDay = txnTimestamp.getUTCHours();
    const dayOfWeek = (txnTimestamp.getUTCDay() + 6) % 7;

    // ---- Step 3: the locked 12-feature payload (§4) ------------------
    const features = {
      amount,
      hour_of_day: hourOfDay,
      day_of_week: dayOfWeek,
      merchant_category,
      distance_from_last_txn_km: Number(distanceFromLastTxnKm.toFixed(3)),
      velocity_kmh: Number(velocityKmhValue.toFixed(3)),
      txn_count_last_1hr: velocity.txnCountLast1hr,
      txn_count_last_24hr: velocity.txnCountLast24hr,
      amount_deviation_from_user_avg: Number(amountDeviationFromUserAvg.toFixed(3)),
      is_new_device_for_user: graph.isNewDeviceForUser,
      hop_distance_to_flagged: graph.hopDistanceToFlagged,
      linked_account_count: graph.linkedAccountCount,
    };

    // ---- Step 4/5: score it -------------------------------------------
    const result = await flaskClient.predict(features);

    // ---- Step 6: audit trail -------------------------------------------
    const transactionId = await postgresService.insertTransaction({
      userId: user_id,
      deviceId: device_id,
      amount,
      merchantCategory: merchant_category,
      txnTimestamp,
      lat: location.lat,
      lng: location.lng,
    });

    await postgresService.logScoredResult({
      transactionId,
      isolationForestScore: result.isolation_forest_score,
      randomForestScore: result.random_forest_score,
      tier: result.tier,
      shapFactors: result.shap_factors,
      linkedAccountCount: graph.linkedAccountCount,
      hopDistanceToFlagged: graph.hopDistanceToFlagged,
    });

    // ---- Step 6 (continued): push to the frontend ----------------------
    const payload = {
      transaction: req.body,
      features,
      result,
    };
    req.app.get('io').emit('transaction_result', payload);

    return res.status(200).json(payload);
  } catch (err) {
    console.error('[evaluateRisk] failed:', err);
    return res
      .status(502)
      .json({ error: 'Failed to evaluate transaction risk', detail: err.message });
  }
});

module.exports = router;
