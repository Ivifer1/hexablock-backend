import type { Progress } from '../../domain/progress/progress.js';
import { Optional } from '../../domain/shared/optional.js';
import type { ProgressInput } from '../ports/progress-repository.js';

export interface ProgressView extends Omit<ProgressInput, 'userId'> {
  readonly updatedAt: Optional<Date>;
}

export function toProgressView(progress: Progress): ProgressView {
  return {
    gameId: progress.gameId,
    bestScore: progress.bestScore,
    levels: progress.levels,
    updatedAt: Optional.of(progress.updatedAt),
  };
}
