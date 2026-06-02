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

interface RunningStub {
  pid: number;
  logTimer: ReturnType<typeof setInterval>;
  mapId: string;
}

/** Map of serverId → fake process so we can simulate lifecycle + logs. */
const runningServers = new Map<string, RunningStub>();

// Sample log lines that vaguely look like Reforger output. Cycled at
// random intervals to make the Manager log viewer look alive.
const SAMPLE_LINES: ((mapId: string) => string)[] = [
  () => 'ENGINE       : Tick took 14.2ms',
  () => 'GAMECODE     : SCR_PlayerController spawned for player 76561198768135680',
  () => 'NETWORK      : Replicated 213 entities to 38 clients',
  () => 'GAMECODE  (W): AI: pathfind retry on node 0x4a1f',
  (m) => `RESOURCES    : Loaded prefab "${m}/buildings/checkpoint_alpha.et" (cached)`,
  () => 'AUDIO        : Mix bus VoiceChat: 12 active streams',
  () => 'PHYSICS      : Resolved 1843 contact pairs in 0.8ms',
  () => 'GAMECODE     : Player connected: 76561198768135680 (FreddyGotFingered)',
  (m) => `SAVE         : Persisted ${m} world state to /profile/saves`,
  () => 'NETWORK   (W): Client 12 RTT 187ms exceeds threshold',
  () => 'AI           : Spawned infected wave (n=14) at grid 042-129',
  () => 'STREAM       : Streamed 28 MB of voxel terrain to 4 clients',
];

function randomLogLine(mapId: string): string {
  const tpl = SAMPLE_LINES[Math.floor(Math.random() * SAMPLE_LINES.length)];
  const t = new Date();
  const hh = String(t.getHours()).padStart(2, '0');
  const mm = String(t.getMinutes()).padStart(2, '0');
  const ss = String(t.getSeconds()).padStart(2, '0');
  const ms = String(t.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms} ${tpl(mapId)}`;
}

function startFakeLogs(serverId: string, mapId: string): ReturnType<typeof setInterval> {
  // 2-5 seconds between lines, so the viewer feels live but not noisy.
  let timer: ReturnType<typeof setInterval>;
  const tick = () => {
    send('log:line', {
      serverId,
      line: randomLogLine(mapId),
      ts: Date.now(),
    });
  };
  const schedule = () => {
    timer = setTimeout(() => {
      tick();
      schedule();
    }, 1500 + Math.random() * 2500);
  };
  schedule();
  return timer!;
}

function stopFakeLogs(serverId: string): void {
  const stub = runningServers.get(serverId);
  if (stub) clearInterval(stub.logTimer);
}

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

  reportState(payload.serverId, 'starting');
  send('log:line', {
    serverId: payload.serverId,
    line: `${nowStr()} ENGINE       : Engine boot — version 190084`,
    ts: Date.now(),
  });
  send('log:line', {
    serverId: payload.serverId,
    line: `${nowStr()} ENGINE       : Loading world "${payload.mapId}"`,
    ts: Date.now(),
  });

  const fakePid = 30000 + Math.floor(Math.random() * 10000);
  setTimeout(() => {
    const logTimer = startFakeLogs(payload.serverId, payload.mapId);
    runningServers.set(payload.serverId, { pid: fakePid, logTimer, mapId: payload.mapId });
    reportState(payload.serverId, 'running', { pid: fakePid, players: 0 });
    send('log:line', {
      serverId: payload.serverId,
      line: `${nowStr()} GAMECODE     : World ready — listening on UDP/${payload.port}`,
      ts: Date.now(),
    });
    log.info(
      { serverId: payload.serverId, pid: fakePid },
      '[stub] server transitioned to running',
    );
  }, 1500);
}

async function handleKill(payload: KillPayload): Promise<void> {
  log.info({ serverId: payload.serverId, pid: payload.pid }, '[stub] would kill process');
  reportState(payload.serverId, 'stopping');
  send('log:line', {
    serverId: payload.serverId,
    line: `${nowStr()} ENGINE       : Received SIGTERM — initiating shutdown`,
    ts: Date.now(),
  });
  setTimeout(() => {
    stopFakeLogs(payload.serverId);
    runningServers.delete(payload.serverId);
    reportState(payload.serverId, 'stopped', { pid: null, players: 0 });
    send('log:line', {
      serverId: payload.serverId,
      line: `${nowStr()} ENGINE       : Process exited cleanly`,
      ts: Date.now(),
    });
    log.info({ serverId: payload.serverId }, '[stub] server transitioned to stopped');
  }, 1000);
}

async function handleRestart(payload: SpawnPayload): Promise<void> {
  log.info({ serverId: payload.serverId }, '[stub] restart — kill then spawn');
  reportState(payload.serverId, 'stopping');
  setTimeout(() => {
    stopFakeLogs(payload.serverId);
    runningServers.delete(payload.serverId);
    void handleSpawn(payload);
  }, 800);
}

function nowStr(): string {
  const t = new Date();
  const hh = String(t.getHours()).padStart(2, '0');
  const mm = String(t.getMinutes()).padStart(2, '0');
  const ss = String(t.getSeconds()).padStart(2, '0');
  const ms = String(t.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
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
