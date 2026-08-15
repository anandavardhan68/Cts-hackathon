# FDaaS — Cypher queries (source of truth)

Every query the gateway runs against Neo4j should be copy-pasted from
here, not reinvented in `gateway/src/services/neo4jService.js`. If you
change a query, change it here first and update the gateway to match.

## Schema

```
Nodes:
  (:User {id})
  (:Device {hash, is_blocklisted})
  (:Merchant {id, category})

Relationships:
  (User)-[:USED]->(Device)
  (User)-[:TRANSACTED_AT]->(Merchant)
```

**Device identifiers are always the HMAC-SHA256 hash of the raw device
ID, never the raw ID itself.** This is a deliberate pseudonymization
choice (not a formal ZK-proof-level guarantee — be upfront about that
distinction if asked). Both `graph/seed/seedGraph.js` and
`gateway/src/services/neo4jService.js` hash with the same
`DEVICE_HASH_SECRET`; if that value differs between their two `.env`
files, every lookup silently returns "no match" instead of erroring,
so double-check it first if features look wrong.

## Constraints (run once, also created by seedGraph.js)

```cypher
CREATE CONSTRAINT user_id_unique IF NOT EXISTS
FOR (u:User) REQUIRE u.id IS UNIQUE;

CREATE CONSTRAINT device_hash_unique IF NOT EXISTS
FOR (d:Device) REQUIRE d.hash IS UNIQUE;

CREATE CONSTRAINT merchant_id_unique IF NOT EXISTS
FOR (m:Merchant) REQUIRE m.id IS UNIQUE;
```

## 1. is_new_device_for_user

Has this user ever used this device before this transaction?

```cypher
MATCH (:User {id: $userId})-[:USED]->(:Device {hash: $deviceHash})
RETURN true AS hasUsedBefore
LIMIT 1
```

No row back → `is_new_device_for_user = true`. A row back →
`is_new_device_for_user = false`.

## 2. linked_account_count

How many OTHER distinct users have used this exact device — direct
co-use only, not a multi-hop count. Keep this separate from the
hop-distance traversal below; folding them into one query undercounts
(it would only count co-users who *also* have a second device, which
is a different question).

```cypher
MATCH (:Device {hash: $deviceHash})<-[:USED]-(u:User)
WHERE u.id <> $userId
RETURN count(DISTINCT u) AS linkedAccountCount
```

## 3. hop_distance_to_flagged

Two-part check, evaluated in this order. `-1` is the "none" sentinel —
the field is always a number in the `/predict` payload (contract §4),
so "no path found" is `-1`, not `null`. The frontend's network alert
card treats `-1` the same as `linked_account_count == 0` (nothing to
show).

**Hop-0 — is the device itself blocklisted?**

```cypher
MATCH (d:Device {hash: $deviceHash})
RETURN coalesce(d.is_blocklisted, false) AS isBlocklisted
```

If `true` → `hop_distance_to_flagged = 0`. Stop here; don't run the
hop-1 query, the answer's already known.

**Hop-1 — does another user who shares this device also use a
*different* device that's blocklisted?**

```cypher
MATCH (thisDevice:Device {hash: $deviceHash})<-[:USED]-(sharedUser:User)-[:USED]->(otherDevice:Device)
WHERE otherDevice.hash <> $deviceHash
  AND otherDevice.is_blocklisted = true
RETURN DISTINCT sharedUser.id AS sharedUserId
LIMIT 1
```

Any row back → `hop_distance_to_flagged = 1`. No rows, and hop-0 was
`false` → `hop_distance_to_flagged = -1`.

This is the pattern that only works if devices are *genuinely* shared
in the graph — a user with exactly one device, ever, can never be
hop-1 to anything (this was Bug 1 in the master doc §8, there in the
ML training data's synthetic graph). `seedGraph.js` deliberately builds
a real instance of this case — `device_006` is shared by `user_013`
and `user_014`, and `user_014` separately uses the blocklisted
`device_001` — so this query has something real to find.

## Demo reference (from seedGraph.js)

| Raw device ID | is_blocklisted | Users | Expected hop_distance_to_flagged |
|---|---|---|---|
| device_001 | true | user_001, user_002, user_003, user_014 | 0 |
| device_002 | false | user_004, user_005, user_006 | -1 (linked_account_count > 0 though) |
| device_003 | true | user_007, user_008 | 0 |
| device_004 | false | user_009, user_010 | -1 |
| device_005 | false | user_011, user_012 | -1 |
| device_006 | false | user_013, user_014 | **1** (via user_014 -> device_001) |
| device_023–025 | false | (none) | -1, and is_new_device_for_user always true |

## Useful admin / debug queries

List all blocklisted devices:

```cypher
MATCH (d:Device {is_blocklisted: true}) RETURN d.hash
```

Count USED edges per device (spot-check sharing before a demo run):

```cypher
MATCH (:User)-[r:USED]->(d:Device)
RETURN d.hash, count(r) AS userCount
ORDER BY userCount DESC
```

Wipe the graph clean (also the first line of seedGraph.js):

```cypher
MATCH (n) DETACH DELETE n
```
