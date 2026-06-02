/**
 * Hosts controller — exposes the live CK Manager Agent fleet plus
 * their latest reported status (CPU/RAM/disk + install detection).
 *
 * GET /admin/hosts         — list all currently-connected hosts + status
 * GET /admin/hosts/:id     — detail for one host, 404 if not connected
 *                            or hasn't sent its first status yet
 */
import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../common/auth/admin.guard';
import { AgentsServer } from '../agents/agents.server';
import { HostsService } from './hosts.service';

@Controller('admin/hosts')
@UseGuards(AdminGuard)
export class HostsController {
  constructor(
    private readonly agents: AgentsServer,
    private readonly hostsSvc: HostsService,
  ) {}

  @Get()
  list() {
    const connected = this.agents.listConnected();
    const hosts = connected.map((h) => {
      const snap = this.hostsSvc.getSnapshot(h.hostId);
      return {
        hostId: h.hostId,
        version: h.version ?? 'unknown',
        connectedAt: h.connectedAt.toISOString(),
        state: 'online' as const,
        status: snap ?? null,
      };
    });
    return { hosts };
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    const connected = this.agents.listConnected().find((h) => h.hostId === id);
    if (!connected) {
      throw new NotFoundException(`host '${id}' is not connected`);
    }
    return {
      hostId: connected.hostId,
      version: connected.version ?? 'unknown',
      connectedAt: connected.connectedAt.toISOString(),
      state: 'online' as const,
      status: this.hostsSvc.getSnapshot(id) ?? null,
    };
  }
}
