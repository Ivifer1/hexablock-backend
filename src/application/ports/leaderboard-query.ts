import type { RankingScope } from '../../domain/score/ranking-scope.js';
import type { Score } from '../../domain/score/score.js';
import type { AchievedAt } from '../../domain/score/achieved-at.js';
import type { Count } from '../../domain/shared/count.js';
import type { Username } from '../../domain/user/username.js';

export interface LeaderboardCandidate {
  readonly username: Username;
  readonly score: Score;
  readonly achievedAt: AchievedAt;
}

// Returns the ordered, limited prefix; failure never returns partial entries.
export interface ILeaderboardQuery {
  read(scope: RankingScope, limit: Count): Promise<readonly LeaderboardCandidate[]>;
}
