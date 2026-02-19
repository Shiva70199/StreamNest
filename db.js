require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '23432', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'defaultdb',
  ssl: process.env.DB_SSL === 'REQUIRED' ? { rejectUnauthorized: true } : undefined,
};

let pool;

async function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    await initTables();
  }
  return pool;
}

async function initTables() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(64) UNIQUE NOT NULL,
        username VARCHAR(128) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(24) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(24) NOT NULL,
        code VARCHAR(8) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_phone (phone),
        INDEX idx_expires (expires_at)
      )
    `);
  } finally {
    conn.release();
  }
}

async function query(sql, params) {
  const p = await getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}

module.exports = { getPool, query, initTables };
