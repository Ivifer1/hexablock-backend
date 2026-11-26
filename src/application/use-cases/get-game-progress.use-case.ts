import type { GameId } from '../../domain/game/game-id.js';
import { Optional } from '../../domain/shared/optional.js';
import type { UserId } from '../../domain/user/user-id.js';
import type { IProgressRepository } from '../ports/progress-repository.js';
import type { IGameProgressCatalog } from '../game-catalog.js';
import {
  toProgressView,
  type ProgressView,
} from '../progress/progress-view.js';

export class GetGameProgressUseCase {
  constructor(
    private readonly progress: IProgressRepository,
    private readonly catalog: IGameProgressCatalog,
  ) {}

  async execute(user: UserId, gameId: GameId): Promise<ProgressView> {
    const model = this.catalog.modelFor(gameId);
    const saved = await this.progress.find(user, gameId);
    if (saved.isPresent()) return toProgressView(saved.get());
    return {
      gameId,
      bestScore: model.emptyBestScore(),
      levels: [],
      updatedAt: Optional.empty(),
    };
  }
}
