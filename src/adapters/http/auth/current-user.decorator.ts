import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from './auth-user.js';
import { AUTH_USER_KEY } from './jwt-auth.guard.js';

// Hands a controller method the user that JwtAuthGuard authenticated. Only
// valid on routes protected by that guard.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { [AUTH_USER_KEY]: AuthUser }>();
    return request[AUTH_USER_KEY];
  },
);
