/**
 * ck-manager-agent — per-host supervisor.
 *
 * Phase 0 scope: connect to CK Core, log "hello". No process spawning yet.
 * Phase 1 implements: spawn / kill / restart / tail / steamcmd / modio sync.
 */
import { WebSocket } from 'ws';
import pino from 'pino';

const log = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
      : undefined,
});

const CORE_WS_URL = process.env.CORE_WS_URL ?? 'ws://localhost:3001/agents';
const AGENT_TOKEN = process.env.AGENT_TOKEN ?? '';
const AGENT_HOST_ID = process.env.AGENT_HOST_ID ?? 'local-dev';

if (!AGENT_TOKEN) {
  log.warn('AGENT_TOKEN not set — agent will not authenticate to CK Core');
}

function connect() {
  log.info({ url: CORE_WS_URL, hostId: AGENT_HOST_ID }, 'connecting to CK Core');

  const ws = new WebSocket(CORE_WS_URL, {
    headers: {
      Authorization: `Bearer ${AGENT_TOKEN}`,
      'X-CK-Host-Id': AGENT_HOST_ID,
    },
  });

  ws.on('open', () => {
    log.info('connected to CK Core');
    ws.send(JSON.stringify({ type: 'hello', hostId: AGENT_HOST_ID, version: '0.0.1' }));
  });

  ws.on('message', (raw) => {
    log.info({ raw: raw.toString() }, 'received from CK Core');
    // Phase 1: handle spawn/kill/restart/tail/steamcmd-update/modio-sync
  });

  ws.on('close', (code) => {
    log.warn({ code }, 'connection closed — reconnecting in 5s');
    setTimeout(connect, 5000);
  });

  ws.on('error', (err) => {
    log.error({ err }, 'websocket error');
  });
}

connect();

process.on('SIGTERM', () => {
  log.info('SIGTERM received — shutting down');
  process.exit(0);
});
process.on('SIGINT', () => {
  log.info('SIGINT received — shutting down');
  process.exit(0);
});
