import { Module } from '@nestjs/common';
import { AgentsServer } from './agents.server';

@Module({
  providers: [AgentsServer],
  exports: [AgentsServer],
})
export class AgentsModule {}
