import { Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../../../application/ports/token-issuer.js';
import type { GetCurrentUserUseCase } from '../../../application/use-cases/get-current-user.use-case.js';
import { DomainError } from '../../../domain/shared/domain-error.js';
import { ErrorCode } from '../../../domain/shared/error-code.js';
import { Role } from '../../../domain/user/role.js';
import { UserId } from '../../../domain/user/user-id.js';
import { GET_CURRENT_USER_USE_CASE } from './auth.tokens.js';
import { AUTH_USER_KEY } from './jwt-auth.guard.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @Inject(GET_CURRENT_USER_USE_CASE)
    private readonly currentUser: GetCurrentUserUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { [AUTH_USER_KEY]?: AuthUser }>();
    const user = request[AUTH_USER_KEY];
    if (!user) throw new DomainError(ErrorCode.AuthenticationRequired);
    const stored = await this.currentUser.execute({
      userId: UserId.of(user.id),
    });
    if (stored.role !== Role.Admin) {
      throw new DomainError(ErrorCode.AdministratorRoleRequired);
    }
    return true;
  }
}
