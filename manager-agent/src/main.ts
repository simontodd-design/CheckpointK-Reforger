/**
 * ck-manager-agent — per-host supervisor.
 *
 * Phase 0: connect to CK Core, log handshake.
 * Phase 1:
 *   - Receive spawn / kill / restart commands from CK Manager UI
 *     (relayed by CK Core).
 *   - If AGENT_REFORGER_SERVER_PATH (or auto-detect) finds a real
 *     ArmaReforgerServer install, spawn it for real with execa, tail
 *     stdout to the manager log stream.
 *   - Otherwise fall back to a synthetic stub: fake PID + scripted log
 *     lines, UI-equivalent so dev iteration doesn't require Reforger.
 *
 * Protocol with Core: JSON `{event, data}` over the agent WebSocket.
 */
import pino from 'pino';
import WebSocket from 'ws';

import {
  resolveInstall,
  spawnReforger,
  type ReforgerProcess,
  type InstallStatus,
} from './reforger-server';

const log = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
      : undefined,
});

const CORE_WS_URL = process.env.CORE_WS_URL ?? 'ws://localhost:3002/agents';
const AGENT_TOKEN = process.env.AGENT_TOKEN ?? '';
const AGENT_HOST_ID = process.env.AGENT_HOST_ID ?? 'local-dev';
const ADMIN_PASSWORD = process.env.RCON_ADMIN_PASSWORD ?? 'dev-admin';
const VERSION = '0.0.1';
const RECONNECT_DELAY_MS = 5000;

const install: InstallStatus = resolveInstall();
log.info({ mode: install.kind }, 'spawn mode resolved');

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

interface RunningServer {
  serverId: string;
  mode: 'real' | 'stub';
  // Real-server fields:
  proc?: ReforgerProcess;
  unsubLines?: () => void;
  // Stub-server fields:
  stubPid?: number;
  stubTimer?: ReturnType<typeof setTimeout>;
  // Shared:
  mapId: string;
}

const running = new Map<string, RunningServer>();
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

function sendLine(serverId: string, line: string, ts: number = Date.now()): void {
  send('log:line', { serverId, line, ts });
}

