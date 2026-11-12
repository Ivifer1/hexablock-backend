import { RegisterUseCase } from '../../src/application/use-cases/register.use-case.js';
import { DomainError } from '../../src/domain/shared/domain-error.js';
import { ErrorCode } from '../../src/domain/shared/error-code.js';
import { Password } from '../../src/domain/user/password.js';
import { Role } from '../../src/domain/user/role.js';
import { Username } from '../../src/domain/user/username.js';
import {
  FakePasswordHasher,
  FakeTokenIssuer,
  FixedClock,
  InMemoryUserRepository,
} from '../support/fakes.js';

describe('RegisterUseCase (UC-001)', () => {
  const now = new Date('2026-11-11T12:00:00.000Z');
  const input = {
    username: Username.of('ivifer'),
    password: Password.of('correct-horse'),
  };

  let users: InMemoryUserRepository;
  let register: RegisterUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    register = new RegisterUseCase(
      users,
      new FakePasswordHasher(),
      new FixedClock(now),
      new FakeTokenIssuer(),
    );
  });

  it('should_save_player_with_hashed_password_when_username_is_free', async () => {
    // Arrange: an empty repository (beforeEach).

    // Act
    await register.execute(input);

    // Assert
    expect(users.saved).toHaveLength(1);
    const saved = users.saved[0];
    expect(saved.username.equals(input.username)).toBe(true);
    expect(saved.role).toBe(Role.Player);
    expect(saved.passwordHash.toString()).toBe('hashed:correct-horse');
    expect(saved.createdAt).toEqual(now);
  });

  it('should_return_token_for_new_user_when_registration_succeeds', async () => {
    // Arrange: an empty repository (beforeEach).

    // Act
    const result = await register.execute(input);

    // Assert
    expect(result.user.id.equals(users.saved[0].id)).toBe(true);
    expect(result.accessToken).toEqual({
      token: `token-for-${result.user.id.toString()}`,
      expiresInSeconds: 604800,
    });
  });

  it('should_throw_username_taken_when_username_exists', async () => {
    // Arrange
    await register.execute(input);

    // Act
    const second = register.execute({
      username: Username.of('ivifer'),
      password: Password.of('another-password'),
    });

    // Assert
    await expect(second).rejects.toBeInstanceOf(DomainError);
    await expect(second).rejects.toMatchObject({
      code: ErrorCode.UsernameTaken,
    });
  });

  it('should_not_save_when_username_exists', async () => {
    // Arrange
    await register.execute(input);

    // Act
    await register.execute(input).catch(() => undefined);

    // Assert
    expect(users.saved).toHaveLength(1);
  });
});
