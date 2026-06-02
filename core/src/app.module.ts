/**
 * Root NestJS module.
 *
 * Phase 0 scope: HealthModule only.
 * Phase 1 adds: AgentsModule (WebSocket gateway).
 * Later in Phase 1: AuthModule, CharactersModule, ManagerModule,
 *   LauncherModule, GatewayModule (player-side WebSockets).
 */
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { AgentsModule } from './modules/agents/agents.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
        level: process.env.LOG_LEVEL ?? 'info',
      },
    }),
    HealthModule,
    AgentsModule,
  ],
})
export class AppModule {}
