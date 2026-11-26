import { describe, expect, it } from 'vitest';
import { GameId } from '../../src/domain/game/game-id.js';
import { RankingScope } from '../../src/domain/score/ranking-scope.js';
import { Score } from '../../src/domain/score/score.js';
import { AchievedAt } from '../../src/domain/score/achieved-at.js';
import { Count } from '../../src/domain/shared/count.js';
import { Username } from '../../src/domain/user/username.js';
import type { ILeaderboardQuery, LeaderboardCandidate } from '../../src/application/ports/leaderboard-query.js';
import { GetLeaderboardUseCase } from '../../src/application/use-cases/get-leaderboard.use-case.js';

const scope = RankingScope.forGame(GameId.of('hexa-merge'));
function row(username: string, score: number, hour = 10): LeaderboardCandidate {
  return { username: Username.of(username), score: Score.of(score), achievedAt: AchievedAt.of(new Date(Date.UTC(2026, 10, 1, hour))) };
}
class FakeQuery implements ILeaderboardQuery {
  constructor(readonly rows: readonly LeaderboardCandidate[], private readonly failure?: Error) {}
  read(_scope: RankingScope, limit: Count): Promise<readonly LeaderboardCandidate[]> {
    return this.failure ? Promise.reject(this.failure) : Promise.resolve(this.rows.slice(0, limit.toNumber()));
  }
}
describe('UC-011 GetLeaderboardUseCase', () => {
  it.each([
    { rows: [row('alice', 120), row('bruno', 120), row('carol', 90)], limit: 10, ranks: [1, 1, 3] },
    { rows: [row('alice', 120), row('bruno', 120, 11)], limit: 10, ranks: [1, 2] },
    { rows: [row('alice', 120), row('bruno', 120)], limit: 1, ranks: [1] },
    { rows: [], limit: 10, ranks: [] },
  ])('should_assign_competition_ranks_when_reading_$ranks', async ({ rows, limit, ranks }) => {
    // Arrange
    const useCase = new GetLeaderboardUseCase(new FakeQuery(rows));
    // Act
    const result = await useCase.execute({ scope, limit: Count.of(limit) });
    // Assert
    expect(result).toStrictEqual(rows.slice(0, limit).map((candidate, index) => ({ ...candidate, rank: Count.of(ranks[index]!) })));
  });
  it('should_propagate_failure_when_the_ranking_cannot_be_read', async () => {
    // Arrange
    const failure = new Error('Ranking read failed');
    const useCase = new GetLeaderboardUseCase(new FakeQuery([], failure));
    // Act
    const result = useCase.execute({ scope, limit: Count.of(10) });
    // Assert
    await expect(result).rejects.toBe(failure);
  });
});
