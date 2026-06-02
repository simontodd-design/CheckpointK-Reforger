import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/auth/admin.guard';
import { ServersService } from './servers.service';

@Controller('admin/servers')
@UseGuards(AdminGuard)
export class ServersController {
  constructor(private readonly servers: ServersService) {}

  @Get()
  list() {
    return { servers: this.servers.list() };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const s = this.servers.get(id);
    if (!s) throw new NotFoundException(`server ${id} not found`);
    return s;
  }

  @Post(':id/start')
  async start(@Param('id') id: string) {
    try {
      return await this.servers.start(id);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : String(err));
    }
  }

  @Post(':id/stop')
  async stop(@Param('id') id: string) {
    try {
      return await this.servers.stop(id);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : String(err));
    }
  }

  @Post(':id/restart')
  async restart(@Param('id') id: string) {
    try {
      return await this.servers.restart(id);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : String(err));
    }
  }
}
