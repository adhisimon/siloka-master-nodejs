import logger from '../../logger.mjs';

const module = 'APISERVER.AUTH';
const expectedKey = process.env.SILOKA_API_KEY;

if (!expectedKey) {
  logger.warn({ module, eventId: 'A4010001' }, 'SILOKA_API_KEY is not configured in environment');
}
/**
 * Fastify preHandler hook for ApiKey authorization
 * Format: "Authorization: ApiKey <APIKEY>"
 */
const verifyApiKey = async (request, reply) => {
  const authHeader = request.headers.authorization;

  if (!expectedKey) {
    logger.error({ module, eventId: 'A4010001' }, 'SILOKA_API_KEY is not configured in environment');
    reply.code(500).send({
      status: 'error',
      message: 'Server security configuration error'
    });

    return;
  }

  if (!authHeader) {
    reply.code(401).send({
      status: 'error',
      message: 'Missing Authorization header'
    });

    return;
  }

  const [scheme, token] = authHeader.trim().split(/\s+/);

  if (scheme !== 'ApiKey' || !token || token !== expectedKey) {
    logger.warn({
      module,
      eventId: 'A4010002',
      ip: request.ip,
      scheme
    }, `Unauthorized API key access attempt from ${request.ip}`);

    reply.code(401).send({
      status: 'error',
      message: 'Invalid or unauthorized API key'
    });
  }
};

export { verifyApiKey };
