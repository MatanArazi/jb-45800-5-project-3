import { RequestHandler } from 'express';
import mysql from 'mysql2/promise';

export function createLoginController(getPool: () => mysql.Pool): RequestHandler {
  return async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ success: false, error: 'Missing credentials' });
        return;
      }

      const pool = getPool();
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
  };
}
