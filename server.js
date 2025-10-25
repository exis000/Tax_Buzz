const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Images and documents only!');
    }
  }
});

// MySQL Database Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'sql12.freesqldatabase.com',
  user: process.env.DB_USER || 'sql12804372',
  password: process.env.DB_PASSWORD || 'WXrWB1MuDY',
  database: process.env.DB_NAME || 'sql12804372'
});

// Connect to database
db.connect((err) => {
  if (err) {
    console.error('❌ Error connecting to MySQL database:', err);
    return;
  }
  console.log('✅ Connected to MySQL database!');
});

// =====================
// ROUTES
// =====================

// Root route - serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'TaxBUZZ - Integrated Frontend index.html'));
});

// API test route
app.get('/api', (req, res) => {
  res.json({ 
    message: "Hello from TaxBUZZ API!",
    version: "1.0.0",
    status: "running"
  });
});

// =====================
// USER ROUTES (SIMPLE EMAIL + PASSWORD ONLY)
// =====================

// Register new user
app.post('/api/users/register', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const query = 'INSERT INTO users (email, password) VALUES (?, ?)';

  db.query(query, [email, password], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Email already exists.' });
      }
      console.error('Error registering user:', err);
      return res.status(500).json({ error: 'Failed to register user', details: err.message });
    }

    res.status(201).json({ 
      message: 'User registered successfully',
      userId: result.insertId 
    });
  });
});

// User login
app.post('/api/users/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const query = 'SELECT id, email FROM users WHERE email = ? AND password = ?';

  db.query(query, [email, password], (err, results) => {
    if (err) {
      console.error('Error logging in:', err);
      return res.status(500).json({ error: 'Login failed', details: err.message });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      message: 'Login successful',
      user: results[0]
    });
  });
});


// User login
app.post('/api/users/login', (req, res) => {
  const { email, password } = req.body;
  
  const query = 'SELECT user_id, username, email, full_name, role FROM users WHERE email = ? AND password = ?';
  
  db.query(query, [email, password], (err, results) => {
    if (err) {
      console.error('Error logging in:', err);
      return res.status(500).json({ error: 'Login failed', details: err.message });
    }
    
    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({ 
      message: 'Login successful', 
      user: results[0] 
    });
  });
});


// =====================
// USER ROUTES (SIMPLE EMAIL + PASSWORD ONLY)
// =====================

// Register new user
app.post('/api/users/register', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const query = 'INSERT INTO users (email, password) VALUES (?, ?)';

  db.query(query, [email, password], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Email already exists.' });
      }
      console.error('Error registering user:', err);
      return res.status(500).json({ error: 'Failed to register user', details: err.message });
    }

    res.status(201).json({ 
      message: 'User registered successfully',
      userId: result.insertId 
    });
  });
});

// =====================
// USER ROUTES (SIMPLE EMAIL + PASSWORD ONLY)
// =====================

// Register new user
app.post('/api/users/register', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const query = 'INSERT INTO users (email, password) VALUES (?, ?)';

  db.query(query, [email, password], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Email already exists.' });
      }
      console.error('Error registering user:', err);
      return res.status(500).json({ error: 'Failed to register user', details: err.message });
    }

    res.status(201).json({ 
      message: 'User registered successfully',
      userId: result.insertId 
    });
  });
});

// User login
app.post('/api/users/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const query = 'SELECT id, email FROM users WHERE email = ? AND password = ?';

  db.query(query, [email, password], (err, results) => {
    if (err) {
      console.error('Error logging in:', err);
      return res.status(500).json({ error: 'Login failed', details: err.message });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      message: 'Login successful',
      user: results[0]
    });
  });
});



// Get user profile
app.get('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
  
  const query = 'SELECT user_id, username, email, full_name, phone, role, created_at FROM users WHERE user_id = ?';
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ error: 'Failed to fetch user', details: err.message });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(results[0]);
  });
});

// Update user profile
app.put('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
  const { full_name, phone, email } = req.body;
  
  const query = 'UPDATE users SET full_name = ?, phone = ?, email = ? WHERE user_id = ?';
  
  db.query(query, [full_name, phone, email, userId], (err, result) => {
    if (err) {
      console.error('Error updating user:', err);
      return res.status(500).json({ error: 'Failed to update user', details: err.message });
    }
    
    res.json({ message: 'User updated successfully' });
  });
});

// =====================
// TAX RECORD ROUTES
// =====================

// Get all tax records for a user
app.get('/api/tax-records/:userId', (req, res) => {
  const { userId } = req.params;
  
  const query = 'SELECT * FROM tax_records WHERE user_id = ? ORDER BY created_at DESC';
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching tax records:', err);
      return res.status(500).json({ error: 'Failed to fetch tax records', details: err.message });
    }
    
    res.json(results);
  });
});

