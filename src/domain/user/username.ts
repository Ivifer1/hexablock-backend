import { DomainError } from '../shared/domain-error.js';
import { ErrorCode } from '../shared/error-code.js';

// API contract: 3–20 characters, lowercase letters, digits and underscore.
const USERNAME_RULE = /^[a-z0-9_]{3,20}$/;

export class Username {
  private constructor(private readonly value: string) {}

  static of(raw: string): Username {
    if (!USERNAME_RULE.test(raw)) {
      throw new DomainError(ErrorCode.InvalidUsername);
    }
    return new Username(raw);
  }

  equals(other: Username): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