function nowStr(): string {
  const t = new Date();
  const hh = String(t.getHours()).padStart(2, '0');
  const mm = String(t.getMinutes()).padStart(2, '0');
  const ss = String(t.getSeconds()).padStart(2, '0');
  const ms = String(t.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

// ── stub log generator ──────────────────────────────────────────────

const STUB_LINES: ((mapId: string) => string)[] = [
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

function startStubLogs(serverId: string, mapId: string): ReturnType<typeof setTimeout> {
  const tick = () => {
    const tpl = STUB_LINES[Math.floor(Math.random() * STUB_LINES.length)];
    sendLine(serverId, `${nowStr()} ${tpl(mapId)}`);
    schedule();
  };
  let timer: ReturnType<typeof setTimeout>;
  const schedule = () => {
    timer = setTimeout(tick, 1500 + Math.random() * 2500);
  };
  schedule();
  return timer!;
}

// ── spawn / kill / restart ──────────────────────────────────────────

async function handleSpawn(payload: SpawnPayload): Promise<void> {
  if (running.has(payload.serverId)) {
    log.warn({ serverId: payload.serverId }, 'already running, ignoring spawn');
    return;
  }

  reportState(payload.serverId, 'starting');
  sendLine(payload.serverId, `${nowStr()} AGENT        : spawn requested (mode=${install.kind})`);

  if (install.kind === 'real') {
    try {
      const proc = await spawnReforger(install, {
        serverId: payload.serverId,
        name: payload.name,
        mapId: payload.mapId,
        port: payload.port,
        capacity: payload.capacity,
        adminPassword: ADMIN_PASSWORD,
      });

      const unsubLines = proc.onLine((line) => sendLine(payload.serverId, line));
      running.set(payload.serverId, {
        serverId: payload.serverId,
        mode: 'real',
        mapId: payload.mapId,
        proc,
        unsubLines,
      });
      reportState(payload.serverId, 'running', { pid: proc.pid, players: 0 });
      sendLine(payload.serverId, `${nowStr()} AGENT        : Reforger booting (PID ${proc.pid}) — config ${proc.configPath}`);

      // Watch for unexpected exits.
      void proc.exit.then((code) => {
        const stub = running.get(payload.serverId);
        if (!stub) return; // already cleaned up by kill/restart
        running.delete(payload.serverId);
        unsubLines();
        const crashed = code !== 0 && code !== null;
        reportState(payload.serverId, crashed ? 'crashed' : 'stopped', {
          pid: null,
          error: crashed ? `Reforger exited with code ${code}` : null,
        });
        sendLine(
          payload.serverId,
          `${nowStr()} AGENT        : Reforger process exited (code=${code})`,
        );
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({ err: msg, serverId: payload.serverId }, 'real spawn failed');
      reportState(payload.serverId, 'crashed', { pid: null, error: msg });
      sendLine(payload.serverId, `${nowStr()} AGENT     (E): spawn failed: ${msg}`);
    }
    return;
  }

  // Stub path
  sendLine(payload.serverId, `${nowStr()} ENGINE       : Engine boot — version 190084`);
  sendLine(payload.serverId, `${nowStr()} ENGINE       : Loading world "${payload.mapId}"`);

  const fakePid = 30000 + Math.floor(Math.random() * 10000);
  setTimeout(() => {
    if (!running.has(payload.serverId)) {
      // Killed before stub finished "starting"
      return;
    }
    const stubTimer = startStubLogs(payload.serverId, payload.mapId);
    running.set(payload.serverId, {
      serverId: payload.serverId,
      mode: 'stub',
      mapId: payload.mapId,
      stubPid: fakePid,
      stubTimer,
    });
    reportState(payload.serverId, 'running', { pid: fakePid, players: 0 });
    sendLine(
      payload.serverId,
      `${nowStr()} GAMECODE     : World ready — listening on UDP/${payload.port}`,
    );
  }, 1500);

  // Mark presence eagerly so a fast kill can find us.
  running.set(payload.serverId, {
    serverId: payload.serverId,
    mode: 'stub',
    mapId: payload.mapId,
    stubPid: fakePid,
  });
}

async function handleKill(payload: KillPayload): Promise<void> {
  const entry = running.get(payload.serverId);
  if (!entry) {
    log.warn({ serverId: payload.serverId }, 'kill for unknown server');
    reportState(payload.serverId, 'stopped', { pid: null });
    return;
  }
  reportState(payload.serverId, 'stopping');
  sendLine(payload.serverId, `${nowStr()} AGENT        : kill requested`);

  if (entry.mode === 'real' && entry.proc) {
    entry.proc.kill();
    // proc.exit handler in handleSpawn will fire reportState('stopped')
    return;
  }

  // Stub
  if (entry.stubTimer) clearTimeout(entry.stubTimer);
  setTimeout(() => {
    running.delete(payload.serverId);
    reportState(payload.serverId, 'stopped', { pid: null, players: 0 });
    sendLine(payload.serverId, `${nowStr()} ENGINE       : Process exited cleanly`);
  }, 600);
}

async function handleRestart(payload: SpawnPayload): Promise<void> {
  const entry = running.get(payload.serverId);
  if (entry) {
    await handleKill({ serverId: payload.serverId, pid: null });
    // Wait briefly so the kill's "stopped" event lands before we re-spawn.
    setTimeout(() => void handleSpawn(payload), 800);
  } else {
    await handleSpawn(payload);
  }
}

// ── connection management ───────────────────────────────────────────

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
    ws.send(JSON.stringify({
      event: 'hello',
      data: { hostId: AGENT_HOST_ID, version: VERSION },
    }));
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

function shutdown(signal: string): void {
  log.info({ signal }, 'shutdown — killing running servers');
  for (const entry of running.values()) {
    if (entry.mode === 'real' && entry.proc) {
      try { entry.proc.kill(); } catch { /* best effort */ }
    } else if (entry.stubTimer) {
      clearTimeout(entry.stubTimer);
    }
  }
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
