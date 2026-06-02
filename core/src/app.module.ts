/**
 * Root NestJS module.
 *
 * Phase 0 scope: HealthModule only.
 * Phase 1 wires in: AuthModule, CharactersModule, ManagerModule, AgentsModule,
 * LauncherModule, GatewayModule (WebSockets).
 */
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
        // Production: structured JSON to stdout, also writing to rolled file
        // via pino-roll transport (configured in src/obs/logger.ts in Phase 1).
        level: process.env.LOG_LEVEL ?? 'info',
      },
    }),
    HealthModule,
  ],
})
export class AppModule {}
