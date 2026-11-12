import { scryptSync } from 'node:crypto';
import { ScryptPasswordHasher } from '../../../src/adapters/security/scrypt-password-hasher.js';
import { Password } from '../../../src/domain/user/password.js';

describe('ScryptPasswordHasher (UC-001, BR-001-5)', () => {
  const hasher = new ScryptPasswordHasher();
  const password = Password.of('correct-horse');

  it('should_produce_hash_that_matches_password_when_recomputed_with_its_salt', async () => {
    // Arrange: the stored format is scrypt$<salt hex>$<key hex>.

    // Act
    const hash = await hasher.hash(password);

    // Assert
    const [algorithm, salt, key] = hash.toString().split('$');
    const recomputed = scryptSync(
      password.toString(),
      Buffer.from(salt, 'hex'),
      key.length / 2,
    ).toString('hex');
    expect(algorithm).toBe('scrypt');
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
