import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('/health')
  health() {
    return {
      status: 'ok',
      service: 'ck-core',
      version: process.env.npm_package_version ?? '0.0.1',
      uptime_s: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
