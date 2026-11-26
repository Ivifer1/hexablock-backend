import { Count } from '../../domain/shared/count.js';
import { Optional } from '../../domain/shared/optional.js';
import type { ProgressInput } from '../ports/progress-repository.js';

export type ProgressDraft = Pick<ProgressInput, 'bestScore' | 'levels'>;

export class ProgressInputError extends Error {
  constructor(
    readonly field: 'bestScore' | 'levels' | 'levels.stars',
    message: string,
  ) {
    super(message);
  }
}

export interface IProgressModel {
  emptyBestScore(): Optional<Count>;
  validate(draft: ProgressDraft): void;
}

export class BestScoreProgressModel implements IProgressModel {
  emptyBestScore(): Optional<Count> {
    return Optional.of(Count.of(0));
  }

  validate(draft: ProgressDraft): void {
    if (!draft.bestScore.isPresent()) {
      throw new ProgressInputError('bestScore', 'A best score is required');
    }
    if (draft.levels.length !== 0) {
      throw new ProgressInputError('levels', 'Expected no level entries');
    }
  }
}

export class LevelProgressModel implements IProgressModel {
  constructor(private readonly maximumStars: Count) {}

  emptyBestScore(): Optional<Count> {
    return Optional.empty();
  }

  validate(draft: ProgressDraft): void {
    if (draft.bestScore.isPresent()) {
      throw new ProgressInputError('bestScore', 'Expected null for this game');
    }
    if (
      draft.levels.some((level) => this.maximumStars.isLessThan(level.stars))
    ) {
      throw new ProgressInputError(
        'levels.stars',
        'Stars exceed the limit for this game',
      );
    }
  }
}
