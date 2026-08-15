import logger from './lib/logger.mjs';
import { pool } from './lib/db.mjs';
import initClusterSchema from './lib/clusters/db-init.mjs';

logger.info('Starting...');
await initClusterSchema(pool);
