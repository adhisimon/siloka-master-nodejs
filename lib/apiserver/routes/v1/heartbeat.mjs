// import logger from '../../../logger.mjs';
import { recordHeartbeat, getActiveRoster } from '../../../clusters/roster.mjs';
import { isCurrentLeader, getCurrentLeader } from '../../../clusters/elections.mjs';
import { fullVersion } from '../../../version.mjs';

/**
 * Fastify route plugin for V1 Heartbeat API
 *
 * @param {import('fastify').FastifyInstance} fastify
 */
export default async function heartbeatRoutes (fastify) {
  fastify.post('/heartbeat', async (request, reply) => {
    const { endpoint, protocol, component, version } = request.body || {};

    if (!endpoint) {
      reply.code(400).send({
        status: 'error',
        message: 'endpoint is required'
      });

      return;
    }

    const selfEndpoint = process.env.SILOKA_PUBLISH_ADDRESS;

    if (!isCurrentLeader(selfEndpoint)) {
      const activeLeader = getCurrentLeader();

      if (activeLeader) {
        reply.header('Location', `http://${activeLeader}/api/v1/heartbeat`);
      }

      reply.code(307).send({
        status: 'redirect',
        message: 'Not current cluster leader',
        leader: activeLeader || null
      });

      return;
    }

    recordHeartbeat(endpoint, { protocol, component, version });

    reply.code(200).send({
      status: 'ok',
      leaderVersion: fullVersion,
      roster: getActiveRoster()
    });
  });
}
