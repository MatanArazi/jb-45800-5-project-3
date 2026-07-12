import fs from 'fs';
import { RequestHandler } from 'express';
import mysql from 'mysql2/promise';

interface VacationHelpers {
  toDateOnly: (value: string) => string;
  todayDateOnly: () => string;
  toPublicImageUrl: (image: string | null) => string | null;
  toStoredImageFilename: (image: string | null) => string | null;
  imageFilePathFromStored: (image: string | null) => string | null;
}

export function createVacationsController(getPool: () => mysql.Pool, helpers: VacationHelpers): {
  listVacations: RequestHandler;
  getVacationById: RequestHandler;
  createVacation: RequestHandler;
  updateVacation: RequestHandler;
  deleteVacation: RequestHandler;
} {
  const listVacations: RequestHandler = async (req, res) => {
    try {
      const pool = getPool();
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

      const normalized = vacations.map((v) => ({
        ...v,
        image_url: helpers.toPublicImageUrl((v.image_url as string | null) || null),
      }));

      res.json({ success: true, count: normalized.length, total, page, limit, data: normalized });
    } catch (error: any) {
      console.error('Error fetching vacations:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  const getVacationById: RequestHandler = async (req, res) => {
    try {
      const { id } = req.params;
      const pool = getPool();
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
        data: {
          ...vacation[0],
          image_url: helpers.toPublicImageUrl((vacation[0].image_url as string | null) || null),
          total_likes: likeCount[0].total_likes,
          reviews,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  const createVacation: RequestHandler = async (req, res) => {
    try {
      const { title, description, destination, start_date, end_date, price } = req.body;

      if (!title || !description || !destination || !start_date || !end_date || price === undefined || price === null) {
        res.status(400).json({ success: false, error: 'All fields are required' });
        return;
      }

      if (!req.file?.filename) {
        res.status(400).json({ success: false, error: 'Image file is required' });
        return;
      }

      const numericPrice = Number(price);
      if (!Number.isFinite(numericPrice) || numericPrice < 0 || numericPrice > 10000) {
        res.status(400).json({ success: false, error: 'Price must be between 0 and 10000' });
        return;
      }

      const startDateOnly = helpers.toDateOnly(String(start_date));
      const endDateOnly = helpers.toDateOnly(String(end_date));
      const today = helpers.todayDateOnly();
      if (startDateOnly < today) {
        res.status(400).json({ success: false, error: 'Start date cannot be in the past' });
        return;
      }
      if (endDateOnly < startDateOnly) {
        res.status(400).json({ success: false, error: 'End date must be on or after start date' });
        return;
      }

      const created_by = req.body.created_by || req.headers['x-user-id'] || 1;
      const imageFileName: string = req.file.filename;

      const pool = getPool();
      const conn = await pool.getConnection();
      const [result] = await conn.execute<mysql.ResultSetHeader>(
        `INSERT INTO vacations (title, description, destination, start_date, end_date, price, image_url, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, description, destination, startDateOnly, endDateOnly, numericPrice, imageFileName, created_by]
      );
      conn.release();

      res.status(201).json({
        success: true,
        message: 'Vacation created',
        vacation_id: result.insertId,
        image_url: helpers.toPublicImageUrl(imageFileName),
      });
    } catch (error: any) {
      console.error('Error creating vacation:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  const updateVacation: RequestHandler = async (req, res) => {
    try {
      const { id } = req.params;
      const fields: string[] = [];
      const params: any[] = [];

      const allowed: string[] = ['title', 'description', 'destination', 'start_date', 'end_date', 'price'];
      for (const key of allowed) {
        if (req.body[key]) {
          if (key === 'price') {
            const numericPrice = Number(req.body[key]);
            if (!Number.isFinite(numericPrice) || numericPrice < 0 || numericPrice > 10000) {
              res.status(400).json({ success: false, error: 'Price must be between 0 and 10000' });
              return;
            }
            fields.push('price = ?');
            params.push(numericPrice);
            continue;
          }

          if (key === 'start_date' || key === 'end_date') {
            fields.push(`${key} = ?`);
            params.push(helpers.toDateOnly(String(req.body[key])));
            continue;
          }

          fields.push(`${key} = ?`);
          params.push(req.body[key]);
        }
      }

      const startCandidate = req.body.start_date ? helpers.toDateOnly(String(req.body.start_date)) : null;
      const endCandidate = req.body.end_date ? helpers.toDateOnly(String(req.body.end_date)) : null;
      const today = helpers.todayDateOnly();
      if (startCandidate && startCandidate < today) {
        res.status(400).json({ success: false, error: 'Start date cannot be in the past' });
        return;
      }
      if (startCandidate && endCandidate && endCandidate < startCandidate) {
        res.status(400).json({ success: false, error: 'End date must be on or after start date' });
        return;
      }

      if (req.file?.filename) {
        const newImageUrl = req.file.filename;
        fields.push('image_url = ?');
        params.push(newImageUrl);

        const pool = getPool();
        const conn = await pool.getConnection();
        try {
          const [rows] = await conn.execute<mysql.RowDataPacket[]>(
            'SELECT image_url FROM vacations WHERE vacation_id = ?',
            [id]
          );
          if (rows.length > 0 && rows[0].image_url) {
            const oldPath = helpers.imageFilePathFromStored(String(rows[0].image_url));
            if (oldPath) {
              fs.unlink(oldPath, (err) => { if (err) console.warn('Failed to remove old image', err.message); });
            }
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
      const pool = getPool();
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
  };

  const deleteVacation: RequestHandler = async (req, res) => {
    try {
      const { id } = req.params;
      const pool = getPool();
      const conn = await pool.getConnection();
      try {
        const [rows] = await conn.execute<mysql.RowDataPacket[]>(
          'SELECT image_url FROM vacations WHERE vacation_id = ?',
          [id]
        );
        if (rows.length === 0) {
          res.status(404).json({ success: false, error: 'Vacation not found' });
          return;
        }

        const imageUrl = helpers.toStoredImageFilename((rows[0].image_url as string | null) || null);
        await conn.execute('DELETE FROM vacations WHERE vacation_id = ?', [id]);

        if (imageUrl) {
          const filePath = helpers.imageFilePathFromStored(imageUrl);
          if (filePath) {
            fs.unlink(filePath, (err) => { if (err) console.warn('Failed to remove image file', err.message); });
          }
        }
      } finally {
        conn.release();
      }

      res.json({ success: true, message: 'Vacation deleted' });
    } catch (error: any) {
      console.error('Error deleting vacation:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  return { listVacations, getVacationById, createVacation, updateVacation, deleteVacation };
}
