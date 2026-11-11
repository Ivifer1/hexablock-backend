import { DomainError } from '../../../src/domain/shared/domain-error.js';
import { ErrorCode } from '../../../src/domain/shared/error-code.js';
import { PasswordHash } from '../../../src/domain/user/password-hash.js';
import { UserId } from '../../../src/domain/user/user-id.js';
import { Username } from '../../../src/domain/user/username.js';

function errorCodeOf(build: () => unknown): ErrorCode | undefined {
  try {
    build();
  } catch (error) {
    return error instanceof DomainError ? error.code : undefined;
  }
  return undefined;
}

describe('Username (issue #16)', () => {
  it.each(['ivi', 'ivifer_01', 'a1234567890123456789'])(
    'should_create_username_when_value_follows_the_rules (%s)',
    (raw) => {
      // Arrange + Act
      const username = Username.of(raw);

      // Assert
      expect(username.toString()).toBe(raw);
    },
  );

  it('should_throw_invalid_username_when_value_has_less_than_3_characters', () => {
    // Arrange
    const raw = 'iv';

    // Act
    const code = errorCodeOf(() => Username.of(raw));

    // Assert
    expect(code).toBe(ErrorCode.InvalidUsername);
  });

  it('should_throw_invalid_username_when_value_has_more_than_20_characters', () => {
    // Arrange
    const raw = 'a'.repeat(21);

    // Act
    const code = errorCodeOf(() => Username.of(raw));

    // Assert
    expect(code).toBe(ErrorCode.InvalidUsername);
  });

  it.each(['Ivifer', 'ivi fer', 'ivi-fer', 'ivifér'])(
    'should_throw_invalid_username_when_value_has_uppercase_or_symbols (%s)',
    (raw) => {
      // Arrange + Act
      const code = errorCodeOf(() => Username.of(raw));

      // Assert
      expect(code).toBe(ErrorCode.InvalidUsername);
    },
  );

  it('should_be_equal_when_both_usernames_have_the_same_value', () => {
    // Arrange
    const first = Username.of('ivifer');
    const second = Username.of('ivifer');
    const other = Username.of('leo');

    // Act
    const same = first.equals(second);
    const different = first.equals(other);

    // Assert
    expect(same).toBe(true);
    expect(different).toBe(false);
  });
});

describe('UserId (issue #16)', () => {
  it('should_throw_invalid_user_id_when_value_is_blank', () => {
    // Arrange
    const raw = '   ';

    // Act
    const code = errorCodeOf(() => UserId.of(raw));

    // Assert
    expect(code).toBe(ErrorCode.InvalidUserId);
  });

  it('should_keep_value_when_user_id_is_not_blank', () => {
    // Arrange
    const raw = '6730f1c2a1b2c3d4e5f60718';

    // Act
    const id = UserId.of(raw);

    // Assert
    expect(id.toString()).toBe(raw);
    expect(id.equals(UserId.of(raw))).toBe(true);
  });
});

describe('PasswordHash (issue #16)', () => {
  it('should_throw_invalid_password_hash_when_value_is_blank', () => {
    // Arrange
    const raw = '';

    // Act
    const code = errorCodeOf(() => PasswordHash.of(raw));

    // Assert
    expect(code).toBe(ErrorCode.InvalidPasswordHash);
  });
});
