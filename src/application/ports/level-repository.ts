import type { GameId } from '../../domain/game/game-id.js';
import type { Level } from '../../domain/level/level.js';
import type { LevelId } from '../../domain/level/level-id.js';
import type { Optional } from '../../domain/shared/optional.js';

export interface ILevelRepository {
  list(gameId: GameId): Promise<readonly Level[]>;
  findById(id: LevelId): Promise<Optional<Level>>;
  create(level: Level): Promise<void>;
  replace(level: Level): Promise<boolean>;
  delete(id: LevelId): Promise<boolean>;
}
