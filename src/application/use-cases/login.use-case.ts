import { DomainError } from '../../domain/shared/domain-error.js';
import { ErrorCode } from '../../domain/shared/error-code.js';
import { IPasswordHasher } from '../ports/password-hasher.js';
import { ITokenIssuer } from '../ports/token-issuer.js';
import { IUserRepository } from '../ports/user-repository.js';
import { IUseCase } from '../use-case.js';
import { AuthResult, Credentials } from './auth.models.js';

// UC-002: a registered player signs in.
export class LoginUseCase implements IUseCase<Credentials, AuthResult> {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly tokens: ITokenIssuer,
  ) {}

  async execute(input: Credentials): Promise<AuthResult> {
    const found = await this.users.findByUsername(input.username);
    if (!found.isPresent()) {
      // BR-002-2: hash once anyway, so an unknown username takes as long as a
      // wrong password and the response time does not reveal which exists.
      await this.hasher.hash(input.password);
      throw new DomainError(ErrorCode.InvalidCredentials);
    }

    const user = found.get();
    if (!(await this.hasher.verify(input.password, user.passwordHash))) {
      throw new DomainError(ErrorCode.InvalidCredentials);
    }

    return { user, accessToken: await this.tokens.issueFor(user) };
  }
}
