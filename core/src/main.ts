/**
 * CK Core — bootstrap.
 *
 * Phase 0 deliverable: this boots, /health returns OK, Pino logs to file,
 * Discord webhook ready for critical alerts. Real modules come in Phase 1.
 */
import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(PinoLogger));
  app.enableShutdownHooks();

  const port = Number(process.env.CK_CORE_PORT ?? 3001);
  await app.listen(port);

  console.log(`[CK Core] listening on http://localhost:${port}`);
  console.log(`[CK Core] manager UI at  http://localhost:${port}/manager`);
}

bootstrap().catch(async (err) => {
  console.error('[CK Core] bootstrap failed:', err);

  // Critical bootstrap failure — try to notify Discord if webhook is set
  const webhook = process.env.DISCORD_ALERT_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🚨 **CK Core bootstrap failed** on \`${process.env.AGENT_HOST_ID ?? 'unknown'}\`\n\`\`\`\n${String(err).slice(0, 1500)}\n\`\`\``,
        }),
      });
    } catch {}
  }

  process.exit(1);
});
