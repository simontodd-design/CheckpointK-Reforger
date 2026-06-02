/**
 * Per-host status sampling — CPU, memory, disk, OS info, install state.
 *
 * Pushed up to CK Core every 10s as a `host:status` event. The Manager
 * UI's Hosts page (and host detail) renders this so the operator can
 * see at a glance which hosts are ready and which are loaded.
 *
 * CPU usage is sampled by diffing `os.cpus()` ticks between samples —
 * one snapshot alone gives cumulative-since-boot, which isn't useful.
 */
import * as os from 'node:os';
import { statfs } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

export interface HostStatus {
  hostId: string;
  agentVersion: string;
  ts: number;
  osInfo: {
    platform: string;
    release: string;
    hostname: string;
    arch: string;
  };
  metrics: {
    cpuPct: number;             // 0-100, sampled across last interval
    memTotalMB: number;
    memUsedMB: number;
    memPct: number;
    uptimeS: number;            // system uptime
    diskFreeGB: number;         // free space on the install drive
    diskTotalGB: number;
  };
  reforgerServer: {
    installed: boolean;
    path: string | null;
    exePath: string | null;
  };
  steamcmd: {
    installed: boolean;
    path: string | null;
  };
}

const STEAMCMD_PATHS = [
  'C:\\steamcmd\\steamcmd.exe',
  'C:\\Program Files\\steamcmd\\steamcmd.exe',
  'C:\\Tools\\steamcmd\\steamcmd.exe',
];

let lastCpu: { idle: number; total: number } | null = null;

function sampleCpu(): number {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const c of cpus) {
    for (const t of Object.values(c.times)) total += t;
    idle += c.times.idle;
  }
  if (lastCpu === null) {
    lastCpu = { idle, total };
    return 0; // first sample has no diff yet
  }
  const idleDelta = idle - lastCpu.idle;
  const totalDelta = total - lastCpu.total;
  lastCpu = { idle, total };
  if (totalDelta <= 0) return 0;
  const usage = 1 - idleDelta / totalDelta;
  return Math.max(0, Math.min(100, Math.round(usage * 1000) / 10));
}

async function diskFor(targetPath: string): Promise<{ free: number; total: number }> {
  // statfs needs an existing path on the drive — walk up to a parent that exists.
  let probe = targetPath;
  while (probe && !existsSync(probe)) {
    const parent = dirname(probe);
    if (parent === probe) break;
    probe = parent;
  }
  if (!probe || !existsSync(probe)) return { free: 0, total: 0 };
  try {
    const s = await statfs(probe);
    return {
      free: Number(s.bavail) * Number(s.bsize),
      total: Number(s.blocks) * Number(s.bsize),
    };
  } catch {
    return { free: 0, total: 0 };
  }
}

export async function collectStatus(args: {
  hostId: string;
  agentVersion: string;
  reforgerServerPath: string | null;
  reforgerServerExe: string | null;
}): Promise<HostStatus> {
  const cpuPct = sampleCpu();
  const memTotal = os.totalmem();
  const memFree = os.freemem();
  const memUsed = memTotal - memFree;

  // Disk: probe the Reforger install drive if available, otherwise the agent's drive.
  const diskProbe = args.reforgerServerPath ?? process.cwd();
  const disk = await diskFor(diskProbe);

  // Steamcmd detection — env var wins, fall back to common paths.
  let steamcmdPath: string | null = null;
  const envSteamcmd = process.env.AGENT_STEAMCMD_PATH?.trim();
  if (envSteamcmd && existsSync(envSteamcmd)) {
    steamcmdPath = envSteamcmd;
  } else {
    for (const p of STEAMCMD_PATHS) {
      if (existsSync(p)) {
        steamcmdPath = p;
        break;
      }
    }
  }

  return {
    hostId: args.hostId,
    agentVersion: args.agentVersion,
    ts: Date.now(),
    osInfo: {
      platform: os.platform(),
      release: os.release(),
      hostname: os.hostname(),
      arch: os.arch(),
    },
    metrics: {
      cpuPct,
      memTotalMB: Math.round(memTotal / 1024 / 1024),
      memUsedMB: Math.round(memUsed / 1024 / 1024),
      memPct: Math.round((memUsed / memTotal) * 1000) / 10,
      uptimeS: Math.round(os.uptime()),
      diskFreeGB: Math.round((disk.free / 1024 / 1024 / 1024) * 10) / 10,
      diskTotalGB: Math.round((disk.total / 1024 / 1024 / 1024) * 10) / 10,
    },
    reforgerServer: {
      installed: args.reforgerServerPath !== null,
      path: args.reforgerServerPath,
      exePath: args.reforgerServerExe,
    },
    steamcmd: {
      installed: steamcmdPath !== null,
      path: steamcmdPath,
    },
  };
}
