import { Optional } from '../../../src/domain/shared/optional.js';

describe('Optional (issue #16)', () => {
  it('should_return_value_when_optional_is_present', () => {
    // Arrange
    const optional = Optional.of('ivifer');

    // Act
    const value = optional.get();

    // Assert
    expect(optional.isPresent()).toBe(true);
    expect(value).toBe('ivifer');
  });

  it('should_return_fallback_when_optional_is_empty', () => {
    // Arrange
    const optional = Optional.empty<string>();

    // Act
    const value = optional.orElse('fallback');

    // Assert
    expect(optional.isPresent()).toBe(false);
    expect(value).toBe('fallback');
  });

  it('should_throw_when_getting_value_of_empty_optional', () => {
    // Arrange
    const optional = Optional.empty<string>();

    // Act
    const read = () => optional.get();

    // Assert
    expect(read).toThrow('Optional is empty');
  });
});
