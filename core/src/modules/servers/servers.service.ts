/**
 * Servers service — Reforger dedicated server instances.
 *
 * Persistence split:
 *   - DB (`servers` table): config — name, map, host, port, capacity, mods
 *   - In-memory `runtime` map: ephemeral state — state, pid, players, uptime
 *
 * Why: on Core restart we want server definitions to persist, but we can't
 * trust stale "running" flags because the actual processes live on the
 * agent. On reconnect, agents push fresh `server:state` events and we
 * mirror them in the runtime map.
 *
 * Lifecycle commands relay to the per-host agent via WebSocket. The agent
 * (stub for v1) will eventually spawn ArmaReforgerServer.exe; for now it
 * just simulates state transitions.
 */
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { DB_TOKEN, type Db } from '../../db/db.module';
import { servers, type ServerRow } from '../../db/schema';
import { AgentsServer } from '../agents/agents.server';

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

export interface CreateServerInput {
  name: string;
  mapId: string;
  hostId: string;
  port: number;
  capacity: number;
}

interface RuntimeState {
  state: ServerState;
  players: number;
  uptimeS: number;
  pid: number | null;
  lastError: string | null;
  startedAt: number | null;
}

const MAP_NAMES: Record<string, string> = {
  arland: 'Arland',
  everon: 'Everon',
  kolguyev: 'Kolguyev',
};

const DEFAULT_RUNTIME: RuntimeState = {
  state: 'stopped',
  players: 0,
  uptimeS: 0,
  pid: null,
  lastError: null,
  startedAt: null,
};

