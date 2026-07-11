import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import mysql from 'mysql2/promise';
import multer, { StorageEngine } from 'multer';

dotenv.config({ path: path.join(__dirname, '../.env') });

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

const storage: StorageEngine = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) =>
    cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')),
});
const upload = multer({ storage });

// Database connection pool
let pool: mysql.Pool;

async function initializePool(): Promise<boolean> {
  try {
    pool = mysql.createPool({
      host: 'localhost',
      user: process.env.DB_USER || 'vacation_user',
      password: process.env.DB_PASSWORD || 'userpassword',
      database: process.env.DB_NAME || 'vacation_db',
      port: parseInt(process.env.DB_PORT || '3307'),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    console.log('✓ Database pool created successfully');
    return true;
  } catch (error: any) {
    console.error('✗ Database connection failed:', error.message);
    return false;
  }
}

// Admin middleware
const adminOnly: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req.headers['x-user-id'] || req.body?.created_by || req.query?.user_id) as string | undefined;
    if (!userId) {
      res.status(403).json({ success: false, error: 'Admin only' });
      return;
    }

    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT role FROM users WHERE user_id = ?',
        [userId]
      );
      if (rows.length > 0) {
        const r = rows[0];
        if (r.role && r.role === 'admin') {
          conn.release();
          return next();
        }
      }
    } catch (err: any) {
      console.warn('adminOnly: role check failed', err.message);
    }
    conn.release();
    res.status(403).json({ success: false, error: 'Admin only' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== VACATIONS ROUTES ====================

app.get('/api/vacations', async (req: Request, res: Response) => {
  try {
    const conn = await pool.getConnection();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 1000;
    const offset = (page - 1) * limit;
    const filter = (req.query.filter as string) || 'all';
    const userId = req.query.user_id ? parseInt(req.query.user_id as string) : null;

    const whereClauses: string[] = [];
    const params: any[] = [];

    const today = new Date().toISOString().slice(0, 10);

    if (filter === 'active') {
      whereClauses.push('v.start_date <= ? AND v.end_date >= ?');
      params.push(today, today);
    } else if (filter === 'future') {
      whereClauses.push('v.start_date > ?');
      params.push(today);
    }

    const countQuery = `
      SELECT COUNT(DISTINCT v.vacation_id) as cnt FROM vacations v
      ${filter === 'liked' && userId ? 'JOIN likes u_like ON v.vacation_id = u_like.vacation_id AND u_like.user_id = ?' : ''}
      ${whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''}
    `;
    const countParams: any[] = filter === 'liked' && userId ? [userId, ...params] : params;
    const [countRows] = await conn.execute<mysql.RowDataPacket[]>(countQuery, countParams);
    const total = (countRows[0]?.cnt as number) || 0;

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
    const mainParams: any[] = [userId || 0];
    if (filter === 'liked' && userId) mainParams.push(userId);
    mainParams.push(...params);

    const [vacations] = await conn.execute<mysql.RowDataPacket[]>(mainQuery, mainParams);
    conn.release();

    res.json({ success: true, count: vacations.length, total, page, limit, data: vacations });
  } catch (error: any) {
    console.error('Error fetching vacations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/vacations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const conn = await pool.getConnection();

    const [vacation] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT * FROM vacations WHERE vacation_id = ?',
      [id]
    );

    if (vacation.length === 0) {
      conn.release();
      res.status(404).json({ success: false, error: 'Vacation not found' });
      return;
    }

    const [reviews] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT r.*, u.first_name, u.last_name
       FROM reviews r JOIN users u ON r.user_id = u.user_id
       WHERE r.vacation_id = ? ORDER BY r.created_at DESC`,
      [id]
    );

    const [likeCount] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT COUNT(*) as total_likes FROM likes WHERE vacation_id = ?',
      [id]
    );

    conn.release();
    res.json({
      success: true,
      data: { ...vacation[0], total_likes: likeCount[0].total_likes, reviews },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/vacations', adminOnly, upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { title, description, destination, start_date, end_date, price } = req.body;
    const created_by = req.body.created_by || req.headers['x-user-id'] || 1;
    let image_url: string | null = req.body.image_url || null;
    if (req.file?.filename) {
      image_url = `/uploads/${req.file.filename}`;
    }

    const conn = await pool.getConnection();
    const [result] = await conn.execute<mysql.ResultSetHeader>(
      `INSERT INTO vacations (title, description, destination, start_date, end_date, price, image_url, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, destination, start_date, end_date, price, image_url, created_by]
    );
    conn.release();

    res.status(201).json({ success: true, message: 'Vacation created', vacation_id: result.insertId, image_url });
  } catch (error: any) {
    console.error('Error creating vacation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/vacations/:id', adminOnly, upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const fields: string[] = [];
    const params: any[] = [];

    const allowed: string[] = ['title', 'description', 'destination', 'start_date', 'end_date', 'price'];
    for (const key of allowed) {
      if (req.body[key]) {
        fields.push(`${key} = ?`);
        params.push(req.body[key]);
      }
    }

    if (req.file?.filename) {
      const newImageUrl = `/uploads/${req.file.filename}`;
      fields.push('image_url = ?');
      params.push(newImageUrl);

      const conn = await pool.getConnection();
      try {
        const [rows] = await conn.execute<mysql.RowDataPacket[]>(
          'SELECT image_url FROM vacations WHERE vacation_id = ?',
          [id]
        );
        if (rows.length > 0 && rows[0].image_url?.startsWith('/uploads/')) {
          const oldPath = path.join(__dirname, rows[0].image_url);
          fs.unlink(oldPath, (err) => { if (err) console.warn('Failed to remove old image', err.message); });
        }
      } finally {
        conn.release();
      }
    }

    if (fields.length === 0) {
      res.status(400).json({ success: false, error: 'No updatable fields provided' });
      return;
    }

    params.push(String(id));
    const conn = await pool.getConnection();
    const [result] = await conn.execute<mysql.ResultSetHeader>(
      `UPDATE vacations SET ${fields.join(', ')} WHERE vacation_id = ?`,
      params
    );
    conn.release();

    res.json({ success: true, message: 'Vacation updated', changedRows: result.affectedRows });
  } catch (error: any) {
    console.error('Error updating vacation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/vacations/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT image_url FROM vacations WHERE vacation_id = ?',
        [id]
      );
      if (rows.length === 0) {
        conn.release();
        res.status(404).json({ success: false, error: 'Vacation not found' });
        return;
      }

      const imageUrl = rows[0].image_url as string | null;
      await conn.execute('DELETE FROM vacations WHERE vacation_id = ?', [id]);

      if (imageUrl?.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, imageUrl);
        fs.unlink(filePath, (err) => { if (err) console.warn('Failed to remove image file', err.message); });
      }
    } finally {
      conn.release();
    }

    res.json({ success: true, message: 'Vacation deleted' });
  } catch (error: any) {
    console.error('Error deleting vacation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== LIKES ROUTES ====================

app.post('/api/likes', async (req: Request, res: Response) => {
  try {
    const { user_id, vacation_id } = req.body;
    const conn = await pool.getConnection();

    const [existing] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT * FROM likes WHERE user_id = ? AND vacation_id = ?',
      [user_id, vacation_id]
    );

    if (existing.length > 0) {
      conn.release();
      res.status(400).json({ success: false, error: 'Already liked' });
      return;
    }

    await conn.execute('INSERT INTO likes (user_id, vacation_id) VALUES (?, ?)', [user_id, vacation_id]);
    conn.release();
    res.status(201).json({ success: true, message: 'Like added' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/likes/:user_id/:vacation_id', async (req: Request, res: Response) => {
  try {
    const { user_id, vacation_id } = req.params;
    const conn = await pool.getConnection();
    await conn.execute('DELETE FROM likes WHERE user_id = ? AND vacation_id = ?', [user_id, vacation_id]);
    conn.release();
    res.json({ success: true, message: 'Like removed' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/users/:user_id/likes', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;
    const conn = await pool.getConnection();
    const [likes] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT v.* FROM vacations v JOIN likes l ON v.vacation_id = l.vacation_id WHERE l.user_id = ?`,
      [user_id]
    );
    conn.release();
    res.json({ success: true, data: likes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== USERS ROUTES ====================

app.get('/api/users', async (_req: Request, res: Response) => {
  try {
    const conn = await pool.getConnection();
    const [users] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT user_id, role, first_name, last_name, email, created_at FROM users'
    );
    conn.release();
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, email, password_hash } = req.body;
    if (!first_name || !last_name || !email || !password_hash) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }
    if (String(password_hash).length < 4) {
      res.status(400).json({ success: false, error: 'Password must be at least 4 characters' });
      return;
    }

    const conn = await pool.getConnection();
    const [existing] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );
    if (existing.length > 0) {
      conn.release();
      res.status(409).json({ success: false, error: 'Email already in use' });
      return;
    }

    const [result] = await conn.execute<mysql.ResultSetHeader>(
      'INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)',
      [first_name, last_name, email, password_hash]
    );
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT user_id, role, first_name, last_name, email FROM users WHERE user_id = ?',
      [result.insertId]
    );
    conn.release();
    res.status(201).json({ success: true, message: 'User created', user: rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== AUTH ROUTES ====================

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Missing credentials' });
      return;
    }

    const conn = await pool.getConnection();
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT user_id, role, first_name, last_name, email FROM users WHERE email = ? AND password_hash = ?',
      [email, password]
    );
    conn.release();

    if (rows.length === 0) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    res.json({ success: true, user: rows[0] });
  } catch (error: any) {
    console.error('Auth error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== BOOKINGS ROUTES ====================

app.post('/api/bookings', async (req: Request, res: Response) => {
  try {
    const { user_id, vacation_id, status = 'pending' } = req.body;
    const conn = await pool.getConnection();
    const [result] = await conn.execute<mysql.ResultSetHeader>(
      'INSERT INTO bookings (user_id, vacation_id, status) VALUES (?, ?, ?)',
      [user_id, vacation_id, status]
    );
    conn.release();
    res.status(201).json({ success: true, message: 'Booking created', booking_id: result.insertId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/bookings/:booking_id', async (req: Request, res: Response) => {
  try {
    const { booking_id } = req.params;
    const conn = await pool.getConnection();
    const [booking] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT * FROM bookings WHERE booking_id = ?',
      [booking_id]
    );
    conn.release();

    if (booking.length === 0) {
      res.status(404).json({ success: false, error: 'Booking not found' });
      return;
    }

    res.json({ success: true, data: booking[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== REVIEWS ROUTES ====================

app.post('/api/reviews', async (req: Request, res: Response) => {
  try {
    const { user_id, vacation_id, rating, comment } = req.body;
    const conn = await pool.getConnection();
    const [result] = await conn.execute<mysql.ResultSetHeader>(
      'INSERT INTO reviews (user_id, vacation_id, rating, comment) VALUES (?, ?, ?, ?)',
      [user_id, vacation_id, rating, comment]
    );
    conn.release();
    res.status(201).json({ success: true, message: 'Review added', review_id: result.insertId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== STATS / HEALTH ====================

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), database: pool ? 'Connected' : 'Disconnected' });
});

app.get('/api/stats', async (_req: Request, res: Response) => {
  try {
    const conn = await pool.getConnection();
    const [[{ count: vacations }]] = await conn.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM vacations');
    const [[{ count: users }]] = await conn.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM users');
    const [[{ count: likes }]] = await conn.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM likes');
    const [[{ count: bookings }]] = await conn.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM bookings');
    const [[{ count: reviews }]] = await conn.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM reviews');
    conn.release();

    res.json({ success: true, stats: { vacations, users, likes, bookings, reviews } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
});

// ==================== SERVER START ====================

const PORT = parseInt(process.env.API_PORT || '5000');

async function startServer(): Promise<void> {
  await initializePool();
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║    🏖️  Vacation Website API Server (TypeScript)  🏖️        ║
║                                                            ║
║    Server running on: http://localhost:${PORT}              ║
║    Environment: ${process.env.NODE_ENV || 'development'}
║    Database: ${process.env.DB_NAME || 'vacation_db'}
║    Database Port: ${process.env.DB_PORT || 3307}
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
  });
}

startServer();

export default app;
