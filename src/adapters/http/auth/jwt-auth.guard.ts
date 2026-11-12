import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { DomainError } from '../../../domain/shared/domain-error.js';
import { ErrorCode } from '../../../domain/shared/error-code.js';
import { JwtTokenIssuer } from '../../security/jwt-token-issuer.js';
import type { AuthUser } from './auth-user.js';

// Where the guard leaves the authenticated user for @CurrentUser().
export const AUTH_USER_KEY = 'authUser';

const BEARER = /^Bearer ([^\s]+)$/;

// Protects the 🔒 routes of the API contract (BR-003-3). A request passes
// only with "Authorization: Bearer <valid token>"; every other case gets the
// same 401, whatever the reason (BR-003-2).
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: JwtTokenIssuer) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { [AUTH_USER_KEY]?: AuthUser }>();
    const match = BEARER.exec(request.headers.authorization ?? '');
    const user = match
      ? await this.tokens.verify(match[1])
      : undefined;
    if (!user || !user.isPresent()) {
      throw new DomainError(ErrorCode.AuthenticationRequired);
    }
    request[AUTH_USER_KEY] = user.get();
    return true;
  }
}
