/**
 * JWT auth guard for protected endpoints.
 *
 * Reads `Authorization: Bearer <token>` and attaches `req.user` with
 * the verified claims. Throws 401 on missing/invalid/expired token.
 *
 * Usage: `@UseGuards(JwtAuthGuard)` on a controller or route handler.
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, type CkClaims } from '../../modules/auth/auth.service';

export interface RequestWithUser extends Request {
  user: CkClaims;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly auth: AuthService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    const header = req.headers.authorization ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match) {
      throw new UnauthorizedException('missing bearer token');
    }
    try {
      const claims = this.auth.verifyCk(match[1]);
      req.user = claims;
      return true;
    } catch (err) {
      this.logger.warn({ err: String(err) }, 'jwt verify failed');
      throw new UnauthorizedException('invalid or expired token');
    }
  }
}
