import { RequestHandler } from 'express';
import mysql from 'mysql2/promise';

export function createUsersController(getPool: () => mysql.Pool): {
  listUsers: RequestHandler;
  createUser: RequestHandler;
} {
  const listUsers: RequestHandler = async (_req, res) => {
    try {
      const pool = getPool();
      const conn = await pool.getConnection();
      const [users] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT user_id, role, first_name, last_name, email, created_at FROM users'
      );
      conn.release();
      res.json({ success: true, data: users });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  const createUser: RequestHandler = async (req, res) => {
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

      const pool = getPool();
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
  };

  return { listUsers, createUser };
}
