import { Password } from '../../domain/user/password.js';
import { PasswordHash } from '../../domain/user/password-hash.js';

// Output port: turns a plain password into a hash that cannot be reversed.
export interface IPasswordHasher {
  hash(password: Password): Promise<PasswordHash>;
}
