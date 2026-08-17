// ./lib/logger.mjs
import pino from 'pino';

const isTruthy = (val) => ['true', '1', 'yes', 'on', 'y'].includes(String(val).toLowerCase().trim());
let isPretty = true;

export function createLogger (options = {}) {
  const isSystemd = process.ppid === 1;
  const isTTY = Boolean(process.stdout.isTTY);

  const forcePretty = options.pretty ?? (
    process.env.SILOKA_PRETTY_LOG ? isTruthy(process.env.SILOKA_PRETTY_LOG) : undefined
  );

  isPretty = forcePretty ?? (
    process.env.NODE_ENV !== 'production' && isTTY && !isSystemd
  );

  let level = options.logLevel || process.env.LOG_LEVEL || 'info';
  if (options.verbose) {
    level = 'debug';
  }

  return pino({
    level,
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
}

let activeLogger = createLogger();

export function configureLogger (options = {}) {
  activeLogger = createLogger(options);
}

const logger = new Proxy({}, {
  get (target, prop) {
    const val = activeLogger[prop];
    return typeof val === 'function' ? val.bind(activeLogger) : val;
  }
});

export default logger;
