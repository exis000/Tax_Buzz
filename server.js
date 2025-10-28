const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads')); // Serve files from the 'uploads' folder

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure this folder exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Store original name separately if needed, but use unique name for storage
    // We will save originalname to the DB later
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Allow common image, pdf, and document types
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Only images (jpeg, jpg, png), PDF, and Word documents (doc, docx) are allowed!');
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
// USER ROUTES (SECURED WITH BCRYPT & CONSISTENT ID)
// =====================

// Register new user (SECURE VERSION)
app.post('/api/users/register', async (req, res) => {
  const { email, password, username, full_name, phone } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (email, password, username, full_name, phone) VALUES (?, ?, ?, ?, ?)';

    db.query(query, [email, hashedPassword, username, full_name, phone], (err, result) => {
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
  } catch (hashError) {
      console.error('Error hashing password:', hashError);
      return res.status(500).json({ error: 'Failed to register user due to hashing error' });
  }
});

// User login (SECURE VERSION & SENDS CORRECT ID)
app.post('/api/users/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const query = 'SELECT * FROM users WHERE email = ?';

  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error('Error logging in (database query):', err);
      return res.status(500).json({ error: 'Login failed', details: err.message });
    }
    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = results[0];
    try {
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }
        const userResponse = {
          id: user.id, // Correct ID sent
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role
        };
        res.json({ message: 'Login successful', user: userResponse });
    } catch (compareError) {
        console.error('Error comparing password:', compareError);
        return res.status(500).json({ error: 'Login failed during password check' });
    }
  });
});

// Get user profile (USING CORRECT ID)
app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT id, username, email, full_name, phone, role, created_at FROM users WHERE id = ?';

  db.query(query, [id], (err, results) => {
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

// Update user profile (USING CORRECT ID)
app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { full_name, phone, email } = req.body;
  const query = 'UPDATE users SET full_name = ?, phone = ?, email = ? WHERE id = ?';

  db.query(query, [full_name, phone, email, id], (err, result) => {
    if (err) {
      console.error('Error updating user:', err);
      if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'Email already in use.' });
      }
      return res.status(500).json({ error: 'Failed to update user', details: err.message });
    }
    if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found or no changes made.' });
    }
    res.json({ message: 'User updated successfully' });
  });
});

// =====================
// TAX RECORD ROUTES (WITH SEARCH)
// =====================

// Get all tax records for a user (with Search)
// Frontend calls this using '/api/tax-records/<currentUser.id>?search=<term>'
app.get('/api/tax-records/:id', (req, res) => {
  const { id } = req.params;
  const searchTerm = req.query.search || ''; // Get search term from query string, default to empty
  const searchPattern = `%${searchTerm}%`; // Prepare pattern for SQL LIKE operator

  // Build the WHERE clause dynamically
  let whereClause = 'user_id = ?'; // Base clause: always filter by user
  let queryParams = [id]; // Base parameters for the query

  // If a search term is provided, add conditions for relevant columns
  if (searchTerm) {
    // Search in tax_year (convert search term to year if possible) or status
    whereClause += ' AND (tax_year LIKE ? OR status LIKE ?)';
    // Add the search pattern twice for the two placeholders
    queryParams.push(searchPattern, searchPattern);
  }

  // Construct the final query
  const query = `SELECT * FROM tax_records WHERE ${whereClause} ORDER BY created_at DESC`;

  // Execute the query
  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error('Error fetching tax records:', err);
      return res.status(500).json({ error: 'Failed to fetch tax records', details: err.message });
    }
    // Send back only the records matching the user ID and search term (if any)
    res.json(results);
  });
});


// Create new tax record (USING CORRECT ID FROM BODY)
app.post('/api/tax-records', (req, res) => {
  const { id, tax_year, income, deductions, tax_paid, status } = req.body;
  if (!id || !tax_year || income === undefined || deductions === undefined || tax_paid === undefined) {
      return res.status(400).json({ error: 'Missing required tax record fields (id, tax_year, income, deductions, tax_paid).' });
  }
  const query = 'INSERT INTO tax_records (user_id, tax_year, income, deductions, tax_paid, status) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(query, [id, tax_year, income, deductions, tax_paid, status || 'pending'], (err, result) => {
    if (err) {
      console.error('Error creating tax record:', err);
      return res.status(500).json({ error: 'Failed to create tax record', details: err.message });
    }
    res.status(201).json({ message: 'Tax record created successfully', recordId: result.insertId });
  });
});

// Update tax record
app.put('/api/tax-records/:recordId', (req, res) => {
  const { recordId } = req.params;
  const { income, deductions, tax_paid, status } = req.body;
  if (income === undefined || deductions === undefined || tax_paid === undefined || !status) {
      return res.status(400).json({ error: 'Missing required fields for update (income, deductions, tax_paid, status).' });
  }
  const query = 'UPDATE tax_records SET income = ?, deductions = ?, tax_paid = ?, status = ? WHERE record_id = ?';
  db.query(query, [income, deductions, tax_paid, status, recordId], (err, result) => {
    if (err) {
      console.error('Error updating tax record:', err);
      return res.status(500).json({ error: 'Failed to update tax record', details: err.message });
    }
    if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Tax record not found or no changes made.' });
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
    if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Tax record not found.' });
    }
    res.json({ message: 'Tax record deleted successfully' });
  });
});

// =====================
// DOCUMENT ROUTES (WITH SEARCH & PAGINATION)
// =====================

