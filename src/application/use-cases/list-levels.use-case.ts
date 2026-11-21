import type { GameId } from '../../domain/game/game-id.js';
import type { Level } from '../../domain/level/level.js';
import type { LevelValidator } from '../../domain/level/level-validator.js';
import type { ILevelRepository } from '../ports/level-repository.js';

export class ListLevelsUseCase {
  constructor(
    private readonly levels: ILevelRepository,
    private readonly supportedGames: Pick<
      LevelValidator,
      'assertSupportsLevels'
    >,
  ) {}

  async execute(gameId: GameId): Promise<readonly Level[]> {
    this.supportedGames.assertSupportsLevels(gameId);
    return this.levels.list(gameId);
  }
}
