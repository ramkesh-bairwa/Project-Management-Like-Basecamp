import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'project_management',
  waitForConnections: true,
  connectionLimit: 10,
});

export async function query<T = unknown>(sql: string, params?: (string | number | boolean | null)[]): Promise<T> {
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}

export default pool;
