import { RequestHandler } from 'express';
import mysql from 'mysql2/promise';

export function createGetVacationLikesReport(getPool: () => mysql.Pool): RequestHandler {
  return async (_req, res) => {
    try {
      const pool = getPool();
      const conn = await pool.getConnection();
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        `SELECT v.destination, COUNT(l.like_id) AS likes
         FROM vacations v
         LEFT JOIN likes l ON l.vacation_id = v.vacation_id
         GROUP BY v.destination
         ORDER BY likes DESC, v.destination ASC`
      );
      conn.release();
      res.json({ success: true, data: rows });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}

export function createGetVacationLikesCsv(getPool: () => mysql.Pool): RequestHandler {
  return async (_req, res) => {
    try {
      const pool = getPool();
      const conn = await pool.getConnection();
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        `SELECT v.destination, COUNT(l.like_id) AS likes
         FROM vacations v
         LEFT JOIN likes l ON l.vacation_id = v.vacation_id
         GROUP BY v.destination
         ORDER BY likes DESC, v.destination ASC`
      );
      conn.release();

      const csvLines = ['destination,likes'];
      for (const row of rows) {
        const destination = String(row.destination || '').replace(/"/g, '""');
        const likes = Number(row.likes || 0);
        csvLines.push(`"${destination}",${likes}`);
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="vacation-likes-report.csv"');
      res.status(200).send(csvLines.join('\n'));
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}