// Create new tax record
app.post('/api/tax-records', (req, res) => {
  const { user_id, tax_year, income, deductions, tax_paid, status } = req.body;
  
  const query = 'INSERT INTO tax_records (user_id, tax_year, income, deductions, tax_paid, status) VALUES (?, ?, ?, ?, ?, ?)';
  
  db.query(query, [user_id, tax_year, income, deductions, tax_paid, status || 'pending'], (err, result) => {
    if (err) {
      console.error('Error creating tax record:', err);
      return res.status(500).json({ error: 'Failed to create tax record', details: err.message });
    }
    
    res.status(201).json({ 
      message: 'Tax record created successfully', 
      recordId: result.insertId 
    });
  });
});

// Update tax record
app.put('/api/tax-records/:recordId', (req, res) => {
  const { recordId } = req.params;
  const { income, deductions, tax_paid, status } = req.body;
  
  const query = 'UPDATE tax_records SET income = ?, deductions = ?, tax_paid = ?, status = ? WHERE record_id = ?';
  
  db.query(query, [income, deductions, tax_paid, status, recordId], (err, result) => {
    if (err) {
      console.error('Error updating tax record:', err);
      return res.status(500).json({ error: 'Failed to update tax record', details: err.message });
    }
    
    res.json({ message: 'Tax record updated successfully' });
  });
});

// Delete tax record
app.delete('/api/tax-records/:recordId', (req, res) => {
  const { recordId } = req.params;
  
  const query = 'DELETE FROM tax_records WHERE record_id = ?';
  
  db.query(query, [recordId], (err, result) => {
    if (err) {
      console.error('Error deleting tax record:', err);
      return res.status(500).json({ error: 'Failed to delete tax record', details: err.message });
    }
    
    res.json({ message: 'Tax record deleted successfully' });
  });
});

// =====================
// DOCUMENT ROUTES
// =====================

// Upload document
app.post('/api/documents/upload', upload.single('document'), (req, res) => {
  const { user_id, document_type, description } = req.body;
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const query = 'INSERT INTO documents (user_id, document_type, file_path, file_name, description) VALUES (?, ?, ?, ?, ?)';
  
  db.query(query, [user_id, document_type, req.file.path, req.file.filename, description], (err, result) => {
    if (err) {
      console.error('Error saving document:', err);
      return res.status(500).json({ error: 'Failed to save document', details: err.message });
    }
    
    res.status(201).json({ 
      message: 'Document uploaded successfully', 
      documentId: result.insertId,
      file: req.file.filename
    });
  });
});

// Get all documents for a user
app.get('/api/documents/:userId', (req, res) => {
  const { userId } = req.params;
  
  const query = 'SELECT * FROM documents WHERE user_id = ? ORDER BY uploaded_at DESC';
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching documents:', err);
      return res.status(500).json({ error: 'Failed to fetch documents', details: err.message });
    }
    
    res.json(results);
  });
});

// Delete document
app.delete('/api/documents/:documentId', (req, res) => {
  const { documentId } = req.params;
  
  const query = 'DELETE FROM documents WHERE document_id = ?';
  
  db.query(query, [documentId], (err, result) => {
    if (err) {
      console.error('Error deleting document:', err);
      return res.status(500).json({ error: 'Failed to delete document', details: err.message });
    }
    
    res.json({ message: 'Document deleted successfully' });
  });
});

// =====================
// NOTIFICATION ROUTES
// =====================

// Get notifications for a user
app.get('/api/notifications/:userId', (req, res) => {
  const { userId } = req.params;
  
  const query = 'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20';
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching notifications:', err);
      return res.status(500).json({ error: 'Failed to fetch notifications', details: err.message });
    }
    
    res.json(results);
  });
});

// Create notification
app.post('/api/notifications', (req, res) => {
  const { user_id, message, type } = req.body;
  
  const query = 'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)';
  
  db.query(query, [user_id, message, type || 'info'], (err, result) => {
    if (err) {
      console.error('Error creating notification:', err);
      return res.status(500).json({ error: 'Failed to create notification', details: err.message });
    }
    
    res.status(201).json({ 
      message: 'Notification created successfully', 
      notificationId: result.insertId 
    });
  });
});

// Mark notification as read
app.put('/api/notifications/:notificationId/read', (req, res) => {
  const { notificationId } = req.params;
  
  const query = 'UPDATE notifications SET is_read = TRUE WHERE notification_id = ?';
  
  db.query(query, [notificationId], (err, result) => {
    if (err) {
      console.error('Error updating notification:', err);
      return res.status(500).json({ error: 'Failed to update notification', details: err.message });
    }
    
    res.json({ message: 'Notification marked as read' });
  });
});

// =====================
// ERROR HANDLING
// =====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    details: err.message 
  });
});

// =====================
// START SERVER
// =====================

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  db.end((err) => {
    if (err) {
      console.error('Error closing database connection:', err);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
});