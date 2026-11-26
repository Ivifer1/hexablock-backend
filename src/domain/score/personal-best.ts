import type { UserId } from '../user/user-id.js';
import type { AchievedAt } from './achieved-at.js';
import type { RankingScope } from './ranking-scope.js';
import type { Score } from './score.js';

export class PersonalBest {
  private constructor(
    readonly playerId: UserId,
    readonly scope: RankingScope,
    readonly score: Score,
    readonly achievedAt: AchievedAt,
  ) {}

  static record(
    playerId: UserId,
    scope: RankingScope,
    score: Score,
    achievedAt: AchievedAt,
  ): PersonalBest {
    return new PersonalBest(playerId, scope, score, achievedAt);
  }

  consider(attempt: Score, achievedAt: AchievedAt): PersonalBest {
    return attempt.isGreaterThan(this.score)
      ? PersonalBest.record(this.playerId, this.scope, attempt, achievedAt)
      : this;
  }
}
