import { RequestHandler } from 'express';
import mysql from 'mysql2/promise';
import { getUserRole } from './role-utils';

export function createRejectAdminLike(getPool: () => mysql.Pool): RequestHandler {
  return async (req, res, next) => {
    try {
      const rawUserId = req.body?.user_id || req.params?.user_id;
      const userId = Number(rawUserId);
      if (!Number.isInteger(userId)) {
        res.status(400).json({ success: false, error: 'user_id and vacation_id are required' });
        return;
      }

      const role = await getUserRole(getPool(), userId);
      if (role === 'admin') {
        res.status(403).json({ success: false, error: 'Admins cannot like or unlike vacations' });
        return;
      }

      next();
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}
