import { GameId } from '../../../domain/game/game-id.js';
import { DomainError } from '../../../domain/shared/domain-error.js';
import { ErrorCode } from '../../../domain/shared/error-code.js';

export class ProgressRequestMapper {
  toGameId(raw: string): GameId {
    try {
      return GameId.of(raw);
    } catch (error) {
      if (
        !(error instanceof DomainError) ||
        error.code !== ErrorCode.InvalidGameId
      )
        throw error;
      throw new DomainError(ErrorCode.ProgressGameNotFound);
    }
  }
}
