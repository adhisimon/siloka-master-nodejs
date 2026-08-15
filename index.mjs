import 'dotenv/config';
import logger from './lib/logger.mjs';
import { pool } from './lib/db.mjs';
import initClusterSchema from './lib/clusters/db-init.mjs';
import { electionLoop } from './lib/clusters/elections.mjs';

const module = 'MAIN';

const publishAddress = process.env.SILOKA_PUBLISH_ADDRESS;

logger.info({
  module,
  eventId: '21DD5B7C',
  publishAddress

}, 'Starting...');
await initClusterSchema(pool);
electionLoop(
  publishAddress,
  Number(process.env.SILOKA_MASTER_LEADER_TTL_SECS) || undefined,
  Number(process.env.SILOKA_MASTER_ELECTION_INTERVAL_MS) || undefined
);
