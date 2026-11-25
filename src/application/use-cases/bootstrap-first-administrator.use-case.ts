import { User } from '../../domain/user/user.js';
import type { IClock } from '../ports/clock.js';
import type {
  IInitialAdministratorRepository,
  InitialAdministratorResult,
} from '../ports/initial-administrator-repository.js';
import type { IPasswordHasher } from '../ports/password-hasher.js';
import type { IUseCase } from '../use-case.js';
import type { Credentials } from './auth.models.js';

export class BootstrapFirstAdministratorUseCase implements IUseCase<
  Credentials,
  InitialAdministratorResult
> {
  constructor(
    private readonly administrators: IInitialAdministratorRepository,
    private readonly hasher: IPasswordHasher,
    private readonly clock: IClock,
  ) {}

  async execute(input: Credentials): Promise<InitialAdministratorResult> {
    const user = User.createFirstAdministrator(
      this.administrators.firstAdministratorId(),
      input.username,
      await this.hasher.hash(input.password),
      this.clock.now(),
    );
    return this.administrators.createFirstAdministrator(user);
  }
}
