/**
 * Servers service — represents configured Reforger dedicated server
 * instances. Each server is bound to a host (an agent connection) and
 * to a map (arland / everon / kolguyev / workshop scenarios later).
 *
 * Phase 1: in-memory seed. Drizzle-backed in Phase 2 alongside the
 * users/characters schema.
 *
 * Lifecycle states:
 *   stopped    — config present, not running
 *   starting   — Manager issued spawn, waiting for agent ack
 *   running    — agent reports the process is alive
 *   stopping   — Manager issued kill, waiting for exit
 *   crashed    — process exited unexpectedly
 *   updating   — steamcmd / mod.io sync in progress
 */
import { Injectable } from '@nestjs/common';

export type ServerState =
  | 'stopped'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'crashed'
  | 'updating';

export interface CkServer {
  id: string;
  name: string;
  mapId: string;
  mapName: string;
  hostId: string;
  port: number;
  publicAddress: string;
  state: ServerState;
  players: number;
  capacity: number;
  uptimeS: number;
  pid: number | null;
  version: string;
  lastError: string | null;
  modsCount: number;
}

@Injectable()
export class ServersService {
  private servers: CkServer[] = [
    {
      id: 'srv-arland-01',
      name: 'CK Arland — EU 1',
      mapId: 'arland',
      mapName: 'Arland',
      hostId: 'local-dev',
      port: 2001,
      publicAddress: '127.0.0.1:2001',
      state: 'running',
      players: 38,
      capacity: 80,
      uptimeS: 14_523,
      pid: 12480,
      version: '0.1.0+r190084',
      lastError: null,
      modsCount: 14,
    },
    {
      id: 'srv-everon-01',
      name: 'CK Everon — EU 1',
      mapId: 'everon',
      mapName: 'Everon',
      hostId: 'local-dev',
      port: 2002,
      publicAddress: '127.0.0.1:2002',
      state: 'running',
      players: 117,
      capacity: 150,
      uptimeS: 38_201,
      pid: 12481,
      version: '0.1.0+r190084',
      lastError: null,
      modsCount: 14,
    },
    {
      id: 'srv-kolguyev-01',
      name: 'CK Kolguyev — EU 1',
      mapId: 'kolguyev',
      mapName: 'Kolguyev',
      hostId: 'local-dev',
      port: 2003,
      publicAddress: '127.0.0.1:2003',
      state: 'crashed',
      players: 0,
      capacity: 80,
      uptimeS: 0,
      pid: null,
      version: '0.1.0+r190084',
      lastError: 'OOM: process killed by oomkiller at 13:42:18',
      modsCount: 14,
    },
    {
      id: 'srv-everon-02',
      name: 'CK Everon — Hardcore',
      mapId: 'everon',
      mapName: 'Everon',
      hostId: 'local-dev',
      port: 2004,
      publicAddress: '127.0.0.1:2004',
      state: 'stopped',
      players: 0,
      capacity: 60,
      uptimeS: 0,
      pid: null,
      version: '0.1.0+r190084',
      lastError: null,
      modsCount: 18,
    },
  ];

  list(): CkServer[] {
    return [...this.servers];
  }

  get(id: string): CkServer | null {
    return this.servers.find((s) => s.id === id) ?? null;
  }

  /** Stub — will dispatch a spawn command to the right agent in Phase 2. */
  async start(id: string): Promise<CkServer> {
    const s = this.get(id);
    if (!s) throw new Error('server not found');
    s.state = 'starting';
    return s;
  }

  async stop(id: string): Promise<CkServer> {
    const s = this.get(id);
    if (!s) throw new Error('server not found');
    s.state = 'stopping';
    return s;
  }

  async restart(id: string): Promise<CkServer> {
    const s = this.get(id);
    if (!s) throw new Error('server not found');
    s.state = 'starting';
    return s;
  }
}
