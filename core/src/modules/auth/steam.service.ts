/**
 * Steam OpenID 2.0 verification + profile fetch.
 *
 * Steam predates OAuth — it uses legacy OpenID 2.0. The flow:
 *
 *   1. We redirect the user to Steam's openid/login endpoint
 *   2. User authenticates with Steam
 *   3. Steam redirects back to our `return_to` URL with assertion params
 *   4. We must POST those params back to Steam with mode=check_authentication
 *      to verify the assertion is genuine (otherwise anyone could fake it)
 *   5. If valid, the claimed_id contains the steam_id (numeric, e.g.
 *      https://steamcommunity.com/openid/id/76561198000000000)
 *
 * We then use Steam's Web API (key required) to fetch persona name +
 * avatar URL for the linked Steam ID.
 *
 * No external OpenID library — Steam's flow is simple enough to do
 * manually with fetch, and we avoid a dependency on a barely-maintained
 * legacy OpenID 2.0 package.
 */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';
const STEAM_OPENID_NS = 'http://specs.openid.net/auth/2.0';
const STEAM_OPENID_IDENTIFIER_SELECT = 'http://specs.openid.net/auth/2.0/identifier_select';
const STEAM_API_BASE = 'https://api.steampowered.com';
const STEAM_CLAIMED_ID_PREFIX = 'https://steamcommunity.com/openid/id/';

export interface SteamProfile {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  profileUrl: string;
}

@Injectable()
export class SteamService {
  private readonly logger = new Logger(SteamService.name);

  /**
   * Build the URL the user's browser should visit to start the
   * Steam login flow. Steam will redirect back to `returnTo` after.
   */
  buildAuthUrl(returnTo: string, realm: string): string {
    const params = new URLSearchParams({
      'openid.ns': STEAM_OPENID_NS,
      'openid.mode': 'checkid_setup',
      'openid.return_to': returnTo,
      'openid.realm': realm,
      'openid.identity': STEAM_OPENID_IDENTIFIER_SELECT,
      'openid.claimed_id': STEAM_OPENID_IDENTIFIER_SELECT,
    });
    return `${STEAM_OPENID_URL}?${params.toString()}`;
  }

  /**
   * Verify the OpenID assertion Steam sent us by POSTing it back to
   * Steam's endpoint with mode=check_authentication. Steam responds
   * with `is_valid:true` only if the assertion is genuine.
   *
   * Returns the verified steam_id (numeric string) on success, or
   * throws BadRequestException on failure.
   */
  async verifyAssertion(rawParams: URLSearchParams): Promise<string> {
    if (rawParams.get('openid.mode') !== 'id_res') {
      throw new BadRequestException(
        `unexpected openid.mode: ${rawParams.get('openid.mode')}`,
      );
    }

    const claimedId = rawParams.get('openid.claimed_id') ?? '';
    if (!claimedId.startsWith(STEAM_CLAIMED_ID_PREFIX)) {
      throw new BadRequestException(`invalid claimed_id: ${claimedId}`);
    }
    const steamId = claimedId.slice(STEAM_CLAIMED_ID_PREFIX.length);
    if (!/^\d{17}$/.test(steamId)) {
      throw new BadRequestException(`invalid steam_id format: ${steamId}`);
    }

    const verifyParams = new URLSearchParams(rawParams);
    verifyParams.set('openid.mode', 'check_authentication');

    const res = await fetch(STEAM_OPENID_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: verifyParams.toString(),
    });
    if (!res.ok) {
      throw new BadRequestException(`steam verify HTTP ${res.status}`);
    }
    const body = await res.text();

    const isValid = body
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('is_valid:'))
      ?.slice('is_valid:'.length);

    if (isValid !== 'true') {
      this.logger.warn({ body }, 'steam assertion rejected');
      throw new BadRequestException('steam rejected the assertion');
    }

    return steamId;
  }

  /**
   * Fetch the public profile (persona name + avatar) for a verified
   * steam_id. Requires STEAM_API_KEY in env.
   */
  async fetchProfile(steamId: string): Promise<SteamProfile> {
    const apiKey = process.env.STEAM_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('STEAM_API_KEY not configured');
    }
    const url =
      `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v0002/` +
      `?key=${apiKey}&steamids=${steamId}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new BadRequestException(`steam profile fetch HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      response?: {
        players?: Array<{
          steamid: string;
          personaname: string;
          avatarfull: string;
          profileurl: string;
        }>;
      };
    };
    const player = data.response?.players?.[0];
    if (!player) {
      throw new BadRequestException(`no profile found for steam_id ${steamId}`);
    }
    return {
      steamId: player.steamid,
      personaName: player.personaname,
      avatarUrl: player.avatarfull,
      profileUrl: player.profileurl,
    };
  }
}
