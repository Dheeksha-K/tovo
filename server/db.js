const { Pool, types } = require('pg');
require('dotenv').config();

// Return DATE columns as plain "YYYY-MM-DD" text (avoids time zone shifts)
types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = pool;