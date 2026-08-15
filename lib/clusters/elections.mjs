import { pool } from '../db.mjs';
import logger from '../logger.mjs';

const module = 'CLUSTERS.ELECTIONS';

const leaderSchemaVersion = '20260815234400';

let lastLeader;

/**
 * Attempt to acquire or renew cluster leadership.
 *
 * @param {string} endpoint - our published address
 * @param {number} ttlSecs
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

  /**
   * @type {import('mysql2').QueryResult}
   */
  let result;

  try {
    await pool.query(sql, [
      endpoint,
      endpoint,
      leaderSchemaVersion,
      ttlSecs
    ]);

    [result] = await pool.query(
      'SELECT leader_id, leader_endpoint, schema_version, expires_at FROM cluster_leader WHERE id = 1'
    );
  } catch (e) {
    const isDeadlock = e.errno === 1213 || e.code === 'ER_LOCK_DEADLOCK';

    if (isDeadlock) {
      logger.debug({ module, eventId: 'E409C102', err: e.message }, `Leader election retry (deadlock): ${e.message}`);
      return;
    }

    // Non-transient DB failure
    logger.error({ module, eventId: '784598C6', err: e.message }, `Database error during election: ${e.message}`);

    // Degrade ourself if we are the leader
    if (lastLeader === endpoint) {
      lastLeader = undefined;
      logger.warn({ module, eventId: 'C2CEFDB6', endpoint }, 'Stepping down from leader state immediately due to DB failure');
    }

    return;
  }

  const row = result?.[0];
  if (!row) return;

  const currentLeader = row.leader_endpoint;
  const expiresAt = row.expires_at ? new Date(row.expires_at) : null;

  if (expiresAt && expiresAt.getTime() < Date.now()) {
    logger.warn({
      module,
      eventId: '8B12C203',
      leader: currentLeader,
      expiresAt: expiresAt.toISOString()
    }, `Stale leader detected in DB: ${currentLeader} expired at ${expiresAt.toISOString()}`);
  }

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
