// ./lib/logger.mjs
import pino from 'pino';

const isTruthy = (val) => ['true', '1', 'yes', 'on', 'y'].includes(String(val).toLowerCase().trim());

const isSystemd = process.ppid === 1;
const isTTY = Boolean(process.stdout.isTTY);
const isPretty = isTruthy(process.env.SILOKA_PRETTY_LOG) ||
  (process.env.NODE_ENV !== 'production' && isTTY && !isSystemd);

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isPretty
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname'
        }
      }
    : undefined
});

export default logger;
