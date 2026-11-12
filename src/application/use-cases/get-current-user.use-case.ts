import { DomainError } from '../../domain/shared/domain-error.js';
import { ErrorCode } from '../../domain/shared/error-code.js';
import { User } from '../../domain/user/user.js';
import { UserId } from '../../domain/user/user-id.js';
import { IUserRepository } from '../ports/user-repository.js';
import { IUseCase } from '../use-case.js';

export interface CurrentUserInput {
  readonly userId: UserId;
}

// UC-003: a signed-in player reads their own account.
export class GetCurrentUserUseCase
  implements IUseCase<CurrentUserInput, User>
{
  constructor(private readonly users: IUserRepository) {}

  async execute(input: CurrentUserInput): Promise<User> {
    const found = await this.users.findById(input.userId);
    if (!found.isPresent()) {
      // The token is valid, but its user was deleted: no session anymore.
      throw new DomainError(ErrorCode.AuthenticationRequired);
    }
    return found.get();
  }
}
