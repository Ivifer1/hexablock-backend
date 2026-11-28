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

  it('should_reject_credentials_with_password_work_when_username_does_not_exist', async () => {
    // Arrange: password work is a proxy, not a measurement of response time.
    const tokens = new FakeTokenIssuer();
    const issue = vi.spyOn(tokens, 'issueFor');
    login = new LoginUseCase(users, hasher, tokens);
    const input = {
      username: Username.of('nobody'),
      password: Password.of('correct-horse'),
    };

    // Act
    const attempt = login.execute(input);

    // Assert
    await expect(attempt).rejects.toMatchObject({
      code: ErrorCode.InvalidCredentials,
    });
    const unknownUserWork = hasher.hashCalls + hasher.verifyCalls;
    hasher.hashCalls = 0;
    hasher.verifyCalls = 0;
    await expect(
      login.execute({
        username: Username.of('ivifer'),
        password: Password.of('wrong-horse'),
      }),
    ).rejects.toMatchObject({ code: ErrorCode.InvalidCredentials });
    expect(unknownUserWork).toBeGreaterThan(0);
    expect(hasher.hashCalls + hasher.verifyCalls).toBe(unknownUserWork);
    expect(users.saved).toEqual([stored]);
    expect(issue).not.toHaveBeenCalled();
  });
});
