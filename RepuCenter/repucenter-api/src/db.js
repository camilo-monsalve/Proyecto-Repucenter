// src/db.js (CommonJS)
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  ssl: false,
});

async function pingDb() {
  const r = await pool.query('SELECT 1');
  return r.rowCount === 1;
}

function query(text, params) {
  return pool.query(text, params);
}



module.exports = { pool, pingDb, query };