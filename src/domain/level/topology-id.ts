import { DomainError } from '../shared/domain-error.js';
import { ErrorCode } from '../shared/error-code.js';

export class TopologyId {
  private constructor(private readonly value: string) {}

  static of(raw: string): TopologyId {
    if (raw.trim().length === 0) {
      throw new DomainError(ErrorCode.InvalidTopologyId);
    }
    return new TopologyId(raw);
  }

  equals(other: TopologyId): boolean {
    return this.value === other.value;
  }

  // Primitive conversion belongs at the adapter boundary.
  toString(): string {
    return this.value;
  }
}
