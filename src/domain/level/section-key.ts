import { DomainError } from '../shared/domain-error.js';
import { ErrorCode } from '../shared/error-code.js';

export class SectionKey {
  private constructor(private readonly value: string) {}

  static of(raw: string): SectionKey {
    if (raw.trim().length === 0) {
      throw new DomainError(ErrorCode.InvalidSectionKey);
    }
    return new SectionKey(raw);
  }

  equals(other: SectionKey): boolean {
    return this.value === other.value;
  }

  // Primitive conversion belongs at the adapter boundary.
  toString(): string {
    return this.value;
  }
}
