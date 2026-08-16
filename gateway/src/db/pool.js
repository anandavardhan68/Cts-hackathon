// gateway/src/db/pool.js
//
// Single shared Postgres connection pool for the gateway. Every service
// (postgresService.js, seedTransactions.js) imports this same instance
// rather than opening its own connection.

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('[postgres] unexpected error on idle client', err);
  process.exit(1);
});

module.exports = pool;