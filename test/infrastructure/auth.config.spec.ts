import { readAuthConfig } from '../../src/infrastructure/config/auth.config.js';

describe('readAuthConfig (UC-001, BR-001-6)', () => {
  it('should_return_secret_and_expiry_when_both_are_set', () => {
    // Arrange
    const env = { JWT_SECRET: 'a-secret', JWT_EXPIRES_IN: '3600' };

    // Act
    const config = readAuthConfig(env);

    // Assert
    expect(config).toEqual({ jwtSecret: 'a-secret', jwtExpiresInSeconds: 3600 });
  });

  it('should_default_expiry_to_7_days_when_not_set', () => {
    // Arrange
    const env = { JWT_SECRET: 'a-secret' };

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

  it.each(['abc', '0', '-5', '1.5'])(
    'should_throw_when_jwt_expiry_is_not_a_positive_integer (%s)',
    (value) => {
      // Arrange
      const env = { JWT_SECRET: 'a-secret', JWT_EXPIRES_IN: value };

      // Act
      const read = () => readAuthConfig(env);

      // Assert
      expect(read).toThrow('JWT_EXPIRES_IN must be a positive integer');
    },
  );
});
