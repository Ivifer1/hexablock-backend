import { DomainError } from '../shared/domain-error.js';
import { ErrorCode } from '../shared/error-code.js';

// A password that was already hashed by IPasswordHasher. The plain password
// never reaches the domain.
export class PasswordHash {
  private constructor(private readonly value: string) {}

  static of(raw: string): PasswordHash {
    if (raw.trim().length === 0) {
      throw new DomainError(ErrorCode.InvalidPasswordHash);
    }
    return new PasswordHash(raw);
  }

  equals(other: PasswordHash): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
