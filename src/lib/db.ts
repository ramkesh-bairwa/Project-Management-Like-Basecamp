import mysql from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

const pool = global._mysqlPool ?? mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'project_management',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

if (process.env.NODE_ENV !== 'production') global._mysqlPool = pool;

export async function query<T = unknown>(sql: string, params?: (string | number | boolean | null)[]): Promise<T> {
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}

export default pool;
