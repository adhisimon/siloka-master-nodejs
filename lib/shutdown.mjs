// ./lib/shutdown.mjs

import logger from './logger.mjs';
import { abdicateLeadership } from './clusters/elections.mjs';
import { pool } from './db.mjs';

const module = 'SHUTDOWN';
let isShuttingDown = false;

/**
 * Register graceful shutdown handlers for process signals
 * @param {import('fastify').FastifyInstance} fastify
 * @param {string} selfEndpoint
 */
export function setupGracefulShutdown (fastify, selfEndpoint) {
  const handleShutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({
      module,
      eventId: 'A1820F12',
      signal
    }, `Received ${signal}, initiating graceful shutdown...`);

    const forceExitTimeout = setTimeout(() => {
      logger.error({
        module,
        eventId: 'F9210C09'
      }, 'Shutdown timed out after 10s, forcing exit');
      process.exit(1);
    }, 10000);

    try {
      logger.info({ module, eventId: 'B3012901' }, 'Step 1: Stepping down from leadership...');
      await abdicateLeadership(selfEndpoint);

      // 2. Tutup HTTP server Fastify (berhenti menerima koneksi baru)
      logger.info({ module, eventId: 'C4920202' }, 'Step 2: Closing HTTP server...');
      await fastify.close();

      logger.info({ module, eventId: 'D5920303' }, 'Step 3: Closing database connection pool...');
      await pool.end();

      logger.info({ module, eventId: 'E6920404' }, 'Graceful shutdown complete');
      clearTimeout(forceExitTimeout);
      process.exit(0);
    } catch (err) {
      logger.error({
        module,
        eventId: 'E72910AA',
        errMessage: err.message || err.toString()
      }, 'Error during graceful shutdown');

      clearTimeout(forceExitTimeout);
      process.exit(1);
    }
  };

  process.once('SIGTERM', () => handleShutdown('SIGTERM'));
  process.once('SIGINT', () => handleShutdown('SIGINT'));
}