// Upload document (EXPECTS CORRECT ID FROM BODY)
app.post('/api/documents/upload', upload.single('document'), (req, res) => {
  const { id, document_type, description } = req.body;
  const originalFileName = req.file ? req.file.originalname : null; // Get original filename

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  if (!id || !document_type) {
      const fs = require('fs');
      fs.unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) console.error("Error deleting orphaned file:", unlinkErr);
      });
      return res.status(400).json({ error: 'Missing user ID or document type.' });
  }

  // Include original_file_name in the insert query
  const query = 'INSERT INTO documents (user_id, document_type, file_path, file_name, original_file_name, description) VALUES (?, ?, ?, ?, ?, ?)';

  db.query(query, [id, document_type, req.file.path, req.file.filename, originalFileName, description || null], (err, result) => {
    if (err) {
      console.error('Error saving document:', err);
      const fs = require('fs');
      fs.unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) console.error("Error deleting orphaned file on DB error:", unlinkErr);
      });
      return res.status(500).json({ error: 'Failed to save document record', details: err.message });
    }
    res.status(201).json({
      message: 'Document uploaded successfully',
      documentId: result.insertId,
      file: req.file.filename
    });
  });
});


// Get all documents for a user (with Search and Pagination)
// Frontend calls using '/api/documents/<id>?search=<term>&page=<num>&limit=<num>'
app.get('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  const searchTerm = req.query.search || ''; // Get search term, default empty
  const searchPattern = `%${searchTerm}%`; // Pattern for LIKE

  // Pagination parameters from query string
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '5', 10); // Match frontend's documentsPerPage
  const offset = (page - 1) * limit; // Calculate offset for SQL query

  // Build WHERE clause dynamically based on search
  let whereClause = 'user_id = ?'; // Always filter by user ID
  let baseQueryParams = [id]; // Parameters for user ID filter

  // Add search conditions if a search term exists
  if (searchTerm) {
    // Search in document type, original file name, or description
    whereClause += ' AND (document_type LIKE ? OR original_file_name LIKE ? OR description LIKE ?)';
    // Add search pattern for each field being searched
    baseQueryParams.push(searchPattern, searchPattern, searchPattern);
  }

  // Query 1: Get the total count of documents matching the filter
  const countQuery = `SELECT COUNT(*) as total FROM documents WHERE ${whereClause}`;
  // Use a copy of baseQueryParams for the count query (without limit/offset)
  const countQueryParams = [...baseQueryParams];

  db.query(countQuery, countQueryParams, (countErr, countResults) => {
    if (countErr) {
      console.error('Error counting documents:', countErr);
      return res.status(500).json({ error: 'Failed to count documents', details: countErr.message });
    }
    const totalDocuments = countResults[0].total; // Total matching documents

    // Query 2: Get the documents for the current page matching the filter
    const dataQuery = `SELECT * FROM documents WHERE ${whereClause} ORDER BY uploaded_at DESC LIMIT ? OFFSET ?`;
    // Add limit and offset parameters for the data query
    const dataQueryParams = [...baseQueryParams, limit, offset];

    db.query(dataQuery, dataQueryParams, (dataErr, documents) => {
      if (dataErr) {
        console.error('Error fetching documents:', dataErr);
        return res.status(500).json({ error: 'Failed to fetch documents', details: dataErr.message });
      }
      // Send back the documents for the page and the total count (matching search)
      res.json({
          documents: documents,
          totalDocuments: totalDocuments
      });
    });
  });
});


// Delete document
app.delete('/api/documents/:documentId', (req, res) => {
  const { documentId } = req.params;
  const selectQuery = 'SELECT file_path FROM documents WHERE document_id = ?';
  db.query(selectQuery, [documentId], (selectErr, results) => {
      if (selectErr) {
          console.error('Error finding document before delete:', selectErr);
          return res.status(500).json({ error: 'Failed to find document before deleting.' });
      }
      if (results.length === 0) {
          return res.status(404).json({ error: 'Document not found.' });
      }
      const filePath = results[0].file_path;
      const deleteQuery = 'DELETE FROM documents WHERE document_id = ?';
      db.query(deleteQuery, [documentId], (deleteErr, result) => {
          if (deleteErr) {
              console.error('Error deleting document record:', deleteErr);
              return res.status(500).json({ error: 'Failed to delete document record', details: deleteErr.message });
          }
          if (result.affectedRows === 0) {
              return res.status(404).json({ error: 'Document not found during delete.' });
          }
          const fs = require('fs');
          // Check if filePath exists before attempting unlink
          if (filePath) {
              fs.unlink(filePath, (unlinkErr) => {
                  if (unlinkErr && unlinkErr.code !== 'ENOENT') { // Ignore error if file already gone
                      console.error(`Error deleting file ${filePath}:`, unlinkErr);
                  }
                  res.json({ message: 'Document record and associated file deleted successfully' });
              });
          } else {
               res.json({ message: 'Document record deleted successfully (no associated file found)' });
          }
      });
  });
});


// =====================
// NOTIFICATION ROUTES (REMOVED)
// =====================
// Routes related to /api/notifications/* are removed.


// =====================
// ERROR HANDLING
// =====================

// 404 handler for unmatched routes
app.use((req, res, next) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `File upload error: ${err.message}`});
  } else if (err) {
      if (err.message.includes('Only images')) { // More specific check for file filter error
           return res.status(400).json({ error: 'Invalid file type. Allowed: jpg, png, pdf, doc, docx.' });
      }
      return res.status(500).json({
          error: 'Internal server error',
          details: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred.' // Avoid leaking details in prod
      });
  }
  next();
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
    process.exit(err ? 1 : 0);
  });
});

