// import logger from './logger.mjs';

import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  socketPath: process.env.MYSQL_SOCKET_PATH,
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  database: process.env.MYSQL_DATABASE || 'siloka',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD,

  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

export {
  pool
};
