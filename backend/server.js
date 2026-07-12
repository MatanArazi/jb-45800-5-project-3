/**
 * Vacation Website API Server
 * Main Express server with routes for vacations, users, likes, bookings, and reviews
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// File uploads: ensure upload directory exists and serve it
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_'))
});
const upload = multer({ storage });

const MCP_URL = process.env.MCP_URL || 'http://localhost:3005/mcp';

function toDateOnly(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function toPublicImageUrl(image) {
  if (!image) return null;
  if (String(image).startsWith('http://') || String(image).startsWith('https://') || String(image).startsWith('/uploads/')) {
    return image;
  }
  return `/uploads/${image}`;
}

function imageFilePathFromStored(image) {
  if (!image) return null;
  const fileName = String(image).startsWith('/uploads/') ? String(image).replace('/uploads/', '') : String(image);
  return path.join(uploadDir, fileName);
}

async function parseMcpJsonResponse(response) {
  const contentType = (response.headers.get('content-type') || '').toLowerCase();

  if (contentType.includes('application/json')) {
    return await response.json();
  }

  if (contentType.includes('text/event-stream')) {
    const reader = response.body && response.body.getReader ? response.body.getReader() : null;
    if (!reader) {
      throw new Error('MCP SSE response body was not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) {
          continue;
        }

        const data = trimmed.slice(5).trim();
        if (!data) {
          continue;
        }

        return JSON.parse(data);
      }
    }

    throw new Error('MCP SSE response ended before JSON data was received');
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Unsupported MCP response content type: ${contentType || 'unknown'}`);
  }
}

async function callMcpDatabaseQuestion(question) {
  const initializeResponse = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'vacation-website-api-js',
          version: '1.0.0'
        }
      }
    })
  });

  if (!initializeResponse.ok) {
    throw new Error(`MCP initialize failed with status ${initializeResponse.status}`);
  }

  const sessionId = initializeResponse.headers.get('mcp-session-id');
  if (!sessionId) {
    throw new Error('MCP session id was not returned by MCP server');
  }

  await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'mcp-session-id': sessionId
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {}
    })
  });

  const toolResponse = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'mcp-session-id': sessionId
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'vacation_database_question',
        arguments: { question }
      }
    })
  });

  if (!toolResponse.ok) {
    throw new Error(`MCP tool call failed with status ${toolResponse.status}`);
  }

  const payload = await parseMcpJsonResponse(toolResponse);
  const text = payload && payload.result && Array.isArray(payload.result.content)
    ? (payload.result.content.find((item) => item.type === 'text') || {}).text
    : null;

  if (!text) {
    throw new Error('MCP server returned no text response');
  }

  return text;
}

// Admin middleware: checks header or users.role if available
async function adminOnly(req, res, next) {
  try {
    const userId = req.headers['x-user-id'] || req.body.created_by || req.query.user_id;
    if (!userId) return res.status(403).json({ success: false, error: 'Admin only' });

    // If DB has a role column, verify it; otherwise deny
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute('SELECT role FROM users WHERE user_id = ?', [userId]);
      if (rows.length > 0) {
        const r = rows[0];
        if (r.role && r.role === 'admin') {
          connection.release();
          return next();
        }
      }
    } catch (err) {
      // ignore DB shape errors and fall through to deny
      console.warn('adminOnly: role check failed', err.message);
    }
    connection.release();
    return res.status(403).json({ success: false, error: 'Admin only' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Database connection pool
let pool;

// Initialize database connection pool
async function initializePool() {
  try {
    pool = mysql.createPool({
      host: 'localhost',
      user: process.env.DB_USER || 'vacation_user',
      password: process.env.DB_PASSWORD || 'userpassword',
      database: process.env.DB_NAME || 'vacation_db',
      port: parseInt(process.env.DB_PORT) || 3307,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    console.log('✓ Database pool created successfully');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    return false;
  }
}

// ==================== VACATIONS ROUTES ====================

/**
 * GET /api/vacations
 * Retrieve all vacations with like counts
 */
