/**
 * Admin auth guard.
 *
 * Verifies the Bearer JWT (same as JwtAuthGuard) and then checks the
 * verified Steam ID against `users.is_admin` in the database. Falls
 * back to the CK_ADMIN_STEAM_IDS env allowlist for first-time bootstrap
 * (before the user row exists yet).
 *
 * Used on every CK Manager endpoint — only admins can see server state
 * or issue spawn/kill commands. The launcher's player endpoints keep
 * the lighter JwtAuthGuard.
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
import { UsersService } from '../../modules/users/users.service';
import type { RequestWithUser } from './jwt-auth.guard';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
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

    const ok = await this.users.isAdmin(claims.sub);
    if (!ok) {
      this.logger.warn(
        { steamId: claims.sub, persona: claims.persona },
        'non-admin attempted to access admin endpoint',
      );
      throw new ForbiddenException('not an admin');
    }
    return true;
  }
}
