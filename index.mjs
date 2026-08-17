import 'dotenv/config';
import logger, { configureLogger } from './lib/logger.mjs';
import { pool } from './lib/db.mjs';
import initClusterSchema from './lib/clusters/db-init.mjs';
import { electionLoop } from './lib/clusters/elections.mjs';
import { fullVersion } from './lib/version.mjs';
import { startServer } from './lib/apiserver/server.mjs';
import { startHeartbeatLoop } from './lib/clusters/heartbeat-clients.mjs';
import { setupGracefulShutdown } from './lib/shutdown.mjs';
import { parseCliArgs } from './lib/cli.mjs';

const cliArgs = parseCliArgs();
configureLogger(cliArgs);

const module = 'MAIN';

const publishAddress = process.env.SILOKA_PUBLISH_ADDRESS;

logger.info({
  module,
  eventId: '21DD5B7C',
  version: fullVersion,
  publishAddress

}, 'Starting...');

await initClusterSchema(pool);

electionLoop(
  publishAddress,
  Number(process.env.SILOKA_MASTER_LEADER_TTL_SECS) || undefined,
  Number(process.env.SILOKA_MASTER_ELECTION_INTERVAL_MS) || undefined
);

const fastify = await startServer();

setupGracefulShutdown(fastify, publishAddress);
startHeartbeatLoop();
