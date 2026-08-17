// gateway/src/db/pool.js
//
// Single shared Postgres connection pool for the gateway. Every service
// (postgresService.js, seedTransactions.js) imports THIS SAME instance
// rather than opening its own connection — that's why it lives in its
// own file instead of being created inline inside postgresService.js.

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('[postgres] unexpected error on idle client', err);
  process.exit(1);
});

// Allows `npm run db:test` (see package.json) to sanity-check the
// connection independently of starting the whole gateway.
if (require.main === module) {
  pool
    .query('SELECT NOW()')
    .then((res) => {
      console.log('[postgres] connection OK, server time:', res.rows[0].now);
      return pool.end();
    })
    .catch((err) => {
      console.error('[postgres] connection FAILED:', err.message);
      process.exit(1);
    });
}

module.exports = pool;