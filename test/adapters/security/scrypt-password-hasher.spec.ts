import { scryptSync } from 'node:crypto';
import { ScryptPasswordHasher } from '../../../src/adapters/security/scrypt-password-hasher.js';
import { Password } from '../../../src/domain/user/password.js';

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

  it('should_produce_different_hashes_when_same_password_is_hashed_twice', async () => {
    // Arrange + Act
    const first = await hasher.hash(password);
    const second = await hasher.hash(password);

    // Assert
    expect(first.equals(second)).toBe(false);
  });
});
