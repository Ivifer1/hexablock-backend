import { DomainError } from '../../domain/shared/domain-error.js';
import { ErrorCode } from '../../domain/shared/error-code.js';
import { Password } from '../../domain/user/password.js';
import { User } from '../../domain/user/user.js';
import { Username } from '../../domain/user/username.js';
import { IClock } from '../ports/clock.js';
import { IPasswordHasher } from '../ports/password-hasher.js';
import { AccessToken, ITokenIssuer } from '../ports/token-issuer.js';
import { IUserRepository } from '../ports/user-repository.js';
import { IUseCase } from '../use-case.js';

export interface RegisterInput {
  readonly username: Username;
  readonly password: Password;
}

export interface RegisterOutput {
  readonly user: User;
  readonly accessToken: AccessToken;
}

// UC-001: a player registers and is signed in.
export class RegisterUseCase implements IUseCase<RegisterInput, RegisterOutput> {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly clock: IClock,
    private readonly tokens: ITokenIssuer,
  ) {}

  async execute(input: RegisterInput): Promise<RegisterOutput> {
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
