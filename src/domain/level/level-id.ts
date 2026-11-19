import { DomainError } from '../shared/domain-error.js';
import { ErrorCode } from '../shared/error-code.js';

export class LevelId {
  private constructor(private readonly value: string) {}

  static of(raw: string): LevelId {
    if (!/^[a-z0-9-]+$/.test(raw)) {
      throw new DomainError(ErrorCode.InvalidLevelId);
    }
    return new LevelId(raw);
  }

  equals(other: LevelId): boolean {
    return this.value === other.value;
  }

  // Primitive conversion belongs at the adapter boundary.
  toString(): string {
    return this.value;
  }
}
