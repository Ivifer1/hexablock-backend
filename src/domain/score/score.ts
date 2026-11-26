import { DomainError } from '../shared/domain-error.js';
import { ErrorCode } from '../shared/error-code.js';

export class Score {
  private constructor(private readonly value: number) {}

  static of(value: number): Score {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new DomainError(ErrorCode.InvalidScore);
    }
    return new Score(value);
  }

  isGreaterThan(other: Score): boolean {
    return this.value > other.value;
  }

  toNumber(): number {
    return this.value;
  }
}
