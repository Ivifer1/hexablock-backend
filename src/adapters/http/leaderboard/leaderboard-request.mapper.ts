import { GameId } from '../../../domain/game/game-id.js';
import { LevelId } from '../../../domain/level/level-id.js';
import { Optional } from '../../../domain/shared/optional.js';
import { Count } from '../../../domain/shared/count.js';
import { DomainError } from '../../../domain/shared/domain-error.js';
import { RequestValidationError } from '../request-validation.error.js';

function invalid(field: string, message: string): never {
  throw new RequestValidationError([{ field, message }]);
}

export class LeaderboardRequestMapper {
  toInput(rawGame: string, query: Record<string, unknown>) {
    if (Object.keys(query).some((key) => !['levelId', 'limit'].includes(key)))
      invalid('query', 'Contains an undocumented parameter');
    const rawLimit = Object.hasOwn(query, 'limit') ? query.limit : '10';
    if (
      typeof rawLimit !== 'string' ||
      !/^\d+$/.test(rawLimit) ||
      Number(rawLimit) < 1 ||
      Number(rawLimit) > 100
    )
      invalid('limit', 'Expected one decimal integer from 1 to 100');
    let levelId = Optional.empty<LevelId>();
    if (Object.hasOwn(query, 'levelId')) {
      if (typeof query.levelId !== 'string')
        invalid('levelId', 'Expected one valid level ID');
      try {
        levelId = Optional.of(LevelId.of(query.levelId));
      } catch (error) {
        if (error instanceof DomainError)
          invalid('levelId', 'Expected one valid level ID');
        throw error;
      }
    }
    let gameId: GameId;
    try {
      gameId = GameId.of(rawGame);
    } catch (error) {
      if (error instanceof DomainError)
        invalid('gameId', 'Expected a valid game ID');
      throw error;
    }
    return { gameId, levelId, limit: Count.of(Number(rawLimit)) };
  }
}
