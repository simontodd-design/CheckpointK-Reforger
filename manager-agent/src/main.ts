/**
 * ck-manager-agent — per-host supervisor.
 *
 * Phase 0: connect to CK Core, log handshake.
 * Phase 1: receive spawn / kill / restart commands from CK Manager UI
 *          (relayed by CK Core), report `server:state` events back as
 *          processes transition. Real ArmaReforgerServer.exe spawn lands
 *          when steamcmd + the dedicated server config templates are in.
 *
 * Uses raw ws (not socket.io). Protocol: JSON `{event, data}` messages.
 */
import pino from 'pino';
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

interface SpawnPayload {
  serverId: string;
  name: string;
  mapId: string;
  port: number;
  capacity: number;
  modsCount: number;
}

interface KillPayload {
  serverId: string;
  pid: number | null;
}

type ServerState = 'starting' | 'running' | 'stopping' | 'stopped' | 'crashed';

/** Map of serverId → fake PID so we can simulate process lifecycle. */
const runningServers = new Map<string, number>();

let currentWs: WebSocket | null = null;

function send(event: string, data: unknown): void {
  if (!currentWs || currentWs.readyState !== WebSocket.OPEN) return;
  currentWs.send(JSON.stringify({ event, data }));
}

function reportState(
  serverId: string,
  state: ServerState,
  extra: { pid?: number | null; error?: string | null; players?: number } = {},
): void {
  send('server:state', { serverId, state, ...extra });
}

/**
 * Phase 1 stub: pretend to spawn the dedicated server. Real impl will
 * write a config json from the spawn payload, then exec:
 *   ArmaReforgerServer.exe -config <path> -profile <dir> -bindPort <port>
 * tracked via the `execa` dependency we already pull in.
 */
async function handleSpawn(payload: SpawnPayload): Promise<void> {
  log.info(
    {
      serverId: payload.serverId,
      name: payload.name,
      mapId: payload.mapId,
      port: payload.port,
    },
    '[stub] would spawn ArmaReforgerServer.exe — steamcmd integration pending',
  );

  // Pretend startup takes ~1s, then report running with a fake PID.
  reportState(payload.serverId, 'starting');
  const fakePid = 30000 + Math.floor(Math.random() * 10000);
  setTimeout(() => {
    runningServers.set(payload.serverId, fakePid);
    reportState(payload.serverId, 'running', { pid: fakePid, players: 0 });
    log.info(
      { serverId: payload.serverId, pid: fakePid },
      '[stub] server transitioned to running',
    );
  }, 1500);
}

async function handleKill(payload: KillPayload): Promise<void> {
  log.info({ serverId: payload.serverId, pid: payload.pid }, '[stub] would kill process');
  reportState(payload.serverId, 'stopping');
  setTimeout(() => {
    runningServers.delete(payload.serverId);
    reportState(payload.serverId, 'stopped', { pid: null, players: 0 });
    log.info({ serverId: payload.serverId }, '[stub] server transitioned to stopped');
  }, 1000);
}

async function handleRestart(payload: SpawnPayload): Promise<void> {
  log.info({ serverId: payload.serverId }, '[stub] restart — kill then spawn');
  reportState(payload.serverId, 'stopping');
  setTimeout(() => {
    runningServers.delete(payload.serverId);
    void handleSpawn(payload);
  }, 800);
}

function connect(): void {
  log.info({ url: CORE_WS_URL, hostId: AGENT_HOST_ID }, 'connecting to CK Core');

  const ws = new WebSocket(CORE_WS_URL, {
    headers: {
      Authorization: `Bearer ${AGENT_TOKEN}`,
      'X-CK-Host-Id': AGENT_HOST_ID,
    },
  });
  currentWs = ws;

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
        case 'server:spawn':
          void handleSpawn(msg.data as SpawnPayload);
          break;
        case 'server:kill':
          void handleKill(msg.data as KillPayload);
          break;
        case 'server:restart':
          void handleRestart(msg.data as SpawnPayload);
          break;
        default:
          log.info({ event: msg.event, data: msg.data }, 'unhandled message');
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
    currentWs = null;
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
