import { GetCurrentUserUseCase } from '../../src/application/use-cases/get-current-user.use-case.js';
import { DomainError } from '../../src/domain/shared/domain-error.js';
import { ErrorCode } from '../../src/domain/shared/error-code.js';
import { PasswordHash } from '../../src/domain/user/password-hash.js';
import { User } from '../../src/domain/user/user.js';
import { UserId } from '../../src/domain/user/user-id.js';
import { Username } from '../../src/domain/user/username.js';
import { InMemoryUserRepository } from '../support/fakes.js';

describe('GetCurrentUserUseCase (UC-003)', () => {
  let users: InMemoryUserRepository;
  let getCurrentUser: GetCurrentUserUseCase;
  let stored: User;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    stored = User.create(
      users.nextId(),
      Username.of('ivifer'),
      PasswordHash.of('hashed:correct-horse'),
      new Date('2026-11-12T12:00:00.000Z'),
    );
    await users.save(stored);
    getCurrentUser = new GetCurrentUserUseCase(users);
  });

  it('should_return_user_when_it_exists', async () => {
    // Arrange
    const input = { userId: stored.id };

    // Act
    const user = await getCurrentUser.execute(input);

    // Assert
    expect(user.id.equals(stored.id)).toBe(true);
    expect(user.username.equals(stored.username)).toBe(true);
  });

  it('should_throw_authentication_required_when_user_no_longer_exists', async () => {
    // Arrange
    const input = { userId: UserId.of('user-that-was-deleted') };

    // Act
    const attempt = getCurrentUser.execute(input);

    // Assert
    await expect(attempt).rejects.toBeInstanceOf(DomainError);
    await expect(attempt).rejects.toMatchObject({
      code: ErrorCode.AuthenticationRequired,
    });
  });
});
