require('dotenv').config();
const crypto = require('crypto');
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

const HASH_SECRET = process.env.DEVICE_HASH_SECRET;
if (!HASH_SECRET) {
  console.error('DEVICE_HASH_SECRET is not set (check graph/.env) — refusing to seed with an empty hashing key.');
  process.exit(1);
}

/**
 * Same HMAC-SHA256 scheme gateway/src/services/neo4jService.js uses at
 * query time. DEVICE_HASH_SECRET must be IDENTICAL in graph/.env and
 * gateway/.env or nothing seeded here will ever match a lookup.
 */
function hashDeviceId(rawId) {
  return crypto.createHmac('sha256', HASH_SECRET).update(rawId).digest('hex');
}

const NUM_USERS = 30;
const NUM_DEVICES = 25;

const MERCHANTS = [
  { id: 'merchant_amazon', category: 'shopping_net' },
  { id: 'merchant_target', category: 'shopping_pos' },
  { id: 'merchant_shell', category: 'gas_transport' },
  { id: 'merchant_starbucks', category: 'food_dining' },
  { id: 'merchant_bestbuy', category: 'electronics' },
  { id: 'merchant_delta', category: 'travel' },
  { id: 'merchant_cvs', category: 'health_fitness' },
  { id: 'merchant_steam', category: 'entertainment' },
  { id: 'merchant_ikea', category: 'home' },
  { id: 'merchant_petsmart', category: 'kids_pets' },
];

function userIds(n) {
  return Array.from({ length: n }, (_, i) => `user_${String(i + 1).padStart(3, '0')}`);
}
function deviceIds(n) {
  return Array.from({ length: n }, (_, i) => `device_${String(i + 1).padStart(3, '0')}`);
}

// ---------------------------------------------------------------------
// Hand-picked fraud-ring layout (not fully random) so the demo has
// guaranteed, reproducible hits instead of hoping randomness lands on
// something visible during judging. See graph/queries/cypherQueries.md
// for exactly which query each case is meant to exercise.
// ---------------------------------------------------------------------
const USED_EDGES = [
  // Ring A — 3 users sharing one BLOCKLISTED device -> hop-0 for all three.
  ['user_001', 'device_001'],
  ['user_002', 'device_001'],
  ['user_003', 'device_001'],

  // Ring B — 3 users sharing one CLEAN device. linked_account_count > 0
  // but hop_distance stays at the -1 sentinel — still trips the
  // frontend's "linked_account_count > 0" condition without being a
  // hop-1 case.
  ['user_004', 'device_002'],
  ['user_005', 'device_002'],
  ['user_006', 'device_002'],

  // Ring C — 2 users sharing a second BLOCKLISTED device.
  ['user_007', 'device_003'],
  ['user_008', 'device_003'],

  // Rings D/E — clean 2-user rings, more linked_account_count > 0 cases
  // with no blocklist involvement.
  ['user_009', 'device_004'],
  ['user_010', 'device_004'],
  ['user_011', 'device_005'],
  ['user_012', 'device_005'],

  // Hop-1 demo case: user_013 and user_014 share device_006 (clean).
  // user_014 ALSO uses device_001 (blocklisted). Neither user is ever
  // directly ON the blocklisted device when transacting on device_006 —
  // but device_006 should still resolve to hop_distance_to_flagged = 1
  // for anyone transacting on it, because user_014 bridges the two.
  // This is deliberately the "ring membership without direct contact"
  // case called out as Bug 1 in the master doc §8 — there it was a bug
  // in the ML training data; here it's the live graph the gateway
  // actually queries, seeded so the case genuinely exists.
  ['user_013', 'device_006'],
  ['user_014', 'device_006'],
  ['user_014', 'device_001'],
];

// Remaining users (015-030) each get one unique, unshared device
// (007-022). Devices 023-025 are intentionally left with no USED edges
// at all — "known but never-used" devices are a realistic edge case:
// is_new_device_for_user should come back true for them, and
// linked_account_count should come back 0.
function buildRemainingEdges() {
  const edges = [];
  for (let i = 15; i <= 30; i++) {
    const user = `user_${String(i).padStart(3, '0')}`;
    const device = `device_${String(i - 8).padStart(3, '0')}`; // 007..022
    edges.push([user, device]);
  }
  return edges;
}

const BLOCKLISTED_DEVICES = new Set(['device_001', 'device_003']);

async function seed() {
  const session = driver.session();
  try {
    console.log('Clearing existing graph data...');
    await session.run('MATCH (n) DETACH DELETE n');

    console.log('Creating uniqueness constraints...');
    await session.run(
      'CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE'
    );
    await session.run(
      'CREATE CONSTRAINT device_hash_unique IF NOT EXISTS FOR (d:Device) REQUIRE d.hash IS UNIQUE'
    );
    await session.run(
      'CREATE CONSTRAINT merchant_id_unique IF NOT EXISTS FOR (m:Merchant) REQUIRE m.id IS UNIQUE'
    );

    console.log(`Creating ${NUM_USERS} User nodes...`);
    for (const id of userIds(NUM_USERS)) {
      await session.run('CREATE (:User {id: $id})', { id });
    }

    console.log(`Creating ${NUM_DEVICES} Device nodes (raw IDs are hashed, never stored)...`);
    for (const rawId of deviceIds(NUM_DEVICES)) {
      await session.run('CREATE (:Device {hash: $hash, is_blocklisted: $isBlocklisted})', {
        hash: hashDeviceId(rawId),
        isBlocklisted: BLOCKLISTED_DEVICES.has(rawId),
      });
    }

    console.log(`Creating ${MERCHANTS.length} Merchant nodes...`);
    for (const m of MERCHANTS) {
      await session.run('CREATE (:Merchant {id: $id, category: $category})', m);
    }

    const allUsedEdges = [...USED_EDGES, ...buildRemainingEdges()];
    console.log(`Creating ${allUsedEdges.length} USED relationships...`);
    for (const [userId, rawDeviceId] of allUsedEdges) {
      await session.run(
        `
        MATCH (u:User {id: $userId})
        MATCH (d:Device {hash: $deviceHash})
        MERGE (u)-[:USED]->(d)
        `,
        { userId, deviceHash: hashDeviceId(rawDeviceId) }
      );
    }

    console.log('Creating TRANSACTED_AT relationships (3-6 random merchants per user)...');
    for (const userId of userIds(NUM_USERS)) {
      const count = 3 + Math.floor(Math.random() * 4);
      const shuffled = [...MERCHANTS].sort(() => Math.random() - 0.5).slice(0, count);
      for (const m of shuffled) {
        await session.run(
          `
          MATCH (u:User {id: $userId})
          MATCH (m:Merchant {id: $merchantId})
          MERGE (u)-[:TRANSACTED_AT]->(m)
          `,
          { userId, merchantId: m.id }
        );
      }
    }

    console.log('');
    console.log('Done. Reference raw device IDs for demo transactions:');
    console.log('  device_001  -> BLOCKLISTED, used by user_001/002/003, also user_014');
    console.log('  device_002  -> clean, shared by user_004/005/006');
    console.log('  device_003  -> BLOCKLISTED, shared by user_007/008');
    console.log('  device_006  -> clean, but hop_distance_to_flagged should resolve to 1');
    console.log('                 (shared by user_013/014; user_014 also on device_001)');
    console.log('  device_023..025 -> exist, never used by anyone (is_new_device_for_user=true)');
  } finally {
    await session.close();
    await driver.close();
  }
}

seed().catch((err) => {
  console.error('Graph seed failed:', err);
  process.exit(1);
});
