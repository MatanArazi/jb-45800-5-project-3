import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: 'localhost',
      user: process.env.DB_USER || 'vacation_user',
      password: process.env.DB_PASSWORD || 'userpassword',
      database: process.env.DB_NAME || 'vacation_db',
      port: parseInt(process.env.DB_PORT || '3307', 10),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  return pool;
}

export async function answerDatabaseQuestion(question: string): Promise<{ answer: string; rows?: unknown[] }> {
  const q = question.trim().toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  const conn = await getPool().getConnection();

  try {
    if ((q.includes('how many') || q.includes('כמה') || q.includes('active')) && (q.includes('vacation') || q.includes('vacations') || q.includes('rn'))) {
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT COUNT(*) AS count FROM vacations WHERE start_date <= ? AND end_date >= ?',
        [today, today]
      );

      return { answer: `There are currently ${rows[0]?.count || 0} active vacations.` };
    }

    if ((q.includes('average') || q.includes('avg') || q.includes('ממוצע')) && q.includes('price')) {
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT ROUND(AVG(price), 2) AS avg_price FROM vacations'
      );

      return { answer: `The average vacation price is $${rows[0]?.avg_price || 0}.` };
    }

    if ((q.includes('future') || q.includes('upcoming')) && (q.includes('europe') || q.includes('european') || q.includes('אירופ'))) {
      const europeTerms = [
        '%france%', '%italy%', '%spain%', '%uk%', '%united kingdom%', '%portugal%', '%germany%',
        '%netherlands%', '%switzerland%', '%greece%', '%austria%', '%belgium%', '%iceland%', '%norway%',
        '%paris%', '%rome%', '%barcelona%', '%london%', '%interlaken%', '%reykjavik%'
      ];
      const whereEurope = europeTerms.map(() => 'LOWER(destination) LIKE ?').join(' OR ');
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        `SELECT title, destination, start_date, end_date, price
         FROM vacations
         WHERE start_date > ? AND (${whereEurope})
         ORDER BY start_date ASC
         LIMIT 20`,
        [today, ...europeTerms]
      );

      if (rows.length === 0) {
        return { answer: 'No future Europe vacations were found.', rows: [] };
      }

      const summary = rows
        .map((row) => `${row.title} (${row.destination}) - $${row.price}`)
        .join('; ');

      return { answer: `Found ${rows.length} future Europe vacations: ${summary}`, rows };
    }

    return {
      answer: 'MCP server could not map this question to a supported database query yet. Try: active count, average price, or future vacations in Europe.',
    };
  } finally {
    conn.release();
  }
}