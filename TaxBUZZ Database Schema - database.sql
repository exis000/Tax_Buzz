-- database.sql - Complete Database Schema

-- Create Database
CREATE DATABASE IF NOT EXISTS sql12804372;
USE sql12804372;

-- Users Table
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

-- Receipts Table
CREATE TABLE IF NOT EXISTS receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  file_type VARCHAR(100),
  file_path VARCHAR(500),
  date_paid DATE NOT NULL,
  receipt_number VARCHAR(100),
  amount DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Income Table
CREATE TABLE IF NOT EXISTS income (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  income_date DATE NOT NULL,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tax Records Table (for future expansion)
CREATE TABLE IF NOT EXISTS tax_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tax_year YEAR NOT NULL,
  total_income DECIMAL(12, 2),
  total_deductions DECIMAL(12, 2),
  tax_due DECIMAL(12, 2),
  status ENUM('pending', 'filed', 'paid') DEFAULT 'pending',
  filing_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Indexes for Better Performance
CREATE INDEX idx_receipts_user_date ON receipts(user_id, date_paid);
CREATE INDEX idx_income_user_date ON income(user_id, income_date);
CREATE INDEX idx_tax_records_user_year ON tax_records(user_id, tax_year);

-- Insert Sample Data (Optional - for testing)
-- INSERT INTO users (email, password, business_owner_name, business_name, address) 
-- VALUES ('demo@taxbuzz.com', '$2a$10$XQvhWq1Q5GxNxIvQZ8Hj7OvXHxKqZ1Y8KpqGxHjKqZ1Y8KpqGxHjK', 'John Doe', 'Doe Enterprises', '123 Business St, Cebu City');

-- Note: The password above is hashed version of "demo123" for testing purposes