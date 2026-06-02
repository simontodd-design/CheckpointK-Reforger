/**
 * CK Core — bootstrap.
 *
 * Phase 0: /health endpoint, Pino logs.
 * Phase 1: AgentsServer (standalone ws server on CK_WS_PORT).
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

  // CORS — allow launcher (Tauri webview) + manager UI + local dev
  // Origins:
  //   http://localhost:1420 — Tauri webview in dev (Vite dev server)
  //   http://localhost:5173 — manager SvelteKit dev server
  //   tauri://localhost     — Tauri webview in production builds (Windows)
  //   https://tauri.localhost — Tauri webview in production (alt protocol)
  app.enableCors({
    origin: [
      'http://localhost:1420',
      'http://localhost:5173',
      'tauri://localhost',
      'https://tauri.localhost',
    ],
    credentials: true,
  });

  const port = Number(process.env.CK_CORE_PORT ?? 3001);
  await app.listen(port);

  const wsPort = Number(process.env.CK_WS_PORT ?? 3002);
  console.log(`[CK Core] API listening on http://localhost:${port}`);
  console.log(`[CK Core] agent WS at      ws://localhost:${wsPort}/agents`);
  console.log(`[CK Core] launcher dev →   http://localhost:1420 (run \`bun run tauri dev\` in /launcher)`);
  console.log(`[CK Core] manager dev →    http://localhost:5173 (run \`bun run dev\` in /manager)`);
}

bootstrap().catch(async (err) => {
  console.error('[CK Core] bootstrap failed:', err);

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
