import { pool } from '../db.mjs';
import logger from '../logger.mjs';

const module = 'CLUSTERS.ELECTIONS';

const leaderSchemaVersion = '20260815234400';

let lastLeader;

/**
 *
 * @param {string} endpoint - our published address
 * @param {number} ttlSecs
 * @returns {Promise<string>} current leader
 */
const tryToBeLeader = async (endpoint, ttlSecs) => {
  const sql = `
  -- ${module} D426CD74
  INSERT INTO cluster_leader (id, leader_id, leader_endpoint, schema_version, expires_at)
  VALUES (1, ?, ?, ?, NOW() + INTERVAL ? SECOND)
  ON DUPLICATE KEY UPDATE
    leader_id = IF(expires_at < NOW() OR leader_id = VALUES(leader_id), VALUES(leader_id), leader_id),
    leader_endpoint = IF(expires_at < NOW() OR leader_id = VALUES(leader_id), VALUES(leader_endpoint), leader_endpoint),
    schema_version = IF(expires_at < NOW() OR leader_id = VALUES(leader_id), VALUES(schema_version), schema_version),
    expires_at = IF(expires_at < NOW() OR leader_id = VALUES(leader_id), VALUES(expires_at), expires_at);
  `;

  await pool.query(sql, [
    endpoint,
    endpoint,
    leaderSchemaVersion,
    ttlSecs
  ]);

  const [result] = await pool.query('SELECT leader_id, leader_endpoint, schema_version FROM cluster_leader WHERE id = 1');
  const currentLeader = result?.[0]?.leader_endpoint;

  if (currentLeader !== lastLeader) {
    lastLeader = currentLeader;
    logger.info({
      module,
      eventId: '730D4301',
      leader: currentLeader
    }, `Current leader is: ${currentLeader}`);
  }
};

/**
 * Loop for leader election
 *
 * @param {string} endpoint
 * @param {number} ttlSecs
 * @param {number} intervalMs
 */
const electionLoop = async (endpoint, ttlSecs = 15, intervalMs = 5000) => {
  await tryToBeLeader(endpoint, ttlSecs);
  setTimeout(() => electionLoop(endpoint, ttlSecs, intervalMs), intervalMs);
};

/**
 * Get current leader's endpoint
 * @returns {string}
 */
const getCurrentLeader = () => lastLeader;

/**
 * Check if an endpoint is the current leader
 *
 * @param {string} endpoint
 * @returns {boolean}
 */
const isCurrentLeader = (endpoint) => endpoint === getCurrentLeader();

export {
  electionLoop,
  getCurrentLeader,
  isCurrentLeader
};
