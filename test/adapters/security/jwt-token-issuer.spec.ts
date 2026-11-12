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

describe('JwtTokenIssuer.verify (UC-003, BR-003-1)', () => {
  const secret = 'a-test-secret-of-32-bytes-length';
  const jwt = new JwtService({ secret });
  const issuer = new JwtTokenIssuer(jwt, 3600);
  const user = User.create(
    UserId.of('6730f1c2a1b2c3d4e5f60718'),
    Username.of('ivifer'),
    PasswordHash.of('$hashed$'),
    new Date('2026-11-11T12:00:00.000Z'),
  );
  const nowInSeconds = () => Math.floor(Date.now() / 1000);

  it('should_return_user_when_token_is_valid', async () => {
    // Arrange
    const { token } = await issuer.issueFor(user);

    // Act
    const found = await issuer.verify(token);

    // Assert
    expect(found.isPresent()).toBe(true);
    expect(found.get()).toEqual({
      id: '6730f1c2a1b2c3d4e5f60718',
      role: 'player',
    });
  });

  it('should_return_empty_when_token_is_expired', async () => {
    // Arrange
    const token = await jwt.signAsync({
      sub: '6730f1c2a1b2c3d4e5f60718',
      username: 'ivifer',
      role: 'player',
      exp: nowInSeconds() - 10,
    });

    // Act
    const found = await issuer.verify(token);

    // Assert
    expect(found.isPresent()).toBe(false);
  });

  it('should_return_empty_when_token_has_wrong_signature', async () => {
    // Arrange
    const forger = new JwtService({ secret: 'another-secret-of-32-bytes-long!' });
    const token = await forger.signAsync({
      sub: '6730f1c2a1b2c3d4e5f60718',
      role: 'admin',
    });

    // Act
    const found = await issuer.verify(token);

    // Assert
    expect(found.isPresent()).toBe(false);
  });

  it('should_return_empty_when_token_uses_another_algorithm', async () => {
    // Arrange: same secret, but HS512 instead of HS256.
    const token = await jwt.signAsync(
      { sub: '6730f1c2a1b2c3d4e5f60718', role: 'player' },
      { algorithm: 'HS512' },
    );

    // Act
    const found = await issuer.verify(token);

    // Assert
    expect(found.isPresent()).toBe(false);
  });

  it('should_return_empty_when_token_is_unsigned', async () => {
    // Arrange: alg "none" with no signature.
    const encode = (part: object) =>
      Buffer.from(JSON.stringify(part)).toString('base64url');
    const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
      sub: '6730f1c2a1b2c3d4e5f60718',
      role: 'admin',
    })}.`;

    // Act
    const found = await issuer.verify(token);

    // Assert
    expect(found.isPresent()).toBe(false);
  });

  it.each(['', 'garbage', 'a.b.c'])(
    'should_return_empty_when_token_is_malformed (%s)',
    async (token) => {
      // Arrange + Act
      const found = await issuer.verify(token);

      // Assert
      expect(found.isPresent()).toBe(false);
    },
  );

  it('should_return_empty_when_subject_is_blank', async () => {
    // Arrange: correctly signed and not expired, but the subject is spaces.
    const token = await jwt.signAsync(
      { sub: '   ', role: 'player' },
      { expiresIn: 3600 },
    );

    // Act
    const found = await issuer.verify(token);

    // Assert
    expect(found.isPresent()).toBe(false);
  });

  it('should_return_empty_when_token_has_no_expiry', async () => {
    // Arrange: correctly signed, but it would never expire.
    const token = await jwt.signAsync({
      sub: '6730f1c2a1b2c3d4e5f60718',
      role: 'player',
    });

    // Act
    const found = await issuer.verify(token);

    // Assert
    expect(found.isPresent()).toBe(false);
  });

  it('should_return_empty_when_token_has_no_subject', async () => {
    // Arrange: correctly signed, but not one of our access tokens.
    const token = await jwt.signAsync({ role: 'player' });

    // Act
    const found = await issuer.verify(token);

    // Assert
    expect(found.isPresent()).toBe(false);
  });
});
