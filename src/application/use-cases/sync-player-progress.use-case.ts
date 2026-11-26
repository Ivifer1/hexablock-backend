import type {
  IProgressRepository,
  ProgressInput,
} from '../ports/progress-repository.js';
import type { IGameProgressCatalog } from '../progress/game-progress-catalog.js';
import { ProgressInputError } from '../progress/progress-model.js';
import {
  toProgressView,
  type ProgressView,
} from '../progress/progress-view.js';

export class SyncPlayerProgressUseCase {
  constructor(
    private readonly progress: IProgressRepository,
    private readonly catalog: IGameProgressCatalog,
  ) {}

  async execute(snapshot: ProgressInput): Promise<ProgressView> {
    this.catalog.modelFor(snapshot.gameId).validate(snapshot);
    if (!snapshot.bestScore.isPresent()) {
      throw new ProgressInputError('bestScore', 'A best score is required');
    }
    return toProgressView(await this.progress.saveBest(snapshot));
  }
}
