import { LoginUseCase } from '../../src/application/use-cases/login.use-case.js';
import { DomainError } from '../../src/domain/shared/domain-error.js';
import { ErrorCode } from '../../src/domain/shared/error-code.js';
import { Password } from '../../src/domain/user/password.js';
import { PasswordHash } from '../../src/domain/user/password-hash.js';
import { Role } from '../../src/domain/user/role.js';
import { User } from '../../src/domain/user/user.js';
import { Username } from '../../src/domain/user/username.js';
import {
  FakePasswordHasher,
  FakeTokenIssuer,
  InMemoryUserRepository,
} from '../support/fakes.js';

describe('LoginUseCase (UC-002)', () => {
  let users: InMemoryUserRepository;
  let hasher: FakePasswordHasher;
  let login: LoginUseCase;
  let stored: User;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    stored = User.restore(
      users.nextId(),
      Username.of('ivifer'),
      PasswordHash.of('hashed:correct-horse'),
      Role.Admin,
      new Date('2026-11-11T12:00:00.000Z'),
    );
    await users.save(stored);
    login = new LoginUseCase(users, hasher, new FakeTokenIssuer());
  });

  it('should_return_user_and_token_when_credentials_are_valid', async () => {
    // Arrange
    const input = {
      username: Username.of('ivifer'),
      password: Password.of('correct-horse'),
    };

    // Act
    const result = await login.execute(input);

    // Assert
    expect(result.user.id.equals(stored.id)).toBe(true);
    expect(result.user.isAdmin()).toBe(true);
    expect(result.accessToken).toEqual({
      token: `token-for-${stored.id.toString()}`,
      expiresInSeconds: 604800,
    });
  });

  it('should_throw_invalid_credentials_when_username_does_not_exist', async () => {
    // Arrange
    const input = {
      username: Username.of('nobody'),
      password: Password.of('correct-horse'),
    };

    // Act
    const attempt = login.execute(input);

    // Assert
    await expect(attempt).rejects.toBeInstanceOf(DomainError);
    await expect(attempt).rejects.toMatchObject({
      code: ErrorCode.InvalidCredentials,
    });
  });

  it('should_throw_invalid_credentials_when_password_is_wrong', async () => {
    // Arrange
    const input = {
      username: Username.of('ivifer'),
      password: Password.of('wrong-horse'),
    };

    // Act
    const attempt = login.execute(input);

    // Assert
    await expect(attempt).rejects.toMatchObject({
      code: ErrorCode.InvalidCredentials,
    });
  });

  it('should_hash_once_when_username_does_not_exist', async () => {
    // Arrange: an unknown username must cost as much as a wrong password.
    const input = {
      username: Username.of('nobody'),
      password: Password.of('correct-horse'),
    };

    // Act
    await login.execute(input).catch(() => undefined);

    // Assert
    expect(hasher.hashCalls + hasher.verifyCalls).toBe(1);
  });
});
