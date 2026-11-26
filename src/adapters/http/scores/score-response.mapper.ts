import type { PersonalBestResult } from '../../../application/ports/personal-best-repository.js';

export interface ScoreResponse {
  readonly gameId: string;
  readonly levelId?: string;
  readonly score: number;
  readonly personalBest: boolean;
}

export class ScoreResponseMapper {
  toResponse(result: PersonalBestResult): ScoreResponse {
    const { record } = result;
    return {
      gameId: record.scope.gameId.toString(),
      ...(record.scope.levelId.isPresent()
        ? { levelId: record.scope.levelId.get().toString() }
        : {}),
      score: record.score.toNumber(),
      personalBest: result.personalBest,
    };
  }
}
