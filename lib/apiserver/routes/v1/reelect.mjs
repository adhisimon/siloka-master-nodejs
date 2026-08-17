// ./lib/apiserver/routes/v1/reelect.mjs

import { tryToBeLeader } from '../../../clusters/elections.mjs';

const selfEndpoint = process.env.SILOKA_PUBLISH_ADDRESS;

export default async function reelectRoutes (fastify) {
  fastify.post('/cluster/reelect', { logLevel: 'info' }, async (request, reply) => {
    const traceId = request?.id;

    reply.code(202).send({
      status: 'ok',
      traceId,
      message: 'Re-election attempt queued'
    });

    tryToBeLeader(traceId, selfEndpoint);
  });
}
