import { RequestHandler } from 'express';
import mysql from 'mysql2/promise';
import { getUserRole } from './role-utils';

export function createAdminOnly(getPool: () => mysql.Pool): RequestHandler {
  return async (req, res, next) => {
    try {
      const rawUserId = (req.headers['x-user-id'] || req.body?.created_by || req.query?.user_id) as string | undefined;
      const userId = Number(rawUserId);
      if (!Number.isInteger(userId)) {
        res.status(403).json({ success: false, error: 'Admin only' });
        return;
      }

      const role = await getUserRole(getPool(), userId);
      if (role === 'admin') {
        next();
        return;
      }

      res.status(403).json({ success: false, error: 'Admin only' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}
