/**
 * Hosts controller — exposes the live CK Manager Agent fleet.
 *
 * Each connected ck-manager-agent process appears as a host. Hosts run
 * Reforger dedicated server processes; servers (controller) reference
 * hosts via hostId.
 *
 * v1 returns the current snapshot. Live updates push down the Manager
 * WebSocket gateway in a follow-up bite.
 */
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../common/auth/admin.guard';
import { AgentsServer } from '../agents/agents.server';

@Controller('admin/hosts')
@UseGuards(AdminGuard)
export class HostsController {
  constructor(private readonly agents: AgentsServer) {}

  @Get()
  list() {
    const connected = this.agents.listConnected().map((h) => ({
      hostId: h.hostId,
      version: h.version ?? 'unknown',
      connectedAt: h.connectedAt.toISOString(),
      state: 'online' as const,
    }));
    return { hosts: connected };
  }
}
