const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

// "None" sentinel for hop_distance_to_flagged — the field is always a
// number in the /predict payload (contract §4), so "no path found" is
// represented as -1 rather than null. The frontend's network alert card
// treats -1 the same as linked_account_count === 0 (nothing to show).
const NO_PATH_SENTINEL = -1;

/**
 * Graph-side features for one transaction's device + user.
 *
 * NOTE: graph/queries/cypherQueries.md is the documented source of truth
 * for these traversals (owned by the Lead Architect). The queries below
 * follow the schema in docs/architecture.md §6 (User {id}, Device {hash,
 * is_blocklisted}, (User)-[:USED]->(Device)) — swap in the team's exact
 * versions from that file if they diverge from this implementation.
 */
async function getGraphFeatures(deviceId, userId) {
  const session = driver.session();
  try {
    const [usedBeforeResult, blocklistResult, sharedResult] = await Promise.all([
      // Has this user ever used this device before this transaction?
      session.run(
        `
        MATCH (:User {id: $userId})-[:USED]->(:Device {hash: $deviceId})
        RETURN true AS hasUsedBefore
        LIMIT 1
        `,
        { userId, deviceId }
      ),
      // Is the device itself directly blocklisted? (hop-0)
      session.run(
        `
        MATCH (d:Device {hash: $deviceId})
        RETURN coalesce(d.is_blocklisted, false) AS isBlocklisted
        `,
        { deviceId }
      ),
      // Hop-1: other users who share this device, and whether any of
      // THEIR other devices are blocklisted (fraud-ring proximity).
      session.run(
        `
        MATCH (thisDevice:Device {hash: $deviceId})<-[:USED]-(sharedUser:User)-[:USED]->(otherDevice:Device)
        WHERE otherDevice.hash <> $deviceId
        RETURN DISTINCT sharedUser.id AS sharedUserId,
                         coalesce(otherDevice.is_blocklisted, false) AS otherIsBlocklisted
        `,
        { deviceId }
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
      hopDistanceToFlagged = 0; // directly on a blocklisted device
    } else if (reachesFlaggedViaSharedUser) {
      hopDistanceToFlagged = 1; // one hop away via a shared user's device
    }

    return {
      isNewDeviceForUser: !hasUsedBefore,
      hopDistanceToFlagged,
      linkedAccountCount,
    };
  } finally {
    await session.close();
  }
}

async function closeDriver() {
  await driver.close();
}

module.exports = { getGraphFeatures, closeDriver, NO_PATH_SENTINEL };
