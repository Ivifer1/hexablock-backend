import { DomainError } from '../shared/domain-error.js';
import { ErrorCode } from '../shared/error-code.js';

export class GameId {
  private constructor(private readonly value: string) {}

  static of(raw: string): GameId {
    if (!/^[a-z0-9-]+$/.test(raw)) {
      throw new DomainError(ErrorCode.InvalidGameId);
    }
    return new GameId(raw);
  }

  equals(other: GameId): boolean {
    return this.value === other.value;
  }

  // Primitive conversion belongs at the adapter boundary.
  toString(): string {
    return this.value;
  }
}
