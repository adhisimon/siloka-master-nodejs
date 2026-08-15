import logger from '../logger.mjs';

const module = 'CLUSTERS.ROSTER';

const roster = new Map();

/**
 * Record or update heartbeat from a cluster master node
 *
 * @param {string} endpoint
 * @param {Object} [metadata={}]
 * @param {string} [metadata.version]
 */
const recordHeartbeat = (endpoint, metadata = {}) => {
  roster.set(endpoint, {
    endpoint,
    version: metadata.version || 'unknown',
    lastSeen: Date.now()
  });
};

/**
 * Get active cluster master nodes
 *
 * @param {number} [ttlMs=15000]
 * @returns {Array<Object>}
 */
const getActiveRoster = (ttlMs = 15000) => {
  const now = Date.now();
  const activeList = [];

  for (const node of roster.values()) {
    if (now - node.lastSeen <= ttlMs) {
      activeList.push({
        endpoint: node.endpoint,
        version: node.version,
        lastSeen: new Date(node.lastSeen).toISOString()
      });
    }
  }

  return activeList;
};

/**
 * Purge expired nodes periodically from memory
 *
 * @param {number} [ttlMs=15000]
 * @param {number} [intervalMs=30000]
 */
const rosterCleaner = (ttlMs = 15000, intervalMs = 30000) => {
  setInterval(() => {
    const now = Date.now();
    for (const [endpoint, node] of roster.entries()) {
      if (now - node.lastSeen > ttlMs) {
        roster.delete(endpoint);
        logger.debug({
          module,
          eventId: '9F82C101',
          endpoint
        }, `Purged expired master node from roster: ${endpoint}`);
      }
    }
  }, intervalMs);
};

rosterCleaner();

export {
  recordHeartbeat,
  getActiveRoster
};
