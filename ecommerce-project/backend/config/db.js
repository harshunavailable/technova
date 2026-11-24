// config/db.js
// Creates and exports a single reusable SQL Server connection pool.
require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: Number(process.env.DB_PORT) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',        // true if using Azure SQL
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true' // true for local dev
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let poolPromise;

/**
 * getPool() returns a cached promise that resolves to a live connection pool.
 * Every route file calls this instead of opening a new connection each time.
 */
function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then(pool => {
        console.log('✅ Connected to SQL Server:', config.database);
        return pool;
      })
      .catch(err => {
        console.error('❌ SQL Server connection failed:', err.message);
        poolPromise = null; // allow a retry on the next request
        throw err;
      });
  }
  return poolPromise;
}

module.exports = { sql, getPool };
