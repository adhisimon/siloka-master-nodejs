import Fastify from 'fastify';
import uniqid from 'uniqid';
import logger from '../logger.mjs';
import { verifyApiKey } from './hooks/auth.mjs';

import heartbeatRoutes from './routes/v1/heartbeat.mjs';
import reelectRoutes from './routes/v1/reelect.mjs';

const module = 'APISERVER';

const fastifyLogger = logger.child({ module }, { level: 'warn' });

const fastify = Fastify({
  loggerInstance: fastifyLogger,
  genReqId: () => uniqid()
});

fastify.register(async (v1) => {
  v1.addHook('preHandler', verifyApiKey);

  v1.register(heartbeatRoutes);
  v1.register(reelectRoutes);
}, { prefix: '/api/v1' });

/**
 * Start Fastify HTTP Server
 *
 * @param {number} [port=8080]
 * @param {string} [host='0.0.0.0']
 * @returns {Promise<import('fastify').FastifyInstance>}
 */
const startServer = async (
  port = Number(process.env.SILOKA_HTTP_PORT) || 8080,
  host = process.env.SILOKA_HTTP_HOST || '0.0.0.0'
) => {
  try {
    await fastify.listen({ port, host });
    logger.info({ module, eventId: '90C28F10', port, host }, `API server listening on ${host}:${port}`);
  } catch (err) {
    logger.fatal({ module, eventId: 'C7A01902', err: err.message }, 'Failed to start API server');
    process.exit(1);
  }

  return fastify;
};

export { startServer };
