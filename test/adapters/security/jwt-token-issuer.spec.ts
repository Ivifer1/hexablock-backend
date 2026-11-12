import { JwtService } from '@nestjs/jwt';
import { JwtTokenIssuer } from '../../../src/adapters/security/jwt-token-issuer.js';
import { PasswordHash } from '../../../src/domain/user/password-hash.js';
import { User } from '../../../src/domain/user/user.js';
import { UserId } from '../../../src/domain/user/user-id.js';
import { Username } from '../../../src/domain/user/username.js';

describe('JwtTokenIssuer (UC-001, BR-001-6)', () => {
  const jwt = new JwtService({ secret: 'test-secret' });
  const user = User.create(
    UserId.of('6730f1c2a1b2c3d4e5f60718'),
    Username.of('ivifer'),
    PasswordHash.of('$hashed$'),
    new Date('2026-11-11T12:00:00.000Z'),
  );

  it('should_sign_token_with_user_id_username_and_role_when_issued', async () => {
    // Arrange
    const issuer = new JwtTokenIssuer(jwt, 604800);

    // Act
    const accessToken = await issuer.issueFor(user);

    // Assert
    const payload = await jwt.verifyAsync<Record<string, unknown>>(
      accessToken.token,
    );
    expect(payload.sub).toBe('6730f1c2a1b2c3d4e5f60718');
    expect(payload.username).toBe('ivifer');
    expect(payload.role).toBe('player');
    expect(JSON.stringify(payload)).not.toContain('$hashed$');
  });

  it('should_expire_after_the_configured_seconds_when_issued', async () => {
    // Arrange
    const issuer = new JwtTokenIssuer(jwt, 3600);

    // Act
    const accessToken = await issuer.issueFor(user);

    // Assert
    const payload = await jwt.verifyAsync<{ iat: number; exp: number }>(
      accessToken.token,
    );
    expect(accessToken.expiresInSeconds).toBe(3600);
    expect(payload.exp - payload.iat).toBe(3600);
  });
});
