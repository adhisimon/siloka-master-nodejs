import logger from '../logger.mjs';
import { getCurrentLeader, isCurrentLeader } from './elections.mjs';
import { recordHeartbeat } from './roster.mjs';
import { fullVersion } from '../version.mjs';

const module = 'CLUSTERS.HEARTBEAT-CLIENT';

const apiKey = process.env.SILOKA_API_KEY;

let heartbeatTimer = null;

/**
 * Send a single heartbeat tick (local record if leader, HTTP POST if follower)
 */
const sendHeartbeat = async () => {
  const selfEndpoint = process.env.SILOKA_PUBLISH_ADDRESS;
  const protocol = process.env.SILOKA_PUBLISH_PROTOCOL || 'http';
  const component = process.env.SILOKA_COMPONENT || 'master';

  if (!selfEndpoint) {
    logger.warn({ module, eventId: '3E870A67' }, 'SILOKA_PUBLISH_ADDRESS is not defined');
    return;
  }

  if (isCurrentLeader(selfEndpoint)) {
    // logger.debug({
    //   module,
    //   eventId: 'E5AC0EE7'
    // }, 'Sending heartbeat to ourself');

    recordHeartbeat(selfEndpoint, {
      protocol,
      component,
      version: fullVersion
    });
    return;
  }

  const leaderEndpoint = getCurrentLeader();

  if (!leaderEndpoint) {
    logger.warn({ module, eventId: 'F9BCCF0E' }, 'No active leader known yet, skipping heartbeat tick');
    return;
  }

  const payload = {
    endpoint: selfEndpoint,
    component,
    version: fullVersion
  };

  const targetUrl = `${protocol}://${leaderEndpoint}/api/v1/heartbeat`;

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${apiKey}`
      },
      body: JSON.stringify(payload),
      redirect: 'manual'
    });

    if (response.status === 307) {
      const redirectLocation = response.headers.get('location');
      logger.info({
        module,
        eventId: 'E2EB8442',
        newLocation: redirectLocation
      }, `Redirected by follower node to leader at ${redirectLocation}`);

      if (redirectLocation) {
        await fetch(redirectLocation, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `ApiKey ${apiKey}`
          },
          body: JSON.stringify(payload)
        });
      }
      return;
    }

    if (!response.ok) {
      const errText = await response.text();
      logger.warn({
        module,
        eventId: '35327E93',
        status: response.status,
        response: errText
      }, `Heartbeat rejected by leader with status ${response.status}`);
      return;
    }

    const data = await response.json();
    logger.debug({
      module,
      eventId: '7E3EEDB0',
      response: data
    }, 'Heartbeat successfully acknowledged by leader');
  } catch (err) {
    logger.error({
      module,
      eventId: 'F81670C1',
      targetUrl,
      err: err.message
    }, `Failed to send heartbeat to leader at ${targetUrl}`);
  }
};

/**
 * Start background client heartbeat loop
 *
 * @param {number} [intervalMs=5000]
 */
const startHeartbeatLoop = (intervalMs = 5000) => {
  if (heartbeatTimer) return;

  const resolvedInterval = Number(process.env.SILOKA_HEARTBEAT_INTERVAL_MS) || intervalMs;

  logger.info({
    module,
    eventId: 'CA72930E',
    intervalMs: resolvedInterval
  }, `Starting client heartbeat loop (interval: ${resolvedInterval}ms)...`);

  sendHeartbeat();
  heartbeatTimer = setInterval(sendHeartbeat, resolvedInterval);
};

/**
 * Stop background client heartbeat loop
 */
const stopHeartbeatLoop = () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    logger.info({ module, eventId: '0B36CF9E' }, 'Client heartbeat loop stopped');
  }
};

export {
  startHeartbeatLoop,
  stopHeartbeatLoop
};
