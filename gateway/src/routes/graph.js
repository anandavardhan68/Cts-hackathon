const express = require('express');
const router = express.Router();
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

/**
 * GET /api/v1/graph
 *
 * Returns the FULL seeded device/user graph for a one-time visualization
 * page — not per-transaction, so the live-update jank risk we avoided
 * earlier (react-force-graph-2d under continuous WebSocket pushes)
 * doesn't apply here. This loads once when the page opens.
 *
 * Response shape matches what vis-network (or any node/edge graph lib)
 * expects: { nodes: [{id, label, group}], edges: [{from, to}] }
 */
router.get('/graph', async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (u:User)-[:USED]->(d:Device)
      RETURN u.id AS userId, d.hash AS deviceHash, coalesce(d.is_blocklisted, false) AS isBlocklisted
    `);

    const nodesMap = new Map();
    const edges = [];

    result.records.forEach((record) => {
      const userId = record.get('userId');
      const deviceHash = record.get('deviceHash');
      const isBlocklisted = record.get('isBlocklisted');

      if (!nodesMap.has(userId)) {
        nodesMap.set(userId, { id: userId, label: userId, group: 'user' });
      }
      // Device nodes are labeled by a short hash prefix only — never the
      // full hash and never the raw device id, consistent with the
      // pseudonymization design (see docs/architecture.md §6).
      const shortHash = deviceHash.slice(0, 8);
      if (!nodesMap.has(deviceHash)) {
        nodesMap.set(deviceHash, {
          id: deviceHash,
          label: shortHash,
          group: isBlocklisted ? 'blocklisted_device' : 'device',
        });
      }
      edges.push({ from: userId, to: deviceHash });
    });

    res.json({ nodes: Array.from(nodesMap.values()), edges });
  } catch (err) {
    console.error('[graph] failed:', err);
    res.status(500).json({ error: 'Failed to load graph' });
  } finally {
    await session.close();
  }
});

module.exports = router;
