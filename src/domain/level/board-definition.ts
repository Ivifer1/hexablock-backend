import { DomainError } from '../shared/domain-error.js';
import { ErrorCode } from '../shared/error-code.js';
import { RawCoord } from './raw-coord.js';
import { TopologyId } from './topology-id.js';

export class BoardDefinition {
  private constructor(
    readonly topology: TopologyId,
    readonly cells: readonly RawCoord[],
  ) {}

  static of(topology: TopologyId, cells: readonly RawCoord[]): BoardDefinition {
    if (cells.length === 0) {
      throw new DomainError(ErrorCode.InvalidBoard);
    }
    const unique: RawCoord[] = [];
    for (const cell of cells) {
      if (unique.some((existing) => existing.equals(cell))) {
        throw new DomainError(ErrorCode.InvalidBoard);
      }
      unique.push(cell);
    }
    return new BoardDefinition(topology, Object.freeze(unique));
  }
}
