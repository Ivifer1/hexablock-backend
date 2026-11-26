import type { LevelId } from '../level/level-id.js';
import { Count } from '../shared/count.js';
import { DomainError } from '../shared/domain-error.js';
import { ErrorCode } from '../shared/error-code.js';

const maximumStars = Count.of(3);

export class LevelProgress {
  private constructor(
    readonly levelId: LevelId,
    readonly completed: boolean,
    readonly stars: Count,
    readonly bestScore: Count,
  ) {}

  static of(
    levelId: LevelId,
    completed: boolean,
    stars: Count,
    bestScore: Count,
  ): LevelProgress {
    if (maximumStars.isLessThan(stars)) {
      throw new DomainError(ErrorCode.InvalidProgress);
    }
    return new LevelProgress(levelId, completed, stars, bestScore);
  }

  equals(other: LevelProgress): boolean {
    return (
      this.levelId.equals(other.levelId) &&
      this.completed === other.completed &&
      this.stars.equals(other.stars) &&
      this.bestScore.equals(other.bestScore)
    );
  }

  mergedWith(other: LevelProgress): LevelProgress {
    if (!this.levelId.equals(other.levelId)) {
      throw new DomainError(ErrorCode.InvalidProgress);
    }
    return LevelProgress.of(
      this.levelId,
      this.completed || other.completed,
      greaterCount(this.stars, other.stars),
      greaterCount(this.bestScore, other.bestScore),
    );
  }
}

export function greaterCount(left: Count, right: Count): Count {
  return left.isLessThan(right) ? right : left;
}
