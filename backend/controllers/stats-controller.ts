import { RequestHandler } from 'express';
import mysql from 'mysql2/promise';

export function createGetStats(getPool: () => mysql.Pool): RequestHandler {
  return async (_req, res) => {
    try {
      const pool = getPool();
      const conn = await pool.getConnection();
      const [[{ count: vacations }]] = await conn.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM vacations');
      const [[{ count: users }]] = await conn.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM users');
      const [[{ count: likes }]] = await conn.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM likes');
      const [[{ count: reviews }]] = await conn.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM reviews');
      conn.release();

      res.json({ success: true, stats: { vacations, users, likes, reviews } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}
