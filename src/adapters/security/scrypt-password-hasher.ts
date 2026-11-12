import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { IPasswordHasher } from '../../application/ports/password-hasher.js';
import { Password } from '../../domain/user/password.js';
import { PasswordHash } from '../../domain/user/password-hash.js';

const deriveKey = promisify(scrypt);
const SALT_BYTES = 16;
const KEY_BYTES = 64;

// Adapter: hashes with scrypt, built into Node (no package needed). Each
// password gets its own random salt, so equal passwords give different
// hashes. Stored format: scrypt$<salt hex>$<key hex>.
export class ScryptPasswordHasher implements IPasswordHasher {
  async hash(password: Password): Promise<PasswordHash> {
    const salt = randomBytes(SALT_BYTES);
    const key = (await deriveKey(password.toString(), salt, KEY_BYTES)) as Buffer;
    return PasswordHash.of(
      `scrypt$${salt.toString('hex')}$${key.toString('hex')}`,
    );
  }
}
