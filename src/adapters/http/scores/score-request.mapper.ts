import { GameId } from '../../../domain/game/game-id.js';
import { LevelId } from '../../../domain/level/level-id.js';
import { Optional } from '../../../domain/shared/optional.js';
import { DomainError } from '../../../domain/shared/domain-error.js';
import { ErrorCode } from '../../../domain/shared/error-code.js';
import { Score } from '../../../domain/score/score.js';
import type { SubmitScoreInput } from '../../../application/use-cases/submit-score.use-case.js';
import { RequestValidationError } from '../request-validation.error.js';
import { wasRoundedJsonNumber } from '../json-numbers.js';

function invalid(field: string, message: string): never {
  throw new RequestValidationError([{ field, message }]);
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    invalid('body', 'Expected an object');
  }
  return value as Record<string, unknown>;
}

export class ScoreRequestMapper {
  toInput(raw: unknown): Omit<SubmitScoreInput, 'playerId'> {
    const body = record(raw);
    const extra = Object.keys(body).find(
      (key) => !['gameId', 'levelId', 'score'].includes(key),
    );
    if (extra !== undefined) invalid('body', 'Contains an undocumented field');

    const rawGame = body.gameId;
    if (typeof rawGame !== 'string')
      invalid('gameId', 'Expected a registered game ID');
    let gameId: GameId;
    try {
      gameId = GameId.of(rawGame);
    } catch (error) {
      if (
        error instanceof DomainError &&
        error.code === ErrorCode.InvalidGameId
      ) {
        invalid('gameId', 'Expected a valid game ID');
      }
      throw error;
    }

    const rawScore = body.score;
    if (
      typeof rawScore !== 'number' ||
      !Number.isSafeInteger(rawScore) ||
      rawScore < 0 ||
      wasRoundedJsonNumber(body, 'score')
    ) {
      invalid('score', 'Expected a nonnegative safe integer');
    }
    const score = Score.of(rawScore);

    let levelId = Optional.empty<LevelId>();
    if (Object.hasOwn(body, 'levelId')) {
      if (typeof body.levelId !== 'string')
        invalid('levelId', 'Expected a valid level ID');
      try {
        levelId = Optional.of(LevelId.of(body.levelId));
      } catch (error) {
        if (
          error instanceof DomainError &&
          error.code === ErrorCode.InvalidLevelId
        ) {
          invalid('levelId', 'Expected a valid level ID');
        }
        throw error;
      }
    }

    return { gameId, score, levelId };
  }
}
