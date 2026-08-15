import 'dotenv/config';
import logger from './lib/logger.mjs';
import { pool } from './lib/db.mjs';
import initClusterSchema from './lib/clusters/db-init.mjs';
import { electionLoop } from './lib/clusters/elections.mjs';

logger.info('Starting...');
await initClusterSchema(pool);
electionLoop(
  process.env.SILOKA_PUBLISH_ADDRESS,
  Number(process.env.SILOKA_MASTER_LEADER_TTL_SECS) || undefined,
  Number(process.env.SILOKA_MASTER_ELECTION_INTERVAL_MS) || undefined
);