@Injectable()
export class ServersService implements OnModuleInit {
  private readonly logger = new Logger(ServersService.name);
  private readonly runtime = new Map<string, RuntimeState>();

  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly agents: AgentsServer,
  ) {}

  async onModuleInit() {
    // Wire AgentsServer's inbound state handler back to us.
    this.agents.setStateHandler((payload) =>
      this.onAgentState({
        serverId: payload.serverId,
        state: payload.state,
        pid: payload.pid ?? null,
        error: payload.error ?? null,
        players: payload.players,
      }),
    );

    // Seed dev rows if the table is empty.
    await this.maybeSeedDev();
  }

  // ── public API ───────────────────────────────────────────────────

  async list(): Promise<CkServer[]> {
    const rows = await this.db.select().from(servers);
    return rows.map((r) => this.toDto(r));
  }

  async get(id: string): Promise<CkServer | null> {
    const [row] = await this.db.select().from(servers).where(eq(servers.id, id)).limit(1);
    return row ? this.toDto(row) : null;
  }

  async create(input: CreateServerInput): Promise<CkServer> {
    const name = input.name.trim();
    if (!name) throw new BadRequestException('name required');
    if (!MAP_NAMES[input.mapId]) {
      throw new BadRequestException(`unknown mapId: ${input.mapId}`);
    }
    if (!Number.isInteger(input.port) || input.port < 1024 || input.port > 65535) {
      throw new BadRequestException('port must be an integer 1024-65535');
    }
    if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 300) {
      throw new BadRequestException('capacity must be an integer 1-300');
    }

    const portInUse = await this.db
      .select({ id: servers.id })
      .from(servers)
      .where(and(eq(servers.hostId, input.hostId), eq(servers.port, input.port)))
      .limit(1);
    if (portInUse.length > 0) {
      throw new BadRequestException(
        `port ${input.port} already in use on host ${input.hostId}`,
      );
    }

    const id = `srv-${input.mapId}-${randomUUID().slice(0, 6)}`;
    const [inserted] = await this.db
      .insert(servers)
      .values({
        id,
        name,
        mapId: input.mapId,
        hostId: input.hostId,
        port: input.port,
        capacity: input.capacity,
        modsCount: 0,
      })
      .returning();

    this.logger.log({ id, name, hostId: input.hostId, port: input.port }, 'server created');
    return this.toDto(inserted);
  }

  async start(id: string): Promise<CkServer> {
    const row = await this.requireRow(id);
    this.setRuntime(id, { state: 'starting', lastError: null });
    this.pushToAgent(row, 'server:spawn', this.spawnPayload(row));
    return this.toDto(row);
  }

  async stop(id: string): Promise<CkServer> {
    const row = await this.requireRow(id);
    const rt = this.getRuntime(id);
    this.setRuntime(id, { state: 'stopping' });
    this.pushToAgent(row, 'server:kill', { serverId: id, pid: rt.pid });
    return this.toDto(row);
  }

  async restart(id: string): Promise<CkServer> {
    const row = await this.requireRow(id);
    this.setRuntime(id, { state: 'starting', lastError: null });
    this.pushToAgent(row, 'server:restart', this.spawnPayload(row));
    return this.toDto(row);
  }

  /** Called via AgentsServer's stateHandler when an agent reports a state change. */
  onAgentState(input: {
    serverId: string;
    state: ServerState;
    pid?: number | null;
    error?: string | null;
    players?: number;
  }) {
    const patch: Partial<RuntimeState> = { state: input.state };
    if (input.pid !== undefined) patch.pid = input.pid;
    if (input.error !== undefined) patch.lastError = input.error;
    if (typeof input.players === 'number') patch.players = input.players;
    if (input.state === 'running') patch.startedAt = Date.now();
    if (input.state === 'stopped' || input.state === 'crashed') {
      patch.startedAt = null;
      patch.uptimeS = 0;
      patch.players = 0;
    }
    this.setRuntime(input.serverId, patch);
    this.logger.log(
      { id: input.serverId, state: input.state, pid: input.pid },
      'server state updated from agent',
    );
  }

  // ── private ──────────────────────────────────────────────────────

  private async requireRow(id: string): Promise<ServerRow> {
    const [row] = await this.db.select().from(servers).where(eq(servers.id, id)).limit(1);
    if (!row) throw new NotFoundException(`server ${id} not found`);
    return row;
  }

  private toDto(row: ServerRow): CkServer {
    const rt = this.getRuntime(row.id);
    const uptimeS = rt.startedAt ? Math.floor((Date.now() - rt.startedAt) / 1000) : 0;
    return {
      id: row.id,
      name: row.name,
      mapId: row.mapId,
      mapName: MAP_NAMES[row.mapId] ?? row.mapId,
      hostId: row.hostId,
      port: row.port,
      publicAddress: `127.0.0.1:${row.port}`,
      capacity: row.capacity,
      version: row.version,
      modsCount: row.modsCount,
      state: rt.state,
      players: rt.players,
      uptimeS,
      pid: rt.pid,
      lastError: rt.lastError,
    };
  }

  private getRuntime(id: string): RuntimeState {
    return this.runtime.get(id) ?? { ...DEFAULT_RUNTIME };
  }

  private setRuntime(id: string, patch: Partial<RuntimeState>): void {
    const current = this.runtime.get(id) ?? { ...DEFAULT_RUNTIME };
    this.runtime.set(id, { ...current, ...patch });
  }

  private spawnPayload(row: ServerRow) {
    return {
      serverId: row.id,
      name: row.name,
      mapId: row.mapId,
      port: row.port,
      capacity: row.capacity,
      modsCount: row.modsCount,
    };
  }

  private pushToAgent(row: ServerRow, event: string, data: unknown) {
    const delivered = this.agents.pushTo(row.hostId, event, data);
    if (!delivered) {
      this.logger.warn(
        { hostId: row.hostId, serverId: row.id, event },
        'no agent connected — command not delivered',
      );
      this.setRuntime(row.id, {
        state: 'stopped',
        lastError: `agent for host '${row.hostId}' is not connected`,
      });
    }
  }

  private async maybeSeedDev() {
    if (process.env.NODE_ENV !== 'development') return;
    const existing = await this.db.select({ id: servers.id }).from(servers).limit(1);
    if (existing.length > 0) return;

    const dev: CreateServerInput[] = [
      { name: 'CK Arland — EU 1', mapId: 'arland', hostId: 'local-dev', port: 2001, capacity: 80 },
      { name: 'CK Everon — EU 1', mapId: 'everon', hostId: 'local-dev', port: 2002, capacity: 150 },
      { name: 'CK Kolguyev — EU 1', mapId: 'kolguyev', hostId: 'local-dev', port: 2003, capacity: 80 },
    ];
    for (const cfg of dev) {
      try {
        await this.create(cfg);
      } catch (err) {
        this.logger.warn({ err: String(err) }, 'dev seed insert failed');
      }
    }
    this.logger.log('seeded dev servers (3 native maps)');
  }
}
