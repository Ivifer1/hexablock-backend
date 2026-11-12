import { DomainError } from '../../domain/shared/domain-error.js';
import { ErrorCode } from '../../domain/shared/error-code.js';
import { User } from '../../domain/user/user.js';
import { IClock } from '../ports/clock.js';
import { IPasswordHasher } from '../ports/password-hasher.js';
import { ITokenIssuer } from '../ports/token-issuer.js';
import { IUserRepository } from '../ports/user-repository.js';
import { IUseCase } from '../use-case.js';
import { AuthResult, Credentials } from './auth.models.js';

// UC-001: a player registers and is signed in.
export class RegisterUseCase implements IUseCase<Credentials, AuthResult> {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly clock: IClock,
    private readonly tokens: ITokenIssuer,
  ) {}

  async execute(input: Credentials): Promise<AuthResult> {
    const existing = await this.users.findByUsername(input.username);
    if (existing.isPresent()) {
      throw new DomainError(ErrorCode.UsernameTaken);
    }

    const user = User.create(
      this.users.nextId(),
      input.username,
      await this.hasher.hash(input.password),
      this.clock.now(),
    );
    // A registration that wins the race is still rejected here: the
    // repository raises UsernameTaken when the username was stored meanwhile.
    await this.users.save(user);

    return { user, accessToken: await this.tokens.issueFor(user) };
  }
}
