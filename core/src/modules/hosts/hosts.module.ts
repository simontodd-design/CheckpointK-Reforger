import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { AuthModule } from '../auth/auth.module';
import { HostsController } from './hosts.controller';

@Module({
  imports: [AgentsModule, AuthModule],
  controllers: [HostsController],
})
export class HostsModule {}
