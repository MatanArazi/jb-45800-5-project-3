import mysql from 'mysql2/promise';

export async function getUserRole(pool: mysql.Pool, userId: number): Promise<string | null> {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT role FROM users WHERE user_id = ?',
      [userId]
    );
    if (rows.length === 0) return null;
    return rows[0].role ? String(rows[0].role) : null;
  } finally {
    conn.release();
  }
}
