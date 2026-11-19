import { Count } from '../shared/count.js';
import { DomainError } from '../shared/domain-error.js';
import { ErrorCode } from '../shared/error-code.js';

// Dimension belongs to the topology, not to the coordinate representation.
export class RawCoord {
  private constructor(private readonly values: readonly number[]) {}

  static of(values: readonly number[]): RawCoord {
    if (!values.every((value) => Number.isInteger(value))) {
      throw new DomainError(ErrorCode.InvalidCoordinate);
    }
    return new RawCoord(Object.freeze([...values]));
  }

  equals(other: RawCoord): boolean {
    return (
      this.values.length === other.values.length &&
      this.values.every((value, index) => value === other.values[index])
    );
  }

  size(): Count {
    return Count.of(this.values.length);
  }

  translated(by: RawCoord): RawCoord {
    if (!this.size().equals(by.size())) {
      throw new DomainError(ErrorCode.InvalidCoordinate);
    }
    return RawCoord.of(
      this.values.map((value, index) => value + by.values[index]),
    );
  }
}
