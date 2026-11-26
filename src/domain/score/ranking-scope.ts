import type { GameId } from '../game/game-id.js';
import type { LevelId } from '../level/level-id.js';
import { Optional } from '../shared/optional.js';

export class RankingScope {
  private constructor(
    readonly gameId: GameId,
    readonly levelId: Optional<LevelId>,
  ) {}

  static forGame(gameId: GameId): RankingScope {
    return new RankingScope(gameId, Optional.empty());
  }

  static forLevel(gameId: GameId, levelId: LevelId): RankingScope {
    return new RankingScope(gameId, Optional.of(levelId));
  }
}
