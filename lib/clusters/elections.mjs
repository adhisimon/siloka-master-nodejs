import { pool } from '../db.mjs';
import logger from '../logger.mjs';
import { getActiveRoster } from './roster.mjs';

const module = 'CLUSTERS.ELECTIONS';

const leaderSchemaVersion = '20260815234400';

let active = true;
let lastLeader;

/**
 * Attempt to acquire or renew cluster leadership.
 *
 * @param {string?} traceId
 * @param {string} endpoint - our published address
 * @param {number} ttlSecs
 */
const tryToBeLeader = async (traceId, endpoint, ttlSecs = 15) => {
  ttlSecs = Number(process.env.SILOKA_MASTER_ELECTION_TTL_SECS) || ttlSecs;

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
    logger.error({
      module,
      eventId: '784598C6',
      traceId,
      eCode: e.code,
      eMessage: e.message || e.toString()
    }, `Database error during election: ${e.message}`);

    // Degrade ourself if we are the leader
    if (lastLeader === endpoint) {
      lastLeader = undefined;
      logger.warn({
        module,
        eventId: 'C2CEFDB6',
        traceId,
        endpoint
      }, 'Stepping down from leader state immediately due to DB failure');
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
      traceId,
      leader: currentLeader,
      expiresAt: expiresAt.toISOString()
    }, `Stale leader detected in DB: ${currentLeader} expired at ${expiresAt.toISOString()}`);
  }

  if (currentLeader !== lastLeader) {
    lastLeader = currentLeader;
    logger.info({
      module,
      eventId: '730D4301',
      traceId,
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
  if (!active) return;

  ttlSecs = Number(process.env.SILOKA_MASTER_ELECTION_TTL_SECS) || ttlSecs;
  intervalMs = Number(process.env.SILOKA_MASTER_ELECTION_INTERVAL_MS) || intervalMs;

  await tryToBeLeader('LOOP', endpoint, ttlSecs);

  if (!active) return;

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

const notifyOtherMasters = async (selfEndpoint) => {
  const roster = getActiveRoster();
  const masters = roster.masters || [];

  const targets = masters.filter(m => m.endpoint !== selfEndpoint);
  if (targets.length === 0) return;

  logger.info({
    module,
    eventId: 'D4F81001',
    count: targets.length
  }, `Broadcasting re-election signal to ${targets.length} peer master(s)`);

  const requests = targets.map(master =>
    fetch(`${master.endpoint}/api/v1/cluster/reelect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(1500)
    }).catch(err => {
      logger.warn({
        module,
        eventId: 'E8921B02',
        peer: master.endpoint,
        err: err.message
      }, `Failed to signal master ${master.endpoint}`);
    })
  );

  await Promise.allSettled(requests);
};

const abdicateLeadership = async (endpoint) => {
  if (!endpoint) return false;
  active = false;
  lastLeader = null;

  try {
    await pool.query(
      'DELETE FROM cluster_leader WHERE leader_endpoint = ?',
      [endpoint]
    );

    logger.info({
      module,
      eventId: '00B0CED9'
    }, `Leadership record cleaned up for ${endpoint}`);

    await notifyOtherMasters(endpoint);
  } catch (err) {
    logger.error({
      module,
      eventId: '11F3FD2C',
      eCode: err.code,
      errMessage: err.message || err.toString()
    }, 'Failed to delete leadership record from cluster_leader');
  }
};

export {
  tryToBeLeader,
  electionLoop,
  getCurrentLeader,
  isCurrentLeader,
  abdicateLeadership
};
