import type { PersonalBest } from '../../domain/score/personal-best.js';
import type { RankingScope } from '../../domain/score/ranking-scope.js';
import type { Score } from '../../domain/score/score.js';
import type { UserId } from '../../domain/user/user-id.js';

export interface PersonalBestAttempt {
  readonly playerId: UserId;
  readonly scope: RankingScope;
  readonly score: Score;
}

export interface PersonalBestResult {
  readonly record: PersonalBest;
  readonly personalBest: boolean;
}

export interface IPersonalBestRepository {
  retain(attempt: PersonalBestAttempt): Promise<PersonalBestResult>;
}
