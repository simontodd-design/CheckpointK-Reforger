import pino from 'pino';
/**
 * ck-manager-agent — per-host supervisor.
 *
 * Phase 0: connect to CK Core, log handshake.
 * Phase 1: handle spawn / kill / restart / tail / steamcmd / modio sync
 *          commands from CK Manager UI (via CK Core relay).
 *
 * Uses raw ws (not socket.io) — CK Core's gateway is built on
 * @nestjs/platform-ws for Bun compatibility.
 * Protocol: JSON messages of the form { event: 'name', data: {...} }
 */
import WebSocket from 'ws';

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
const VERSION = '0.0.1';
const RECONNECT_DELAY_MS = 5000;

if (!AGENT_TOKEN) {
  log.warn(
    'AGENT_TOKEN not set — CK Core will accept the connection if its own AGENT_TOKEN is also unset (dev only)',
  );
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
    ws.send(
      JSON.stringify({
        event: 'hello',
        data: { hostId: AGENT_HOST_ID, version: VERSION },
      }),
    );
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as { event: string; data: unknown };
      switch (msg.event) {
        case 'hello-ack':
          log.info({ data: msg.data }, 'hello ack received');
          break;
        default:
          log.info({ event: msg.event, data: msg.data }, 'message received');
      }
    } catch (err) {
      log.error({ err: String(err), raw: raw.toString() }, 'failed to parse message');
    }
  });

  ws.on('close', (code, reason) => {
    log.warn(
      { code, reason: reason.toString() },
      `connection closed — reconnecting in ${RECONNECT_DELAY_MS / 1000}s`,
    );
    setTimeout(connect, RECONNECT_DELAY_MS);
  });

  ws.on('error', (err) => {
    log.error({ err: err.message }, 'websocket error');
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
