// Seeds Postgres with ~50 synthetic users and ~500 transactions so the
// gateway/Postgres slice can be developed and tested end-to-end before
// the ML dev's real Sparkov-derived dataset exists. NOT the training
// data for the models — that's ml-service/prepare_dataset.py's job.
//
// Run: npm run seed   (or: node seed/seedTransactions.js)

const pool = require('../src/db/pool');

const NUM_USERS = 50;
const TXNS_PER_USER_MIN = 6;
const TXNS_PER_USER_MAX = 14; // -> roughly 500 total transactions
const DAYS_OF_HISTORY = 30;

const MERCHANT_CATEGORIES = [
  'electronics', 'grocery', 'travel', 'dining', 'fuel',
  'entertainment', 'apparel', 'health', 'utilities', 'online_retail',
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max, decimals = 2) {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

// Rough lat/lng boxes for a handful of Indian metros, to give the
// distance/velocity features realistic-looking variation without needing
// a geocoding dependency.
const CITY_CENTERS = [
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
];

function jitterAround(center, spreadDeg = 0.08) {
  return {
    lat: Number((center.lat + (Math.random() - 0.5) * spreadDeg).toFixed(6)),
    lng: Number((center.lng + (Math.random() - 0.5) * spreadDeg).toFixed(6)),
  };
}

function buildUser(index) {
  const userId = `user_${String(index).padStart(3, '0')}`;
  const homeCity = pick(CITY_CENTERS);
  // 1-3 devices per user; device_id itself is plain here (Postgres does
  // NOT hash it — that HMAC-SHA256 hashing is Neo4j-side per §6).
  const deviceCount = randInt(1, 3);
  const devices = Array.from(
    { length: deviceCount },
    (_, i) => `device_${userId}_${i}`
  );
  const avgAmount = randFloat(300, 8000, 2);
  return { userId, homeCity, devices, avgAmount };
}

function buildTransactionsForUser(user) {
  const count = randInt(TXNS_PER_USER_MIN, TXNS_PER_USER_MAX);
  const now = Date.now();
  const txns = [];

  // Build timestamps first, oldest -> newest, spread across the history window.
  const timestamps = Array.from({ length: count }, () => {
    const msAgo = randInt(0, DAYS_OF_HISTORY * 24 * 60 * 60 * 1000);
    return new Date(now - msAgo);
  }).sort((a, b) => a - b);

  for (const ts of timestamps) {
    // ~85% of transactions happen near home; the rest simulate travel /
    // anomalies so distance & velocity features have real variance.
    const isTravel = Math.random() < 0.15;
    const location = isTravel
      ? jitterAround(pick(CITY_CENTERS), 0.15)
      : jitterAround(user.homeCity, 0.06);

    const amount = Math.random() < 0.08
      ? randFloat(user.avgAmount * 4, user.avgAmount * 9, 2)  // rare spike
      : randFloat(user.avgAmount * 0.3, user.avgAmount * 1.6, 2);

    txns.push({
      userId: user.userId,
      deviceId: pick(user.devices),
      amount,
      merchantCategory: pick(MERCHANT_CATEGORIES),
      txnTimestamp: ts,
      lat: location.lat,
      lng: location.lng,
      // Simple heuristic label just for local UI testing — the ML dev's
      // prepare_dataset.py labels are the ones that actually matter.
      isFraud: isTravel && amount > user.avgAmount * 3,
    });
  }
  return txns;
}

async function seed() {
  const client = await pool.connect();
  try {
    console.log(`Seeding ${NUM_USERS} users...`);
    const users = Array.from({ length: NUM_USERS }, (_, i) => buildUser(i + 1));

    let inserted = 0;
    await client.query('BEGIN');

    for (const user of users) {
      const txns = buildTransactionsForUser(user);
      for (const t of txns) {
        await client.query(
          `INSERT INTO transactions
             (user_id, device_id, amount, merchant_category, txn_timestamp, lat, lng, is_fraud)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [t.userId, t.deviceId, t.amount, t.merchantCategory, t.txnTimestamp, t.lat, t.lng, t.isFraud]
        );
        inserted += 1;
      }
    }

    await client.query('COMMIT');
    console.log(`Done. Inserted ${inserted} transactions across ${users.length} users.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed, rolled back:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
