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

import { DbModule } from './db/db.module';
import { AgentsModule } from './modules/agents/agents.module';
import { AuthModule } from './modules/auth/auth.module';
import { CharactersModule } from './modules/characters/characters.module';
import { HealthModule } from './modules/health/health.module';
import { HostsModule } from './modules/hosts/hosts.module';
import { LogsModule } from './modules/logs/logs.module';
import { MapsModule } from './modules/maps/maps.module';
import { NewsModule } from './modules/news/news.module';
import { ServersModule } from './modules/servers/servers.module';
import { UsersModule } from './modules/users/users.module';

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
    DbModule,
    HealthModule,
    AgentsModule,
    UsersModule,
    AuthModule,
    CharactersModule,
    MapsModule,
    NewsModule,
    ServersModule,
    HostsModule,
    LogsModule,
  ],
})
export class AppModule {}
