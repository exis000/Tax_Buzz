// db.js
const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function initSchema() {
  const schema = `
  -- Users
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    business_owner_name VARCHAR(255),
    business_name VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );

  -- Receipts
  CREATE TABLE IF NOT EXISTS receipts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    file_type VARCHAR(100),
    file_path VARCHAR(500),
    date_paid DATE NOT NULL,
    receipt_number VARCHAR(100),
    amount DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Income
  CREATE TABLE IF NOT EXISTS income (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    income_date DATE NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Tax records
  CREATE TABLE IF NOT EXISTS tax_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tax_year YEAR NOT NULL,
    total_income DECIMAL(12,2),
    total_deductions DECIMAL(12,2),
    tax_due DECIMAL(12,2),
    status ENUM('pending','filed','paid') DEFAULT 'pending',
    filing_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  `;

  // Execute the schema statements one by one
  const conn = await pool.getConnection();
  try {
    // split by semicolon and run each non-empty statement
    const statements = schema.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      await conn.query(stmt);
    }
    console.log('Database schema initialized (tables created if not exist).');
  } catch (err) {
    console.error('Error initializing schema:', err);
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, initSchema };
