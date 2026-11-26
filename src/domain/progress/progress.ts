import type { GameId } from '../game/game-id.js';
import type { Count } from '../shared/count.js';
import { DomainError } from '../shared/domain-error.js';
import { ErrorCode } from '../shared/error-code.js';
import { Optional } from '../shared/optional.js';
import type { UserId } from '../user/user-id.js';
import { greaterCount, type LevelProgress } from './level-progress.js';

export type ProgressValues = Pick<
  Progress,
  'userId' | 'gameId' | 'bestScore' | 'levels'
>;

export class Progress {
  readonly levels: readonly LevelProgress[];
  private readonly recordedAt: Date;

  private constructor(
    readonly userId: UserId,
    readonly gameId: GameId,
    readonly bestScore: Optional<Count>,
    levels: readonly LevelProgress[],
    updatedAt: Date,
  ) {
    if (!Number.isFinite(updatedAt.getTime())) {
      throw new DomainError(ErrorCode.InvalidProgress);
    }
    this.recordedAt = new Date(updatedAt);
    this.levels = Object.freeze([...levels]);
  }

  get updatedAt(): Date {
    return new Date(this.recordedAt);
  }

  static forScore(
    userId: UserId,
    gameId: GameId,
    bestScore: Count,
    updatedAt: Date,
  ): Progress {
    return new Progress(userId, gameId, Optional.of(bestScore), [], updatedAt);
  }

  static forLevels(
    userId: UserId,
    gameId: GameId,
    levels: readonly LevelProgress[],
    updatedAt: Date,
  ): Progress {
    const unique: LevelProgress[] = [];
    for (const level of levels) {
      if (unique.some((existing) => existing.levelId.equals(level.levelId))) {
        throw new DomainError(ErrorCode.InvalidProgress);
      }
      unique.push(level);
    }
    return new Progress(
      userId,
      gameId,
      Optional.empty<Count>(),
      unique,
      updatedAt,
    );
  }

  static fromValues(values: ProgressValues, updatedAt: Date): Progress {
    if (values.bestScore.isPresent()) {
      if (values.levels.length !== 0) {
        throw new DomainError(ErrorCode.InvalidProgress);
      }
      return Progress.forScore(
        values.userId,
        values.gameId,
        values.bestScore.get(),
        updatedAt,
      );
    }
    return Progress.forLevels(
      values.userId,
      values.gameId,
      values.levels,
      updatedAt,
    );
  }

  hasSameValues(other: Progress): boolean {
    if (
      !this.userId.equals(other.userId) ||
      !this.gameId.equals(other.gameId) ||
      this.bestScore.isPresent() !== other.bestScore.isPresent()
    ) {
      return false;
    }
    if (this.bestScore.isPresent()) {
      return this.bestScore.get().equals(other.bestScore.get());
    }
    return (
      this.levels.length === other.levels.length &&
      this.levels.every((level) =>
        other.levels.some((candidate) => level.equals(candidate)),
      )
    );
  }

  mergedWith(other: Progress): Progress {
    if (
      !this.userId.equals(other.userId) ||
      !this.gameId.equals(other.gameId) ||
      this.bestScore.isPresent() !== other.bestScore.isPresent()
    ) {
      throw new DomainError(ErrorCode.InvalidProgress);
    }

    const date =
      this.recordedAt > other.recordedAt ? this.recordedAt : other.recordedAt;
    if (this.bestScore.isPresent()) {
      return Progress.forScore(
        this.userId,
        this.gameId,
        greaterCount(this.bestScore.get(), other.bestScore.get()),
        date,
      );
    }

    let merged = [...this.levels];
    for (const candidate of other.levels) {
      const sameLevel = (level: LevelProgress) =>
        level.levelId.equals(candidate.levelId);
      merged = merged.some(sameLevel)
        ? merged.map((level) =>
            sameLevel(level) ? level.mergedWith(candidate) : level,
          )
        : [...merged, candidate];
    }
    return Progress.forLevels(this.userId, this.gameId, merged, date);
  }
}
