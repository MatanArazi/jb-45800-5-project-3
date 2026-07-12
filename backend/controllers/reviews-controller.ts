import { RequestHandler } from 'express';
import mysql from 'mysql2/promise';

export function createAddReviewController(getPool: () => mysql.Pool): RequestHandler {
  return async (req, res) => {
    try {
      const { user_id, vacation_id, rating, comment } = req.body;
      const pool = getPool();
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
  };
}
