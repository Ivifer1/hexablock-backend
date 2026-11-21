import { DomainError } from '../shared/domain-error.js';
import { ErrorCode } from '../shared/error-code.js';

export class SchemaVersion {
  private constructor(private readonly value: number) {}

  static of(raw: number): SchemaVersion {
    if (raw !== 1) {
      throw new DomainError(ErrorCode.InvalidSchemaVersion);
    }
    return new SchemaVersion(raw);
  }

  toNumber(): number {
    return this.value;
  }

  equals(other: SchemaVersion): boolean {
    return this.value === other.value;
  }
}
