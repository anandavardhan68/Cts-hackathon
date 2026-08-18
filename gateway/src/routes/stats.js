const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

/**
 * GET /api/v1/stats
 *
 * Powers the top-level metrics bar and the "elevated risk accounts" list.
 * No ML involved — pure aggregation over scored_transactions, which is
 * why this lives entirely in the gateway with no Flask round-trip.
 */
router.get('/stats', async (req, res) => {
  try {
    const totals = await pool.query(`
      SELECT
        COUNT(*) AS total_scanned,
        COUNT(*) FILTER (WHERE tier = 'auto_approve') AS approved,
        COUNT(*) FILTER (WHERE tier = 'auto_block') AS blocked,
        COUNT(*) FILTER (WHERE tier = 'manual_review') AS review
      FROM scored_transactions
    `);

    const row = totals.rows[0];
    const total = parseInt(row.total_scanned, 10) || 0;

    // Elevated-risk accounts: users with 3+ manual_review transactions.
    // This is the "yellow pile up" escalation you asked for — a plain
    // aggregation query, no new ML tier, no threshold change needed.
    const elevated = await pool.query(`
      SELECT t.user_id, COUNT(*) AS review_count
      FROM scored_transactions st
      JOIN transactions t ON t.id = st.transaction_id
      WHERE st.tier = 'manual_review'
      GROUP BY t.user_id
      HAVING COUNT(*) >= 3
      ORDER BY review_count DESC
      LIMIT 20
    `);

    res.json({
      total_scanned: total,
      approved_pct: total ? +(100 * row.approved / total).toFixed(2) : 0,
      blocked_pct: total ? +(100 * row.blocked / total).toFixed(2) : 0,
      review_pct: total ? +(100 * row.review / total).toFixed(2) : 0,
      counts: {
        auto_approve: parseInt(row.approved, 10) || 0,
        auto_block: parseInt(row.blocked, 10) || 0,
        manual_review: parseInt(row.review, 10) || 0,
      },
      elevated_risk_accounts: elevated.rows.map((r) => ({
        user_id: r.user_id,
        review_count: parseInt(r.review_count, 10),
      })),
    });
  } catch (err) {
    console.error('[stats] failed:', err);
    res.status(500).json({ error: 'Failed to compute stats' });
  }
});

module.exports = router;
