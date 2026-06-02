/**
 * Steam OpenID controller.
 *
 * Two endpoints:
 *   GET /auth/steam/start    — redirect browser to Steam login
 *   GET /auth/steam/callback — verify assertion, return user info
 *
 * Phase 1 bite 3: returns profile as JSON. Next bite issues JWT +
 * redirects browser to the launcher's localhost callback.
 */
import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import type { Response, Request } from 'express';
import { Req } from '@nestjs/common';
import { SteamService } from './steam.service';

@Controller('auth/steam')
export class SteamController {
  private readonly logger = new Logger(SteamController.name);

  constructor(private readonly steam: SteamService) {}

  @Get('start')
  start(
    @Query('launcher_port') launcherPort: string | undefined,
    @Res() res: Response,
  ) {
    const realm = process.env.STEAM_OPENID_REALM ?? 'http://localhost:3001';
    const baseReturn =
      process.env.STEAM_OPENID_RETURN_URL ??
      'http://localhost:3001/auth/steam/callback';

    // Pass the launcher's localhost callback port through Steam's flow
    // (preserved in return_to). Used in /callback to send the JWT back
    // to the right launcher instance. Phase 1 bite 4 wires this up.
    const returnTo = launcherPort
      ? `${baseReturn}?launcher_port=${encodeURIComponent(launcherPort)}`
      : baseReturn;

    const authUrl = this.steam.buildAuthUrl(returnTo, realm);
    this.logger.log({ returnTo }, 'redirecting to Steam OpenID');
    res.redirect(authUrl);
  }

  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response) {
    // Steam appends a long list of openid.* params to the return_to URL.
    // We need to verify ALL of them by POSTing back to Steam — req.query
    // gives us the parsed form.
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === 'string') params.set(k, v);
    }

    try {
      const steamId = await this.steam.verifyAssertion(params);
      const profile = await this.steam.fetchProfile(steamId);
      this.logger.log(
        { steamId, personaName: profile.personaName },
        'steam auth ok',
      );

      // Bite 3: HTML success page. Bite 4 will redirect to launcher
      // localhost callback with JWT instead.
      const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Checkpoint K — signed in</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: radial-gradient(ellipse at 50% 40%, #0f1b26 0%, #05080b 60%, #000 100%);
         color: #f4fafc; font-family: 'Inter', system-ui, sans-serif; }
  .card { text-align: center; max-width: 420px; padding: 32px; }
  h1 { font-family: 'Cinzel', Georgia, serif; font-size: 28px; letter-spacing: 0.06em; margin: 0 0 8px; font-weight: 500; }
  .sub { font-size: 13px; color: #5fa0bc; margin: 0 0 24px; font-style: italic; }
  .who { display: inline-flex; align-items: center; gap: 14px; padding: 16px 22px;
         border: 1px solid #1e3d4f; background: rgba(10,14,19,0.5); margin-bottom: 24px; }
  .who img { width: 56px; height: 56px; }
  .name { text-align: left; font-size: 14px; color: #f4fafc; }
  .name .id { display: block; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #5fa0bc; margin-top: 4px; }
  .hint { font-size: 12px; color: #2e5b72; }
</style></head><body>
<div class="card">
  <h1>Welcome, ${escapeHtml(profile.personaName)}.</h1>
  <p class="sub">Steam confirms it's you.</p>
  <div class="who">
    <img src="${escapeHtml(profile.avatarUrl)}" alt="">
    <div class="name">${escapeHtml(profile.personaName)}<span class="id">${escapeHtml(steamId)}</span></div>
  </div>
  <p class="hint">You can close this window and return to the launcher.</p>
</div></body></html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err) {
      this.logger.warn({ err: String(err) }, 'steam auth failed');
      res.status(400).send(
        `<pre>steam auth failed: ${escapeHtml(String(err))}</pre>`,
      );
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
