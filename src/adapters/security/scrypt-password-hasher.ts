import { randomBytes, scrypt, ScryptOptions, timingSafeEqual } from 'node:crypto';
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
// A stored hash may carry an older or newer cost, but only within these
// bounds. Anything else is corrupt or tampered data, not a password to
// check: too cheap would be weak, too expensive would slow every login.
const MIN_N = 2 ** 14;
const MAX_N = 2 ** 17;
const MAX_R = 16;
const MAX_P = 4;
// Salt and key must have exactly the sizes this adapter writes.
const STORED_HASH = new RegExp(
  `^scrypt\\$(\\d+)\\$(\\d+)\\$(\\d+)\\$([0-9a-f]{${SALT_BYTES * 2}})\\$([0-9a-f]{${KEY_BYTES * 2}})$`,
);

// scrypt needs about 128 * N * r bytes; a cost above MAX_MEMORY cannot run.
function fitsInMemory(n: number, r: number): boolean {
  return 128 * n * r < MAX_MEMORY;
}

interface StoredHash {
  readonly options: ScryptOptions;
  readonly salt: Buffer;
  readonly key: Buffer;
}

function deriveKey(
  password: string,
  salt: Buffer,
  length: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, length, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

function parse(hash: PasswordHash): StoredHash {
  const match = STORED_HASH.exec(hash.toString());
  const [n, r, p] = match ? match.slice(1, 4).map(Number) : [0, 0, 0];
  const isPowerOfTwo = n > 1 && (n & (n - 1)) === 0;
  if (
    !match ||
    !isPowerOfTwo ||
    n < MIN_N ||
    n > MAX_N ||
    r < 1 ||
    r > MAX_R ||
    p < 1 ||
    p > MAX_P ||
    !fitsInMemory(n, r)
  ) {
    throw new Error('Stored password hash is invalid');
  }
  return {
    options: { N: n, r, p, maxmem: MAX_MEMORY },
    salt: Buffer.from(match[4], 'hex'),
    key: Buffer.from(match[5], 'hex'),
  };
}

// Adapter: hashes with scrypt, built into Node (no package needed). Each
// password gets its own random salt, so equal passwords give different
// hashes. The cost travels inside the stored hash, so it can be raised later
// without breaking the hashes already stored:
// scrypt$<N>$<r>$<p>$<salt hex>$<key hex>.
export class ScryptPasswordHasher implements IPasswordHasher {
  async hash(password: Password): Promise<PasswordHash> {
    const salt = randomBytes(SALT_BYTES);
    const key = await deriveKey(password.toString(), salt, KEY_BYTES, {
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

  // BR-002-1: recomputes with the cost stored in the hash and compares in
  // constant time, so the time does not reveal how much of the key matched.
  async verify(password: Password, hash: PasswordHash): Promise<boolean> {
    const stored = parse(hash);
    const key = await deriveKey(
      password.toString(),
      stored.salt,
      stored.key.length,
      stored.options,
    );
    return timingSafeEqual(key, stored.key);
  }
}
