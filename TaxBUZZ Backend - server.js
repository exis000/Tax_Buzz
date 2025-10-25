// server.js - Main Backend Server
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

// Database Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'taxbuzz_db'
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// File Upload Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb('Error: Images and PDFs only!');
    }
  }
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  // Check if user exists
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    db.query(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, hashedPassword],
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to create user' });
        }

        res.status(201).json({ 
          message: 'User registered successfully',
          userId: result.insertId 
        });
      }
    );
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = results[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        email: user.email,
        businessName: user.business_name
      }
    });
  });
});

// ==================== USER PROFILE ROUTES ====================

// Setup/Update Business Profile
app.post('/api/profile/setup', authenticateToken, (req, res) => {
  const { businessOwnerName, businessName, address } = req.body;
  const userId = req.user.id;

  if (!businessOwnerName || !businessName || !address) {
    return res.status(400).json({ error: 'All fields required' });
  }

  db.query(
    'UPDATE users SET business_owner_name = ?, business_name = ?, address = ? WHERE id = ?',
    [businessOwnerName, businessName, address, userId],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update profile' });
      }

      res.json({ message: 'Profile updated successfully' });
    }
  );
});

// Get User Profile
app.get('/api/profile', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.query('SELECT id, email, business_owner_name, business_name, address FROM users WHERE id = ?', 
    [userId], 
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(results[0]);
    }
  );
});

// ==================== RECEIPT ROUTES ====================

// Upload Receipt
app.post('/api/receipts/upload', authenticateToken, upload.single('receipt'), (req, res) => {
  const { fileType, datePaid, receiptNumber } = req.body;
  const userId = req.user.id;
  const filePath = req.file ? req.file.path : null;

  if (!fileType || !datePaid || !receiptNumber) {
    return res.status(400).json({ error: 'All fields required' });
  }

  db.query(
    'INSERT INTO receipts (user_id, file_type, file_path, date_paid, receipt_number) VALUES (?, ?, ?, ?, ?)',
    [userId, fileType, filePath, datePaid, receiptNumber],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to save receipt' });
      }

      res.status(201).json({ 
        message: 'Receipt uploaded successfully',
        receiptId: result.insertId 
      });
    }
  );
});

// Get All Receipts for User
app.get('/api/receipts', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { month, year } = req.query;

  let query = 'SELECT * FROM receipts WHERE user_id = ?';
  let params = [userId];

  if (month && year) {
    query += ' AND MONTH(date_paid) = ? AND YEAR(date_paid) = ?';
    params.push(month, year);
  }

  query += ' ORDER BY date_paid DESC';

  db.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(results);
  });
});

// Get Single Receipt
app.get('/api/receipts/:id', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const receiptId = req.params.id;

  db.query(
    'SELECT * FROM receipts WHERE id = ? AND user_id = ?',
    [receiptId, userId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Receipt not found' });
      }

      res.json(results[0]);
    }
  );
});

// Delete Receipt
app.delete('/api/receipts/:id', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const receiptId = req.params.id;

  db.query(
    'DELETE FROM receipts WHERE id = ? AND user_id = ?',
    [receiptId, userId],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Receipt not found' });
      }

      res.json({ message: 'Receipt deleted successfully' });
    }
  );
});

// ==================== INCOME ROUTES ====================

// Add Income Entry
app.post('/api/income', authenticateToken, (req, res) => {
  const { amount, description, incomeDate, category } = req.body;
  const userId = req.user.id;

  if (!amount || !incomeDate) {
    return res.status(400).json({ error: 'Amount and date required' });
  }

  db.query(
    'INSERT INTO income (user_id, amount, description, income_date, category) VALUES (?, ?, ?, ?, ?)',
    [userId, amount, description, incomeDate, category],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to add income' });
      }

      res.status(201).json({ 
        message: 'Income added successfully',
        incomeId: result.insertId 
      });
    }
  );
});

// Get Income Records
app.get('/api/income', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { month, year } = req.query;

  let query = 'SELECT * FROM income WHERE user_id = ?';
  let params = [userId];

  if (month && year) {
    query += ' AND MONTH(income_date) = ? AND YEAR(income_date) = ?';
    params.push(month, year);
  }

  query += ' ORDER BY income_date DESC';

  db.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(results);
  });
});

// Get Income Summary
app.get('/api/income/summary', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { year } = req.query;

  let query = `
    SELECT 
      MONTH(income_date) as month,
      SUM(amount) as total,
      COUNT(*) as count
    FROM income 
    WHERE user_id = ?
  `;
  let params = [userId];

  if (year) {
    query += ' AND YEAR(income_date) = ?';
    params.push(year);
  }

  query += ' GROUP BY MONTH(income_date) ORDER BY month';

  db.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(results);
  });
});

// Delete Income Entry
app.delete('/api/income/:id', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const incomeId = req.params.id;

  db.query(
    'DELETE FROM income WHERE id = ? AND user_id = ?',
    [incomeId, userId],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Income entry not found' });
      }

      res.json({ message: 'Income entry deleted successfully' });
    }
  );
});

// ==================== DASHBOARD STATS ====================

app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  const userId = req.user.id;

  const stats = {};

  // Get total income
  db.query(
    'SELECT SUM(amount) as total FROM income WHERE user_id = ?',
    [userId],
    (err, incomeResults) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      stats.totalIncome = incomeResults[0].total || 0;

      // Get receipt count
      db.query(
        'SELECT COUNT(*) as count FROM receipts WHERE user_id = ?',
        [userId],
        (err, receiptResults) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          stats.receiptCount = receiptResults[0].count || 0;

          // Get monthly income (current month)
          db.query(
            'SELECT SUM(amount) as monthly FROM income WHERE user_id = ? AND MONTH(income_date) = MONTH(CURDATE()) AND YEAR(income_date) = YEAR(CURDATE())',
            [userId],
            (err, monthlyResults) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }

              stats.monthlyIncome = monthlyResults[0].monthly || 0;

              res.json(stats);
            }
          );
        }
      );
    }
  );
});

// Start Server
app.listen(PORT, () => {
  console.log(`TaxBUZZ Server running on http://localhost:${PORT}`);
});