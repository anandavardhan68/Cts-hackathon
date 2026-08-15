const axios = require('axios');

const FLASK_URL = process.env.FLASK_URL || 'http://localhost:5001';

/**
 * POST the locked 12-feature payload to Flask and return its scored result.
 * Field names on both sides are final per docs/architecture.md §4 —
 * don't rename anything here without updating that doc and the team.
 */
async function predict(features) {
  const { data } = await axios.post(`${FLASK_URL}/predict`, features, {
    timeout: 5000,
    headers: { 'Content-Type': 'application/json' },
  });
  // { isolation_forest_score, random_forest_score, tier, shap_factors }
  return data;
}

module.exports = { predict };
