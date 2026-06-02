import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/auth/admin.guard';
import { ServersService, type CreateServerInput } from './servers.service';

@Controller('admin/servers')
@UseGuards(AdminGuard)
export class ServersController {
  constructor(private readonly servers: ServersService) {}

  @Get()
  list() {
    return { servers: this.servers.list() };
  }

  @Post()
  create(@Body() body: CreateServerInput) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('JSON body required');
    }
    return this.servers.create(body);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const s = this.servers.get(id);
    if (!s) throw new NotFoundException(`server ${id} not found`);
    return s;
  }

  @Post(':id/start')
  async start(@Param('id') id: string) {
    return await this.servers.start(id);
  }

  @Post(':id/stop')
  async stop(@Param('id') id: string) {
    return await this.servers.stop(id);
  }

  @Post(':id/restart')
  async restart(@Param('id') id: string) {
    return await this.servers.restart(id);
  }
}
