import { DomainError } from '../shared/domain-error.js';
import { ErrorCode } from '../shared/error-code.js';

export class LevelNumber {
  private constructor(private readonly value: number) {}

  static of(raw: number): LevelNumber {
    if (!Number.isInteger(raw) || raw < 1) {
      throw new DomainError(ErrorCode.InvalidLevelOrder);
    }
    return new LevelNumber(raw);
  }

  toNumber(): number {
    return this.value;
  }

  equals(other: LevelNumber): boolean {
    return this.value === other.value;
  }
}
