import type { ILeaderboardQuery, LeaderboardCandidate } from '../ports/leaderboard-query.js';
import type { RankingScope } from '../../domain/score/ranking-scope.js';
import { Count } from '../../domain/shared/count.js';

export interface LeaderboardEntry extends LeaderboardCandidate {
  readonly rank: Count;
}

export class GetLeaderboardUseCase {
  constructor(private readonly query: ILeaderboardQuery) {}

  async execute(input: {
    readonly scope: RankingScope;
    readonly limit: Count;
  }): Promise<readonly LeaderboardEntry[]> {
    const candidates = await this.query.read(input.scope, input.limit);
    let rank = Count.of(0);
    return candidates.map((candidate, index) => {
      const previous = candidates[index - 1];
      if (
        !previous ||
        candidate.score.toNumber() !== previous.score.toNumber() ||
        candidate.achievedAt.toDate().getTime() !== previous.achievedAt.toDate().getTime()
      ) {
        rank = Count.of(index + 1);
      }
      return { ...candidate, rank };
    });
  }
}
