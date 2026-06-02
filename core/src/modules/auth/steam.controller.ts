/**
 * Steam OpenID controller.
 *
 * Four endpoints power the launcher's auth flow:
 *
 *   POST /auth/steam/initiate      — launcher requests a fresh state
 *   GET  /auth/steam/start?state=  — browser starts Steam login
 *   GET  /auth/steam/callback?...  — Steam redirects here with assertion
 *   GET  /auth/steam/status?state= — launcher polls for the JWT
 *
 * State is opaque to the browser and one-shot to the launcher — anyone
 * who intercepts the URL still can't drain the token because /status
 * consumes the entry on first ok read.
 */
import {
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { SteamService } from './steam.service';

@Controller('auth/steam')
export class SteamController {
  private readonly logger = new Logger(SteamController.name);

  constructor(
    private readonly steam: SteamService,
    private readonly auth: AuthService,
  ) {}

  /** Launcher → server: "I'm about to start a Steam auth, give me a state." */
  @Post('initiate')
  initiate() {
    const state = this.auth.initiate();
    this.logger.log({ fp: this.auth.fingerprint(state) }, 'auth initiated');
    return { state };
  }

  /** Browser → Steam: build OpenID URL with state in return_to. */
  @Get('start')
  start(@Query('state') state: string | undefined, @Res() res: Response) {
    const realm = process.env.STEAM_OPENID_REALM ?? 'http://localhost:3001';
    const baseReturn =
      process.env.STEAM_OPENID_RETURN_URL ??
      'http://localhost:3001/auth/steam/callback';

    const returnTo = state
      ? `${baseReturn}?state=${encodeURIComponent(state)}`
      : baseReturn;

    const authUrl = this.steam.buildAuthUrl(returnTo, realm);
    this.logger.log(
      { fp: state ? this.auth.fingerprint(state) : null },
      'redirecting to Steam OpenID',
    );
    res.redirect(authUrl);
  }

  /** Steam → browser: verify assertion, mint JWT, show success page. */
  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === 'string') params.set(k, v);
    }
    const state = params.get('state') ?? undefined;
    // state isn't part of the openid signature, strip before verify so
    // the params we send to check_authentication exactly match what Steam
    // signed.
    params.delete('state');

    try {
      const steamId = await this.steam.verifyAssertion(params);
      const profile = await this.steam.fetchProfile(steamId);
      this.logger.log(
        {
          steamId,
          personaName: profile.personaName,
          fp: state ? this.auth.fingerprint(state) : null,
        },
        'steam auth ok',
      );

      if (state) {
        try {
          this.auth.completeAuth(state, profile);
        } catch (err) {
          this.logger.warn(
            { err: String(err) },
            'completeAuth failed (state unknown/already used)',
          );
        }
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(successHtml(profile.personaName, profile.avatarUrl, steamId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn({ err: msg }, 'steam auth failed');
      if (state) this.auth.failAuth(state, msg);
      res
        .status(400)
        .setHeader('Content-Type', 'text/html; charset=utf-8')
        .send(errorHtml(msg));
    }
  }

  /** Launcher → server: did the browser flow finish yet? */
  @Get('status')
  status(@Query('state') state: string | undefined) {
    if (!state) return { status: 'unknown' };
    return this.auth.pollStatus(state);
  }
}

function successHtml(persona: string, avatar: string, steamId: string): string {
  return `<!DOCTYPE html>
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
  <h1>Welcome, ${esc(persona)}.</h1>
  <p class="sub">Steam confirms it's you.</p>
  <div class="who">
    <img src="${esc(avatar)}" alt="">
    <div class="name">${esc(persona)}<span class="id">${esc(steamId)}</span></div>
  </div>
  <p class="hint">You can close this window and return to the launcher.</p>
</div></body></html>`;
}

function errorHtml(msg: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Checkpoint K — auth failed</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#05080b;color:#c97b70;font-family:'JetBrains Mono',monospace;}</style>
</head><body><pre>steam auth failed: ${esc(msg)}</pre></body></html>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
