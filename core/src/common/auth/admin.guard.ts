/**
 * Admin auth guard.
 *
 * Extends JwtAuthGuard semantics by also requiring that the verified
 * steam_id appears in the CK_ADMIN_STEAM_IDS env (comma-separated).
 *
 * Used to gate every CK Manager endpoint — only listed operators can
 * see server state or issue spawn/kill commands. The launcher's player
 * endpoints (/characters, /maps) keep the lighter JwtAuthGuard.
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService, type CkClaims } from '../../modules/auth/auth.service';
import type { RequestWithUser } from './jwt-auth.guard';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(private readonly auth: AuthService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    const header = req.headers.authorization ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match) {
      throw new UnauthorizedException('missing bearer token');
    }
    let claims: CkClaims;
    try {
      claims = this.auth.verifyCk(match[1]);
    } catch (err) {
      this.logger.warn({ err: String(err) }, 'jwt verify failed');
      throw new UnauthorizedException('invalid or expired token');
    }
    req.user = claims;

    const adminList = (process.env.CK_ADMIN_STEAM_IDS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!adminList.includes(claims.sub)) {
      this.logger.warn(
        { steamId: claims.sub, persona: claims.persona },
        'non-admin attempted to access admin endpoint',
      );
      throw new ForbiddenException('not an admin');
    }
    return true;
  }
}
