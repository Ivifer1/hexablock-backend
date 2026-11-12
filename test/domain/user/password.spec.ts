import { DomainError } from '../../../src/domain/shared/domain-error.js';
import { ErrorCode } from '../../../src/domain/shared/error-code.js';
import { Password } from '../../../src/domain/user/password.js';

describe('Password (UC-001, BR-001-2)', () => {
  it('should_create_password_when_value_has_8_characters', () => {
    // Arrange
    const raw = '12345678';

    // Act
    const password = Password.of(raw);

    // Assert
    expect(password.toString()).toBe(raw);
  });

  it('should_throw_invalid_password_when_emoji_make_less_than_8_characters', () => {
    // Arrange: 4 emoji are 4 characters but 8 UTF-16 code units.
    const raw = '😀😀😀😀';

    // Act
    let thrown: unknown;
    try {
      Password.of(raw);
    } catch (error) {
      thrown = error;
    }

    // Assert
    expect((thrown as DomainError).code).toBe(ErrorCode.InvalidPassword);
  });

  it('should_throw_invalid_password_when_composed_emoji_make_less_than_8_characters', () => {
    // Arrange: each family emoji is one character built from 7 code points.
    const raw = '👨‍👩‍👧'.repeat(4);

    // Act
    let thrown: unknown;
    try {
      Password.of(raw);
    } catch (error) {
      thrown = error;
    }

    // Assert
    expect((thrown as DomainError).code).toBe(ErrorCode.InvalidPassword);
  });

  it('should_create_password_when_8_emoji_are_given', () => {
    // Arrange
    const raw = '😀'.repeat(8);

    // Act
    const password = Password.of(raw);

    // Assert
    expect(password.toString()).toBe(raw);
  });

  it('should_throw_invalid_password_when_value_has_less_than_8_characters', () => {
    // Arrange
    const raw = '1234567';

    // Act
    let thrown: unknown;
    try {
      Password.of(raw);
    } catch (error) {
      thrown = error;
    }

    // Assert
    expect(thrown).toBeInstanceOf(DomainError);
    expect((thrown as DomainError).code).toBe(ErrorCode.InvalidPassword);
  });
});
