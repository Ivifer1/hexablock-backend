import type { ProgressView } from '../../../application/progress/progress-view.js';

export interface ProgressResponse {
  readonly gameId: string;
  readonly bestScore: number | null;
  readonly levels: Readonly<
    Record<
      string,
      {
        readonly completed: boolean;
        readonly stars: number;
        readonly bestScore: number;
      }
    >
  >;
  readonly updatedAt: string | null;
}

export function toProgressResponse(progress: ProgressView): ProgressResponse {
  return {
    gameId: progress.gameId.toString(),
    bestScore: progress.bestScore.isPresent()
      ? progress.bestScore.get().toNumber()
      : null,
    levels: Object.fromEntries(
      progress.levels.map((level) => [
        level.levelId.toString(),
        {
          completed: level.completed,
          stars: level.stars.toNumber(),
          bestScore: level.bestScore.toNumber(),
        },
      ]),
    ),
    updatedAt: progress.updatedAt.isPresent()
      ? progress.updatedAt.get().toISOString()
      : null,
  };
}
