import { scryptSync } from 'node:crypto';
import { ScryptPasswordHasher } from '../../../src/adapters/security/scrypt-password-hasher.js';
import { Password } from '../../../src/domain/user/password.js';
import { PasswordHash } from '../../../src/domain/user/password-hash.js';

describe('ScryptPasswordHasher (UC-001, BR-001-5)', () => {
  const hasher = new ScryptPasswordHasher();
  const password = Password.of('correct-horse');

  it('should_store_owasp_cost_parameters_when_hashed', async () => {
    // Arrange: stored format is scrypt$N$r$p$<salt hex>$<key hex>.

    // Act
    const hash = await hasher.hash(password);

    // Assert
    const [algorithm, n, r, p] = hash.toString().split('$');
    expect(algorithm).toBe('scrypt');
    expect({ n: Number(n), r: Number(r), p: Number(p) }).toEqual({
      n: 131072,
      r: 8,
      p: 1,
    });
  });

  it('should_produce_hash_that_matches_password_when_recomputed_with_stored_parameters', async () => {
    // Arrange + Act
    const hash = await hasher.hash(password);

    // Assert
    const [, n, r, p, salt, key] = hash.toString().split('$');
    const recomputed = scryptSync(
      password.toString(),
      Buffer.from(salt, 'hex'),
      key.length / 2,
      {
        N: Number(n),
        r: Number(r),
        p: Number(p),
        maxmem: 256 * 1024 * 1024,
      },
    ).toString('hex');
    expect(recomputed).toBe(key);
  });

  it('should_not_contain_the_plain_password_when_hashed', async () => {
    // Arrange + Act
    const hash = await hasher.hash(password);

    // Assert
    expect(hash.toString()).not.toContain('correct-horse');
  });

  it('should_verify_when_password_matches_hash', async () => {
    // Arrange
    const hash = await hasher.hash(password);

    // Act
    const matches = await hasher.verify(password, hash);

    // Assert
    expect(matches).toBe(true);
  });

  it('should_not_verify_when_password_does_not_match', async () => {
    // Arrange
    const hash = await hasher.hash(password);

    // Act
    const matches = await hasher.verify(Password.of('wrong-horse'), hash);

    // Assert
    expect(matches).toBe(false);
  });

  it('should_verify_hash_stored_with_another_cost', async () => {
    // Arrange: a hash made with a lower cost, as if the cost was raised later.
    const salt = Buffer.from('00112233445566778899aabbccddeeff', 'hex');
    const key = scryptSync('correct-horse', salt, 64, { N: 2 ** 14, r: 8, p: 1 });
    const stored = PasswordHash.of(
      `scrypt$16384$8$1$${salt.toString('hex')}$${key.toString('hex')}`,
    );

    // Act
    const matches = await hasher.verify(password, stored);

    // Assert
    expect(matches).toBe(true);
  });

  // A well-formed salt (16 bytes) and key (64 bytes), so each case below
  // breaks exactly one rule.
  const SALT = 'ab'.repeat(16);
  const KEY = 'cd'.repeat(64);

  it.each([
    'bcrypt$whatever',
    `scrypt$16384$8$1$zz$${KEY}`,
    `scrypt$999999999$8$1$${SALT}$${KEY}`,
    `scrypt$1048576$8$1$${SALT}$${KEY}`,
    `scrypt$16384$8$1$${SALT}`,
    `scrypt$2$8$1$${SALT}$${KEY}`,
    `scrypt$131072$16$1$${SALT}$${KEY}`,
    `scrypt$131072$8$16$${SALT}$${KEY}`,
    `scrypt$16384$8$1$${SALT}$cd`,
    `scrypt$16384$8$1$ab$${KEY}`,
  ])('should_throw_when_stored_hash_has_unknown_format (%s)', async (raw) => {
    // Arrange
    const stored = PasswordHash.of(raw);

    // Act
    const verify = hasher.verify(password, stored);

    // Assert
    await expect(verify).rejects.toThrow('Stored password hash is invalid');
  });

  it('should_produce_different_hashes_when_same_password_is_hashed_twice', async () => {
    // Arrange + Act
    const first = await hasher.hash(password);
    const second = await hasher.hash(password);

    // Assert
    expect(first.equals(second)).toBe(false);
  });
});
