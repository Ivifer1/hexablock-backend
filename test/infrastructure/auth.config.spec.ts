import { readAuthConfig } from '../../src/infrastructure/config/auth.config.js';

// 32 bytes: the minimum key length for HS256 (RFC 7518, section 3.2).
const STRONG_SECRET = 'a-test-secret-of-32-bytes-length';

describe('readAuthConfig (UC-001, BR-001-6)', () => {
  it('should_return_secret_and_expiry_when_both_are_set', () => {
    // Arrange
    const env = { JWT_SECRET: STRONG_SECRET, JWT_EXPIRES_IN: '3600' };

    // Act
    const config = readAuthConfig(env);

    // Assert
    expect(config).toEqual({
      jwtSecret: STRONG_SECRET,
      jwtExpiresInSeconds: 3600,
    });
  });

  it('should_default_expiry_to_7_days_when_not_set', () => {
    // Arrange
    const env = { JWT_SECRET: STRONG_SECRET };

    // Act
    const config = readAuthConfig(env);

    // Assert
    expect(config.jwtExpiresInSeconds).toBe(604800);
  });

  it.each([{}, { JWT_SECRET: '   ' }])(
    'should_throw_when_jwt_secret_is_missing (%o)',
    (env) => {
      // Arrange + Act
      const read = () => readAuthConfig(env);

      // Assert
      expect(read).toThrow('JWT_SECRET is not set');
    },
  );

  it('should_throw_when_jwt_secret_is_shorter_than_32_bytes', () => {
    // Arrange
    const env = { JWT_SECRET: STRONG_SECRET.slice(1) };

    // Act
    const read = () => readAuthConfig(env);

    // Assert
    expect(read).toThrow('JWT_SECRET must have at least 32 bytes');
  });

  it.each(['abc', '0', '-5', '1.5'])(
    'should_throw_when_jwt_expiry_is_not_a_positive_integer (%s)',
    (value) => {
      // Arrange
      const env = { JWT_SECRET: STRONG_SECRET, JWT_EXPIRES_IN: value };

      // Act
      const read = () => readAuthConfig(env);

      // Assert
      expect(read).toThrow('JWT_EXPIRES_IN must be a positive integer');
    },
  );

  it.each(['2592001', '99999999999999999999'])(
    'should_throw_when_jwt_expiry_exceeds_30_days (%s)',
    (value) => {
      // Arrange
      const env = { JWT_SECRET: STRONG_SECRET, JWT_EXPIRES_IN: value };

      // Act
      const read = () => readAuthConfig(env);

      // Assert
      expect(read).toThrow('JWT_EXPIRES_IN must be at most 2592000 seconds');
    },
  );

  it('should_accept_expiry_when_it_is_exactly_30_days', () => {
    // Arrange
    const env = { JWT_SECRET: STRONG_SECRET, JWT_EXPIRES_IN: '2592000' };

    // Act
    const config = readAuthConfig(env);

    // Assert
    expect(config.jwtExpiresInSeconds).toBe(2592000);
  });
});
