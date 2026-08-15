import logger from '../logger.mjs';

const module = 'CLUSTERS.DB-INIT';

const DDL_CLUSTER_LEADER = `
CREATE TABLE IF NOT EXISTS cluster_leader (
    id INT PRIMARY KEY DEFAULT 1,
    leader_id VARCHAR(64) NOT NULL,
    leader_endpoint VARCHAR(255) NOT NULL,
    schema_version CHAR(14) NOT NULL,
    expires_at DATETIME NOT NULL,
    CONSTRAINT single_row CHECK (id = 1)
) ENGINE=InnoDB;
`;

/**
 * Create cluster_leader table if not exists
 *
 * @param {import('mysql2/promise').Pool} pool
 */
const initClusterSchema = async (pool) => {
  try {
    const [{ warningCount }] = await pool.query(DDL_CLUSTER_LEADER);

    if ((warningCount || 0) > 0) {
      logger.debug({
        module,
        eventId: 'CE5F2EF6'
      }, 'No need to create cluster schema');
    } else {
      logger.info({
        module,
        eventId: 'EE9E2FB8'
      }, 'Cluster schema created');
    }
  } catch (e) {
    const newE = new Error('Exception on initializing cluster schema');

    logger.fatal({
      module,
      eventId: '6A8F1405',
      eCode: e.code,
      eMessage: e.message || e.toString()
    }, newE.message);

    process.exit(1);
  }
};

export default initClusterSchema;
