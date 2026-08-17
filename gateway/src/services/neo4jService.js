const crypto = require('crypto');
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

const HASH_SECRET = process.env.DEVICE_HASH_SECRET;
if (!HASH_SECRET) {
  console.error('DEVICE_HASH_SECRET is not set — refusing to start without a hashing key.');
  process.exit(1);
}

function hashDeviceId(rawId) {
  return crypto.createHmac('sha256', HASH_SECRET).update(rawId).digest('hex');
}

const NO_PATH_SENTINEL = -1;

async function getGraphFeatures(rawDeviceId, userId) {
  const deviceHash = hashDeviceId(rawDeviceId);

  // Use separate sessions for concurrent queries to avoid transaction conflicts
  const session1 = driver.session();
  const session2 = driver.session();
  const session3 = driver.session();

  try {
    const [usedBeforeResult, blocklistResult, sharedResult] = await Promise.all([
      session1.run(
        `
        MATCH (:User {id: $userId})-[:USED]->(:Device {hash: $deviceHash})
        RETURN true AS hasUsedBefore
        LIMIT 1
        `,
        { userId, deviceHash }
      ),
      session2.run(
        `
        MATCH (d:Device {hash: $deviceHash})
        RETURN coalesce(d.is_blocklisted, false) AS isBlocklisted
        `,
        { deviceHash }
      ),
      session3.run(
        `
        MATCH (thisDevice:Device {hash: $deviceHash})<-[:USED]-(sharedUser:User)-[:USED]->(otherDevice:Device)
        WHERE otherDevice.hash <> $deviceHash
        RETURN DISTINCT sharedUser.id AS sharedUserId,
                        coalesce(otherDevice.is_blocklisted, false) AS otherIsBlocklisted
        `,
        { deviceHash }
      ),
    ]);

    const hasUsedBefore = usedBeforeResult.records.length > 0;
    const deviceIsBlocklisted =
      blocklistResult.records[0]?.get('isBlocklisted') ?? false;

    const sharedRows = sharedResult.records.map((r) => ({
      sharedUserId: r.get('sharedUserId'),
      otherIsBlocklisted: r.get('otherIsBlocklisted'),
    }));

    const linkedAccountCount = new Set(sharedRows.map((r) => r.sharedUserId)).size;
    const reachesFlaggedViaSharedUser = sharedRows.some((r) => r.otherIsBlocklisted);

    let hopDistanceToFlagged = NO_PATH_SENTINEL;
    if (deviceIsBlocklisted) {
      hopDistanceToFlagged = 0;
    } else if (reachesFlaggedViaSharedUser) {
      hopDistanceToFlagged = 1;
    }

    return {
      isNewDeviceForUser: !hasUsedBefore,
      hopDistanceToFlagged,
      linkedAccountCount,
    };
  } finally {
    await session1.close();
    await session2.close();
    await session3.close();
  }
}

async function closeDriver() {
  await driver.close();
}

module.exports = { getGraphFeatures, closeDriver, NO_PATH_SENTINEL, hashDeviceId };