app.get('/api/vacations', async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Pagination & filters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000; // default large
    const offset = (page - 1) * limit;
    const filter = req.query.filter || 'all'; // liked, active, future, all
    const userId = req.query.user_id ? parseInt(req.query.user_id) : null;

    // Build base where clauses
    const whereClauses = [];
    const params = [];

    const today = new Date().toISOString().slice(0,10);

    if (filter === 'active') {
      whereClauses.push('v.start_date <= ? AND v.end_date >= ?');
      params.push(today, today);
    } else if (filter === 'future') {
      whereClauses.push('v.start_date > ?');
      params.push(today);
    }

    // Count total for pagination
    const countQuery = `SELECT COUNT(DISTINCT v.vacation_id) as cnt FROM vacations v ${filter === 'liked' && userId ? 'JOIN likes u_like ON v.vacation_id = u_like.vacation_id AND u_like.user_id = ?' : ''} ${whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''}`;
    const countParams = filter === 'liked' && userId ? [userId, ...params] : params;
    const [countRows] = await connection.execute(countQuery, countParams);
    const total = countRows[0].cnt || 0;

    // Main query with likes count and optional user liked flag
    const mainQuery = `
      SELECT v.*, COUNT(l.like_id) as total_likes,
        SUM(CASE WHEN l.user_id = ? THEN 1 ELSE 0 END) as liked_by_current_user
      FROM vacations v
      LEFT JOIN likes l ON v.vacation_id = l.vacation_id
      ${filter === 'liked' && userId ? 'JOIN likes u_like ON v.vacation_id = u_like.vacation_id AND u_like.user_id = ?' : ''}
      ${whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''}
      GROUP BY v.vacation_id
      ORDER BY v.start_date ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const mainParams = [];
    // param for SUM CASE -> current user id (or 0)
    mainParams.push(userId || 0);
    if (filter === 'liked' && userId) mainParams.push(userId);
    mainParams.push(...params);

    const [vacations] = await connection.execute(mainQuery, mainParams);
    connection.release();

    const normalized = vacations.map((v) => ({
      ...v,
      image_url: toPublicImageUrl(v.image_url || null),
    }));

    res.json({ success: true, count: normalized.length, total, page, limit, data: normalized });
  } catch (error) {
    console.error('Error fetching vacations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/vacations/:id
 * Get single vacation with reviews
 */
app.get('/api/vacations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    
    // Get vacation details
    const [vacation] = await connection.execute(
      'SELECT * FROM vacations WHERE vacation_id = ?',
      [id]
    );
    
    if (vacation.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, error: 'Vacation not found' });
    }
    
    // Get reviews
    const [reviews] = await connection.execute(`
      SELECT r.*, u.first_name, u.last_name
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.vacation_id = ?
      ORDER BY r.created_at DESC
    `, [id]);
    
    // Get like count
    const [likeCount] = await connection.execute(
      'SELECT COUNT(*) as total_likes FROM likes WHERE vacation_id = ?',
      [id]
    );
    
    connection.release();
    
    res.json({
      success: true,
      data: {
        ...vacation[0],
        image_url: toPublicImageUrl(vacation[0].image_url || null),
        total_likes: likeCount[0].total_likes,
        reviews: reviews
      }
    });
  } catch (error) {
    console.error('Error fetching vacation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/vacations/destination/:destination
 * Filter vacations by destination
 */
app.get('/api/vacations/destination/:destination', async (req, res) => {
  try {
    const { destination } = req.params;
    const connection = await pool.getConnection();
    
    const [vacations] = await connection.execute(`
      SELECT v.*, COUNT(l.like_id) as total_likes
      FROM vacations v
      LEFT JOIN likes l ON v.vacation_id = l.vacation_id
      WHERE v.destination LIKE ?
      GROUP BY v.vacation_id
    `, [`%${destination}%`]);
    
    connection.release();
    res.json({ success: true, data: vacations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/vacations
 * Create a new vacation (admin only). Accepts multipart/form-data with optional `image` file.
 */
app.post('/api/vacations', adminOnly, upload.single('image'), async (req, res) => {
  try {
    const { title, description, destination, start_date, end_date, price } = req.body;

    if (!title || !description || !destination || !start_date || !end_date || price === undefined || price === null) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    if (!req.file || !req.file.filename) {
      return res.status(400).json({ success: false, error: 'Image file is required' });
    }

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0 || numericPrice > 10000) {
      return res.status(400).json({ success: false, error: 'Price must be between 0 and 10000' });
    }

    const startDateOnly = toDateOnly(String(start_date));
    const endDateOnly = toDateOnly(String(end_date));
    const today = todayDateOnly();
    if (startDateOnly < today) {
      return res.status(400).json({ success: false, error: 'Start date cannot be in the past' });
    }
    if (endDateOnly < startDateOnly) {
      return res.status(400).json({ success: false, error: 'End date must be on or after start date' });
    }

    const created_by = req.body.created_by || req.headers['x-user-id'] || 1;
    const imageFileName = req.file.filename;

    const connection = await pool.getConnection();

    const query = `
      INSERT INTO vacations (title, description, destination, start_date, end_date, price, image_url, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await connection.execute(query, [
      title, description, destination, startDateOnly, endDateOnly, numericPrice, imageFileName, created_by
    ]);

    connection.release();

    res.status(201).json({
      success: true,
      message: 'Vacation created',
      vacation_id: result.insertId,
      image_url: toPublicImageUrl(imageFileName)
    });
  } catch (error) {
    console.error('Error creating vacation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== LIKES ROUTES ====================

/**
 * POST /api/likes
 * Add a like to a vacation
 */
app.post('/api/likes', async (req, res) => {
  try {
    const { user_id, vacation_id } = req.body;
    const connection = await pool.getConnection();
    
    // Check if already liked
    const [existing] = await connection.execute(
      'SELECT * FROM likes WHERE user_id = ? AND vacation_id = ?',
      [user_id, vacation_id]
    );
    
    if (existing.length > 0) {
      connection.release();
      return res.status(400).json({ success: false, error: 'Already liked' });
    }
    
    // Insert like
    await connection.execute(
      'INSERT INTO likes (user_id, vacation_id) VALUES (?, ?)',
      [user_id, vacation_id]
    );
    
    connection.release();
    res.status(201).json({ success: true, message: 'Like added' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/likes/:user_id/:vacation_id
 * Remove a like from a vacation
 */
app.delete('/api/likes/:user_id/:vacation_id', async (req, res) => {
  try {
    const { user_id, vacation_id } = req.params;
    const connection = await pool.getConnection();
    
    await connection.execute(
      'DELETE FROM likes WHERE user_id = ? AND vacation_id = ?',
      [user_id, vacation_id]
    );
    
    connection.release();
    res.json({ success: true, message: 'Like removed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users/:user_id/likes
 * Get all likes for a specific user
 */
app.get('/api/users/:user_id/likes', async (req, res) => {
  try {
    const { user_id } = req.params;
    const connection = await pool.getConnection();
    
    const [likes] = await connection.execute(`
      SELECT v.* FROM vacations v
      JOIN likes l ON v.vacation_id = l.vacation_id
      WHERE l.user_id = ?
    `, [user_id]);
    
    connection.release();
    const normalized = likes.map((v) => ({
      ...v,
      image_url: toPublicImageUrl(v.image_url || null),
    }));
    res.json({ success: true, data: normalized });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== USERS ROUTES ====================

/**
 * GET /api/users
 * Get all users
 */
app.get('/api/users', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [users] = await connection.execute('SELECT user_id, first_name, last_name, email, created_at FROM users');
    connection.release();
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users
 * Create a new user
 */
app.post('/api/users', async (req, res) => {
  try {
    const { first_name, last_name, email, password_hash } = req.body;
    if (!first_name || !last_name || !email || !password_hash) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    if (String(password_hash).length < 4) {
      return res.status(400).json({ success: false, error: 'Password must be at least 4 characters' });
    }

    const connection = await pool.getConnection();
    // Check unique email
    const [existing] = await connection.execute('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      connection.release();
      return res.status(409).json({ success: false, error: 'Email already in use' });
    }

    const [result] = await connection.execute(
      'INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)',
      [first_name, last_name, email, password_hash]
    );

    // Return created user (without password)
    const [rows] = await connection.execute('SELECT user_id, first_name, last_name, email FROM users WHERE user_id = ?', [result.insertId]);
    connection.release();
    res.status(201).json({ success: true, message: 'User created', user: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== AUTH ROUTES ====================
/**
 * POST /api/auth/login
 * Simple login endpoint (expects email and password in request body).
 * NOTE: For this demo we compare the provided password directly with the
 * `password_hash` column. In a real app, store hashed passwords and use
 * a secure verification method (bcrypt).
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Missing credentials' });

    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT user_id, first_name, last_name, email FROM users WHERE email = ? AND password_hash = ?',
      [email, password]
    );
    connection.release();

    if (rows.length === 0) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    // Return basic user info (no password)
    res.json({ success: true, user: rows[0] });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== BOOKINGS ROUTES ====================

/**
 * POST /api/bookings
 * Create a new booking
 */
app.post('/api/bookings', async (req, res) => {
  try {
    const { user_id, vacation_id, status = 'pending' } = req.body;
    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      'INSERT INTO bookings (user_id, vacation_id, status) VALUES (?, ?, ?)',
      [user_id, vacation_id, status]
    );
    
    connection.release();
    res.status(201).json({
      success: true,
      message: 'Booking created',
      booking_id: result.insertId
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bookings/:booking_id
 * Get a specific booking
 */
app.get('/api/bookings/:booking_id', async (req, res) => {
  try {
    const { booking_id } = req.params;
    const connection = await pool.getConnection();
    
    const [booking] = await connection.execute(
      'SELECT * FROM bookings WHERE booking_id = ?',
      [booking_id]
    );
    
    connection.release();
    
    if (booking.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    
    res.json({ success: true, data: booking[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== REVIEWS ROUTES ====================

/**
 * POST /api/reviews
 * Add a review for a vacation
 */
app.post('/api/reviews', async (req, res) => {
  try {
    const { user_id, vacation_id, rating, comment } = req.body;
    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      'INSERT INTO reviews (user_id, vacation_id, rating, comment) VALUES (?, ?, ?, ?)',
      [user_id, vacation_id, rating, comment]
    );
    
    connection.release();
    res.status(201).json({
      success: true,
      message: 'Review added',
      review_id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== MCP QUERY ROUTE ====================

app.post('/api/mcp/query', async (req, res) => {
  try {
    const question = String(req.body && req.body.question ? req.body.question : '').trim();
    if (!question) {
      return res.status(400).json({ success: false, error: 'Question is required' });
    }

    const answer = await callMcpDatabaseQuestion(question);
    return res.json({ success: true, answer, via: 'mcp' });
  } catch (error) {
    return res.status(502).json({ success: false, error: `MCP server unavailable: ${error.message}` });
  }
});

/**
 * PUT /api/vacations/:id
 * Update an existing vacation (admin only). Accepts multipart/form-data with optional `image` file.
 */
app.put('/api/vacations/:id', adminOnly, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const fields = [];
    const params = [];

    const allowed = ['title', 'description', 'destination', 'start_date', 'end_date', 'price'];
    for (const key of allowed) {
      if (req.body[key]) {
        if (key === 'price') {
          const numericPrice = Number(req.body[key]);
          if (!Number.isFinite(numericPrice) || numericPrice < 0 || numericPrice > 10000) {
            return res.status(400).json({ success: false, error: 'Price must be between 0 and 10000' });
          }
          fields.push('price = ?');
          params.push(numericPrice);
          continue;
        }

        if (key === 'start_date' || key === 'end_date') {
          fields.push(`${key} = ?`);
          params.push(toDateOnly(String(req.body[key])));
          continue;
        }

        fields.push(`${key} = ?`);
        params.push(req.body[key]);
      }
    }

    const startCandidate = req.body.start_date ? toDateOnly(String(req.body.start_date)) : null;
    const endCandidate = req.body.end_date ? toDateOnly(String(req.body.end_date)) : null;
    const today = todayDateOnly();
    if (startCandidate && startCandidate < today) {
      return res.status(400).json({ success: false, error: 'Start date cannot be in the past' });
    }
    if (startCandidate && endCandidate && endCandidate < startCandidate) {
      return res.status(400).json({ success: false, error: 'End date must be on or after start date' });
    }

    // handle image file
    if (req.file && req.file.filename) {
      const newImageUrl = req.file.filename;
      fields.push('image_url = ?');
      params.push(newImageUrl);

      // remove old file if present
      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.execute('SELECT image_url FROM vacations WHERE vacation_id = ?', [id]);
        if (rows.length > 0 && rows[0].image_url) {
          const oldPath = imageFilePathFromStored(rows[0].image_url);
          if (oldPath) {
            fs.unlink(oldPath, (err) => { if (err) console.warn('Failed to remove old image', err.message); });
          }
        }
      } finally {
        connection.release();
      }
    }

    if (fields.length === 0) return res.status(400).json({ success: false, error: 'No updatable fields provided' });

    params.push(id);
    const connection = await pool.getConnection();
    const query = `UPDATE vacations SET ${fields.join(', ')} WHERE vacation_id = ?`;
    const [result] = await connection.execute(query, params);
    connection.release();

    res.json({ success: true, message: 'Vacation updated', changedRows: result.affectedRows });
  } catch (error) {
    console.error('Error updating vacation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/vacations/:id
 * Delete a vacation (admin only).
 */
app.delete('/api/vacations/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
      // get image url to remove file
      const [rows] = await connection.execute('SELECT image_url FROM vacations WHERE vacation_id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Vacation not found' });
      }
      const imageUrl = rows[0].image_url;

      await connection.execute('DELETE FROM vacations WHERE vacation_id = ?', [id]);

      // remove file if uploaded to our uploads dir
      if (imageUrl) {
        const filePath = imageFilePathFromStored(imageUrl);
        if (filePath) {
          fs.unlink(filePath, (err) => { if (err) console.warn('Failed to remove image file', err.message); });
        }
      }
    } finally {
      connection.release();
    }

    res.json({ success: true, message: 'Vacation deleted' });
  } catch (error) {
    console.error('Error deleting vacation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== HEALTH CHECK ====================

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: pool ? 'Connected' : 'Disconnected'
  });
});

/**
 * GET /api/stats
 * Get database statistics
 */
app.get('/api/stats', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    const [vacationCount] = await connection.execute('SELECT COUNT(*) as count FROM vacations');
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
    const [likeCount] = await connection.execute('SELECT COUNT(*) as count FROM likes');
    const [bookingCount] = await connection.execute('SELECT COUNT(*) as count FROM bookings');
    const [reviewCount] = await connection.execute('SELECT COUNT(*) as count FROM reviews');
    
    connection.release();
    
    res.json({
      success: true,
      stats: {
        vacations: vacationCount[0].count,
        users: userCount[0].count,
        likes: likeCount[0].count,
        bookings: bookingCount[0].count,
        reviews: reviewCount[0].count
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/reports/vacation-likes', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT v.destination, COUNT(l.like_id) AS likes
       FROM vacations v
       LEFT JOIN likes l ON l.vacation_id = v.vacation_id
       GROUP BY v.destination
       ORDER BY likes DESC, v.destination ASC`
    );
    connection.release();
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/reports/vacation-likes.csv', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT v.destination, COUNT(l.like_id) AS likes
       FROM vacations v
       LEFT JOIN likes l ON l.vacation_id = v.vacation_id
       GROUP BY v.destination
       ORDER BY likes DESC, v.destination ASC`
    );
    connection.release();

    const csvLines = ['destination,likes'];
    for (const row of rows) {
      const destination = String(row.destination || '').replace(/"/g, '""');
      const likes = Number(row.likes || 0);
      csvLines.push(`"${destination}",${likes}`);
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="vacation-likes-report.csv"');
    res.status(200).send(csvLines.join('\n'));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// ==================== SERVER START ====================

const PORT = process.env.API_PORT || 5000;

async function startServer() {
  const connected = await initializePool();
  
  if (!connected) {
    console.log('Starting server anyway - attempting connection...');
  }
  
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║    🏖️  Vacation Website API Server Started  🏖️             ║
║                                                            ║
║    Server running on: http://localhost:${PORT}              ║
║    Environment: ${process.env.NODE_ENV || 'development'}
║    Database: ${process.env.DB_NAME || 'vacation_db'}
║    Database Port: ${process.env.DB_PORT || 3307}
║                                                            ║
╚════════════════════════════════════════════════════════════╝

Available endpoints:
  ✓ GET    /health                           - Health check
  ✓ GET    /api/stats                        - Database stats
  ✓ GET    /api/vacations                    - All vacations
  ✓ GET    /api/vacations/:id                - Single vacation
  ✓ POST   /api/vacations                    - Create vacation
  ✓ POST   /api/likes                        - Add like
  ✓ DELETE /api/likes/:user_id/:vacation_id  - Remove like
  ✓ GET    /api/users/:user_id/likes         - User's likes
  ✓ POST   /api/users                        - Create user
  ✓ POST   /api/bookings                     - Create booking
  ✓ POST   /api/reviews                      - Add review
    `);
  });
}

startServer();

module.exports = app;
