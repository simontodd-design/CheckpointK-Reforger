/**
 * Hosts service.
 *
 * Keeps the latest `host:status` snapshot per hostId, indexed by the
 * AgentsServer's inbound state handler. Snapshots are ephemeral —
 * they evaporate when the agent disconnects (real lifecycle), and
 * are refreshed every ~10s while it's connected.
 *
 * Combined with AgentsServer.listConnected(), the Manager UI gets a
 * full picture: connection state, agent version, OS/host metrics, and
 * what's installed on each box.
 */
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { AgentsServer, type HostStatusPayload } from '../agents/agents.server';

export interface HostSnapshot extends HostStatusPayload {
  receivedAt: number;
}

@Injectable()
export class HostsService implements OnModuleInit {
  private readonly logger = new Logger(HostsService.name);
  private readonly latest = new Map<string, HostSnapshot>();

  constructor(private readonly agents: AgentsServer) {}

  onModuleInit() {
    this.agents.setStatusHandler((payload) => {
      this.latest.set(payload.hostId, { ...payload, receivedAt: Date.now() });
    });
  }

  getSnapshot(hostId: string): HostSnapshot | null {
    return this.latest.get(hostId) ?? null;
  }

  allSnapshots(): HostSnapshot[] {
    return Array.from(this.latest.values());
  }

  forget(hostId: string): void {
    this.latest.delete(hostId);
  }
}
