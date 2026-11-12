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
