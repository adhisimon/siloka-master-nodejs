import logger from '../logger.mjs';

const module = 'CLUSTERS.ROSTER';

const roster = new Map();
const VALID_COMPONENTS = new Set(['master', 'worker', 'storage', 'gateway']);

/**
 * Record or update heartbeat from a cluster master node
 *
 * @param {string} endpoint
 * @param {Object} [metadata={}]
 * @param {string} [metadata.version]
 */
const recordHeartbeat = (endpoint, metadata = {}) => {
  const component = VALID_COMPONENTS.has(metadata.component)
    ? metadata.component
    : 'master';

  // logger.debug({
  //   module,
  //   eventId: 'F7E36095',
  //   node: {
  //     endpoint,
  //     metadata
  //   }
  // }, 'Updating node information');

  roster.set(endpoint, {
    endpoint,
    component,
    protocol: metadata.protocol,
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

  const grouped = {
    masters: [],
    workers: [],
    storages: [],
    gateways: []
  };

  // logger.debug({
  //   module,
  //   eventId: '15307496'
  // }, `Number of nodes: ${roster.size} (dirty included)`);

  for (const node of roster.values()) {
    if (now - node.lastSeen <= ttlMs) {
      const nodeData = {
        endpoint: node.endpoint,
        protocol: node.protocol,
        component: node.component,
        version: node.version,
        lastSeen: new Date(node.lastSeen).toISOString()
      };

      switch (node.component) {
        case 'master':
          grouped.masters.push(nodeData);
          break;
        case 'worker':
          grouped.workers.push(nodeData);
          break;
        case 'storage':
          grouped.storages.push(nodeData);
          break;
        case 'gateway':
          grouped.gateways.push(nodeData);
          break;
      }
    }
  }

  return grouped;
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
