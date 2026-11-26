import type { IGameRankingCatalog } from '../game-catalog.js';
import type { ILevelRepository } from '../ports/level-repository.js';
import type { GameId } from '../../domain/game/game-id.js';
import type { LevelId } from '../../domain/level/level-id.js';
import type { Optional } from '../../domain/shared/optional.js';
import type { Count } from '../../domain/shared/count.js';
import { RankingScope } from '../../domain/score/ranking-scope.js';
import { GetLeaderboardUseCase } from './get-leaderboard.use-case.js';

export class LeaderboardScopeError extends Error {}

export class QueryLeaderboardUseCase {
  constructor(
    private readonly catalog: IGameRankingCatalog,
    private readonly levels: Pick<ILevelRepository, 'findById'>,
    private readonly ranking: GetLeaderboardUseCase,
  ) {}

  async execute(input: {
    gameId: GameId;
    levelId: Optional<LevelId>;
    limit: Count;
  }) {
    const kind = this.catalog.rankingFor(input.gameId);
    let scope: RankingScope;
    if (kind === 'game') {
      if (input.levelId.isPresent())
        throw new LeaderboardScopeError(
          'A game ranking does not accept a level ID',
        );
      scope = RankingScope.forGame(input.gameId);
    } else {
      if (!input.levelId.isPresent())
        throw new LeaderboardScopeError('A level ID is required for this game');
      const levelId = input.levelId.get();
      const level = await this.levels.findById(levelId);
      if (!level.isPresent() || !level.get().gameId.equals(input.gameId))
        throw new LeaderboardScopeError(
          'The level must belong to the requested game',
        );
      scope = RankingScope.forLevel(input.gameId, levelId);
    }
    return {
      scope,
      entries: await this.ranking.execute({ scope, limit: input.limit }),
    };
  }
}
