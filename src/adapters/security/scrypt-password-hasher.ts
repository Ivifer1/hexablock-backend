import { randomBytes, scrypt, ScryptOptions } from 'node:crypto';
import { IPasswordHasher } from '../../application/ports/password-hasher.js';
import { Password } from '../../domain/user/password.js';
import { PasswordHash } from '../../domain/user/password-hash.js';

// OWASP Password Storage Cheat Sheet: scrypt with N=2^17, r=8, p=1. Node's
// defaults (N=2^14) are weaker, so the cost is always passed explicitly.
const COST = { N: 2 ** 17, r: 8, p: 1 } as const;
// scrypt needs about 128 * N * r bytes (128 MiB here); Node's default limit
// is 32 MiB, so it is raised with room to spare.
const MAX_MEMORY = 256 * 1024 * 1024;
const SALT_BYTES = 16;
const KEY_BYTES = 64;

function deriveKey(
  password: string,
  salt: Buffer,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_BYTES, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

// Adapter: hashes with scrypt, built into Node (no package needed). Each
// password gets its own random salt, so equal passwords give different
// hashes. The cost travels inside the stored hash, so it can be raised later
// without breaking the hashes already stored:
// scrypt$<N>$<r>$<p>$<salt hex>$<key hex>.
export class ScryptPasswordHasher implements IPasswordHasher {
  async hash(password: Password): Promise<PasswordHash> {
    const salt = randomBytes(SALT_BYTES);
    const key = await deriveKey(password.toString(), salt, {
      ...COST,
      maxmem: MAX_MEMORY,
    });
    return PasswordHash.of(
      [
        'scrypt',
        COST.N,
        COST.r,
        COST.p,
        salt.toString('hex'),
        key.toString('hex'),
      ].join('$'),
    );
  }
}
