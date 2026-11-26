import type { ILevelRepository } from '../ports/level-repository.js';
import type {
  IProgressRepository,
  ProgressInput,
} from '../ports/progress-repository.js';
import type { IGameProgressCatalog } from '../game-catalog.js';
import { ProgressInputError } from '../progress/progress-model.js';
import {
  toProgressView,
  type ProgressView,
} from '../progress/progress-view.js';

export class SyncPlayerProgressUseCase {
  constructor(
    private readonly progress: IProgressRepository,
    private readonly catalog: IGameProgressCatalog,
    private readonly levels: Pick<ILevelRepository, 'list'>,
  ) {}

  async execute(snapshot: ProgressInput): Promise<ProgressView> {
    this.catalog.modelFor(snapshot.gameId).validate(snapshot);
    if (snapshot.levels.length > 0) {
      const available = await this.levels.list(snapshot.gameId);
      if (
        snapshot.levels.some(
          (entry) => !available.some((level) => level.id.equals(entry.levelId)),
        )
      ) {
        throw new ProgressInputError(
          'levels',
          'Each level must belong to the requested game',
        );
      }
    }
    return toProgressView(await this.progress.saveBest(snapshot));
  }
}
