const express = require('express');
const router = express.Router();

const postgresService = require('../services/postgresService');
const neo4jService = require('../services/neo4jService');
const flaskClient = require('../services/flaskClient');

/**
 * POST /api/v1/evaluate-risk
 *
 * Body (locked contract — docs/architecture.md §3 step 1):
 *   { user_id, device_id, amount, merchant_category, timestamp, location: { lat, lng } }
 *
 * NOTE: postgresService.getVelocityFeatures() already computes distance,
 * velocity, and amount deviation internally (see that file's own header
 * comment) — this route does NOT redo any of that math, it only calls
 * the service and reads its return values directly.
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
      postgresService.getVelocityFeatures({
        userId: user_id,
        deviceId: device_id,
        amount,
        txnTimestamp,
        lat: location.lat,
        lng: location.lng,
      }),
      neo4jService.getGraphFeatures(device_id, user_id),
    ]);

    // ---- hour_of_day / day_of_week -----------------------------------
    // pandas .dt.dayofweek is Monday=0..Sunday=6; JS getUTCDay() is
    // Sunday=0..Saturday=6 — convert so train/inference agree exactly.
    const hourOfDay = txnTimestamp.getUTCHours();
    const dayOfWeek = (txnTimestamp.getUTCDay() + 6) % 7;

    // ---- Step 3: the locked 12-feature payload -----------------------
    const features = {
      amount,
      hour_of_day: hourOfDay,
      day_of_week: dayOfWeek,
      merchant_category,
      distance_from_last_txn_km: velocity.distance_from_last_txn_km,
      velocity_kmh: velocity.velocity_kmh,
      txn_count_last_1hr: velocity.txn_count_last_1hr,
      txn_count_last_24hr: velocity.txn_count_last_24hr,
      amount_deviation_from_user_avg: velocity.amount_deviation_from_user_avg,
      is_new_device_for_user: velocity.is_new_device_for_user,
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

    await postgresService.logScoredResult(transactionId, result, {
      linked_account_count: graph.linkedAccountCount,
      hop_distance_to_flagged: graph.hopDistanceToFlagged,
    });

    // ---- Step 6 (continued): push to the frontend ----------------------
    const payload = {
      transaction: req.body,
      features,
      result,
    };
    //req.app.get('io').emit('transaction_result', payload);
    req.app.get('io').emit('transaction:scored', payload);
    return res.status(200).json(payload);
  } catch (err) {
    console.error('[evaluateRisk] failed:', err);
    return res
      .status(502)
      .json({ error: 'Failed to evaluate transaction risk', detail: err.message });
  }
});

module.exports = router;