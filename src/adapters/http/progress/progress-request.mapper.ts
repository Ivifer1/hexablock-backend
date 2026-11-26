import type { ProgressDraft } from '../../../application/progress/progress-model.js';
import { GameId } from '../../../domain/game/game-id.js';
import { LevelId } from '../../../domain/level/level-id.js';
import { LevelProgress } from '../../../domain/progress/level-progress.js';
import { Count } from '../../../domain/shared/count.js';
import { DomainError } from '../../../domain/shared/domain-error.js';
import { ErrorCode } from '../../../domain/shared/error-code.js';
import { Optional } from '../../../domain/shared/optional.js';
import { RequestValidationError } from '../request-validation.error.js';
import { wasRoundedJsonNumber } from '../json-numbers.js';

function invalid(field: string, message: string): never {
  throw new RequestValidationError([{ field, message }]);
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    invalid(field, 'Expected an object');
  }
  return value as Record<string, unknown>;
}

function ownField(value: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(value, key) ? value[key] : undefined;
}

function fields(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path = '',
): void {
  const extra = Object.keys(value).find((key) => !allowed.includes(key));
  if (extra !== undefined) invalid(path, 'Contains an undocumented field');
}

function count(
  holder: Record<string, unknown>,
  key: string,
  field: string,
): Count {
  const value = ownField(holder, key);
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    wasRoundedJsonNumber(holder, key)
  ) {
    invalid(field, 'Expected a nonnegative safe integer');
  }
  return Count.of(value);
}

function levelId(raw: string): LevelId {
  try {
    return LevelId.of(raw);
  } catch (error) {
    if (
      !(error instanceof DomainError) ||
      error.code !== ErrorCode.InvalidLevelId
    )
      throw error;
    invalid('levels', 'Contains an invalid level ID');
  }
}

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

  toDraft(raw: unknown): ProgressDraft {
    const body = record(raw, 'body');
    fields(body, ['bestScore', 'levels'], 'body');
    const score = ownField(body, 'bestScore');
    return {
      bestScore:
        score === null
          ? Optional.empty()
          : Optional.of(count(body, 'bestScore', 'bestScore')),
      levels: Object.entries(record(ownField(body, 'levels'), 'levels')).map(
        ([key, value]) => this.toLevel(key, value),
      ),
    };
  }

  private toLevel(rawId: string, raw: unknown): LevelProgress {
    const id = levelId(rawId);
    const path = 'levels.' + rawId;
    const entry = record(raw, path);
    fields(entry, ['completed', 'stars', 'bestScore'], path);
    const completed = ownField(entry, 'completed');
    if (typeof completed !== 'boolean')
      invalid(path + '.completed', 'Expected a boolean');
    const stars = count(entry, 'stars', path + '.stars');
    if (Count.of(3).isLessThan(stars))
      invalid(path + '.stars', 'Expected at most three stars');
    return LevelProgress.of(
      id,
      completed,
      stars,
      count(entry, 'bestScore', path + '.bestScore'),
    );
  }
}
