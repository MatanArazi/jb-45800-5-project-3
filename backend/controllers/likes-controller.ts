import { RequestHandler } from 'express';
import mysql from 'mysql2/promise';

interface LikesControllerDeps {
  getPool: () => mysql.Pool;
  toPublicImageUrl: (image: string | null) => string | null;
}

export function createLikesController({ getPool, toPublicImageUrl }: LikesControllerDeps): {
  addLike: RequestHandler;
  removeLike: RequestHandler;
  getUserLikes: RequestHandler;
} {
  const addLike: RequestHandler = async (req, res) => {
    try {
      const { user_id, vacation_id } = req.body;
      const userId = Number(user_id);
      const vacationId = Number(vacation_id);
      if (!Number.isInteger(userId) || !Number.isInteger(vacationId)) {
        res.status(400).json({ success: false, error: 'user_id and vacation_id are required' });
        return;
      }

      const pool = getPool();
      const conn = await pool.getConnection();

      const [existing] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT * FROM likes WHERE user_id = ? AND vacation_id = ?',
        [userId, vacationId]
      );

      if (existing.length > 0) {
        conn.release();
        res.status(400).json({ success: false, error: 'Already liked' });
        return;
      }

      await conn.execute('INSERT INTO likes (user_id, vacation_id) VALUES (?, ?)', [userId, vacationId]);
      conn.release();
      res.status(201).json({ success: true, message: 'Like added' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  const removeLike: RequestHandler = async (req, res) => {
    try {
      const { user_id, vacation_id } = req.params;
      const userId = Number(user_id);
      const vacationId = Number(vacation_id);
      if (!Number.isInteger(userId) || !Number.isInteger(vacationId)) {
        res.status(400).json({ success: false, error: 'user_id and vacation_id are required' });
        return;
      }

      const pool = getPool();
      const conn = await pool.getConnection();
      await conn.execute('DELETE FROM likes WHERE user_id = ? AND vacation_id = ?', [userId, vacationId]);
      conn.release();
      res.json({ success: true, message: 'Like removed' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  const getUserLikes: RequestHandler = async (req, res) => {
    try {
      const { user_id } = req.params;
      const pool = getPool();
      const conn = await pool.getConnection();
      const [likes] = await conn.execute<mysql.RowDataPacket[]>(
        `SELECT v.* FROM vacations v JOIN likes l ON v.vacation_id = l.vacation_id WHERE l.user_id = ?`,
        [user_id]
      );
      conn.release();
      const normalized = likes.map((v) => ({
        ...v,
        image_url: toPublicImageUrl((v.image_url as string | null) || null),
      }));
      res.json({ success: true, data: normalized });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  return { addLike, removeLike, getUserLikes };
}
