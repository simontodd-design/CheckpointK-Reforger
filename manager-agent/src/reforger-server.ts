/**
 * Reforger Dedicated Server integration.
 *
 * Two modes:
 *   - real: AGENT_REFORGER_SERVER_PATH (or auto-detect) points at a working
 *     ArmaReforgerServer install. spawn() writes a config from the matching
 *     template, execa-spawns the exe, and streams stdout/stderr back.
 *   - stub: no install detected. spawn() returns a fake Stub that emits
 *     synthetic log lines on a timer. UI-equivalent to a real server.
 *
 * Caller decides what to do with the returned ReforgerProcess handle.
 */
import { spawn as nodeSpawn, type ChildProcess } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import pino from 'pino';

const log = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
      : undefined,
}).child({ module: 'reforger-server' });

const AUTO_DETECT_PATHS = [
  'C:\\ReforgerServer',
  'C:\\Program Files\\ReforgerServer',
  'D:\\ReforgerServer',
  'C:\\ArmaReforgerServer',
  'C:\\Games\\ReforgerServer',
];

const EXE_NAME = 'ArmaReforgerServer.exe';
const TEMPLATES_DIR = resolve(__dirname ?? '.', '..', '..', 'server-configs');

export interface ReforgerInstall {
  kind: 'real';
  rootDir: string;
  exePath: string;
}

export interface StubInstall {
  kind: 'stub';
}

export type InstallStatus = ReforgerInstall | StubInstall;

/**
 * Resolve the dedicated server install. Env var wins, then auto-detect.
 * Returns a stub if nothing's found — UI still works, just no real process.
 */
export function resolveInstall(): InstallStatus {
  const fromEnv = process.env.AGENT_REFORGER_SERVER_PATH?.trim();
  const candidates = fromEnv ? [fromEnv, ...AUTO_DETECT_PATHS] : AUTO_DETECT_PATHS;
  for (const root of candidates) {
    const exe = join(root, EXE_NAME);
    if (existsSync(exe)) {
      log.info({ rootDir: root, source: root === fromEnv ? 'env' : 'auto' },
        'Reforger server detected');
      return { kind: 'real', rootDir: root, exePath: exe };
    }
  }
  log.warn(
    { tried: candidates },
    'Reforger server not detected — falling back to stub spawn',
  );
  return { kind: 'stub' };
}

export interface SpawnArgs {
  serverId: string;
  name: string;
  mapId: string;
  port: number;
  capacity: number;
  adminPassword: string;
}

export interface ReforgerProcess {
  pid: number;
  configPath: string;
  /** Resolves with the exit code when the process terminates. */
  exit: Promise<number | null>;
  /** Forcefully terminate. */
  kill(): void;
  /** Subscribe to stdout/stderr lines, returns unsubscribe. */
  onLine(fn: (line: string) => void): () => void;
}

/**
 * Generate a Reforger config from the per-map template, write it under
 * <rootDir>/configs/ck/<serverId>.json, then spawn ArmaReforgerServer.exe
 * with -config pointing at it.
 */
export async function spawnReforger(
  install: ReforgerInstall,
  args: SpawnArgs,
): Promise<ReforgerProcess> {
  const tplPath = join(TEMPLATES_DIR, `${args.mapId}.template.json`);
  if (!existsSync(tplPath)) {
    throw new Error(`no config template for mapId="${args.mapId}" at ${tplPath}`);
  }
  const tpl = await readFile(tplPath, 'utf8');
  const filled = tpl
    .replace(/__SERVER_NAME__/g, escapeJson(args.name))
    .replace(/__SERVER_ID__/g, escapeJson(args.serverId))
    .replace(/__BIND_PORT__/g, String(args.port))
    .replace(/__A2S_PORT__/g, String(args.port + 1))
    .replace(/__RCON_PORT__/g, String(args.port + 10))
    .replace(/__CAPACITY__/g, String(args.capacity))
    .replace(/__ADMIN_PASSWORD__/g, escapeJson(args.adminPassword));

  // Sanity check — must still be valid JSON after substitution.
  try {
    JSON.parse(filled);
  } catch (err) {
    throw new Error(`template ${args.mapId} did not produce valid JSON: ${err}`);
  }

  const cfgDir = join(install.rootDir, 'configs', 'ck');
  await mkdir(cfgDir, { recursive: true });
  const cfgPath = join(cfgDir, `${args.serverId}.json`);
  await writeFile(cfgPath, filled, 'utf8');
  log.info({ cfgPath, serverId: args.serverId }, 'wrote server config');

  const profileDir = join(install.rootDir, 'profiles', args.serverId);
  await mkdir(profileDir, { recursive: true });

  const child = nodeSpawn(
    install.exePath,
    [
      '-config', cfgPath,
      '-profile', profileDir,
      '-logStats', '5000',
      '-keepNumOfLogs', '10',
    ],
    {
      cwd: install.rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );

  log.info(
    { pid: child.pid, serverId: args.serverId, exePath: install.exePath },
    'Reforger server spawned',
  );

  return wrap(child, cfgPath);
}

function wrap(child: ChildProcess, cfgPath: string): ReforgerProcess {
  const listeners = new Set<(line: string) => void>();
  let stdoutBuf = '';
  let stderrBuf = '';

  const emit = (line: string) => {
    for (const fn of listeners) {
      try { fn(line); } catch { /* listener owns its own errors */ }
    }
  };

  const pumpLines = (chunk: string, ref: 'stdout' | 'stderr') => {
    const buf = ref === 'stdout' ? stdoutBuf + chunk : stderrBuf + chunk;
    const parts = buf.split(/\r?\n/);
    const tail = parts.pop() ?? '';
    if (ref === 'stdout') stdoutBuf = tail;
    else stderrBuf = tail;
    for (const line of parts) {
      if (line.length > 0) emit(line);
    }
  };

  child.stdout?.on('data', (d: Buffer) => pumpLines(d.toString('utf8'), 'stdout'));
  child.stderr?.on('data', (d: Buffer) => pumpLines(d.toString('utf8'), 'stderr'));

  const exit = new Promise<number | null>((resolveExit) => {
    child.on('exit', (code) => {
      if (stdoutBuf.length > 0) { emit(stdoutBuf); stdoutBuf = ''; }
      if (stderrBuf.length > 0) { emit(stderrBuf); stderrBuf = ''; }
      log.info({ pid: child.pid, code }, 'Reforger server exited');
      resolveExit(code);
    });
  });

  return {
    pid: child.pid ?? -1,
    configPath: cfgPath,
    exit,
    kill: () => {
      if (!child.killed) child.kill('SIGTERM');
    },
    onLine: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

function escapeJson(s: string): string {
  // Inserting into already-quoted JSON string fields, so escape backslashes
  // and double quotes only.
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
