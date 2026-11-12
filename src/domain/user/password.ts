import { DomainError } from '../shared/domain-error.js';
import { ErrorCode } from '../shared/error-code.js';

const MINIMUM_LENGTH = 8;

// A plain password as the player typed it (BR-001-2). It only lives during a
// request: it is hashed into a PasswordHash and never stored.
export class Password {
  private constructor(private readonly value: string) {}

  static of(raw: string): Password {
    if (raw.length < MINIMUM_LENGTH) {
      throw new DomainError(ErrorCode.InvalidPassword);
    }
    return new Password(raw);
  }

  toString(): string {
    return this.value;
  }
}
