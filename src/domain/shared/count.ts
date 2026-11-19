import { DomainError } from './domain-error.js';
import { ErrorCode } from './error-code.js';

export class Count {
  private constructor(private readonly value: number) {}

  static of(raw: number): Count {
    if (!Number.isInteger(raw) || raw < 0) {
      throw new DomainError(ErrorCode.InvalidCount);
    }
    return new Count(raw);
  }

  equals(other: Count): boolean {
    return this.value === other.value;
  }
}
