import { GameId } from '../../../domain/game/game-id.js';
import { LevelId } from '../../../domain/level/level-id.js';
import { LevelProgress } from '../../../domain/progress/level-progress.js';
import { Progress } from '../../../domain/progress/progress.js';
import { Count } from '../../../domain/shared/count.js';
import { UserId } from '../../../domain/user/user-id.js';
import type { ProgressDocument } from './progress.schema.js';

export class ProgressMapper {
  static toDomain(doc: ProgressDocument): Progress {
    if (
      typeof doc.userId !== 'string' ||
      typeof doc.gameId !== 'string' ||
      !(doc.updatedAt instanceof Date) ||
      !Array.isArray(doc.levels) ||
      !Number.isSafeInteger(doc.revision) ||
      doc.revision < 0
    ) {
      throw new Error('Invalid stored progress');
    }
    const userId = UserId.of(doc.userId);
    const gameId = GameId.of(doc.gameId);
    if (doc.bestScore !== null) {
      if (doc.levels.length > 0)
        throw new Error('Mixed stored progress shapes');
      return Progress.forScore(
        userId,
        gameId,
        Count.of(doc.bestScore),
        doc.updatedAt,
      );
    }
    const levels = doc.levels.map(
      ({ levelId, completed, stars, bestScore }) => {
        if (typeof levelId !== 'string' || typeof completed !== 'boolean') {
          throw new Error('Invalid stored level progress');
        }
        return LevelProgress.of(
          LevelId.of(levelId),
          completed,
          Count.of(stars),
          Count.of(bestScore),
        );
      },
    );
    return Progress.forLevels(userId, gameId, levels, doc.updatedAt);
  }

  static toDocument(progress: Progress, revision: number): ProgressDocument {
    return {
      userId: progress.userId.toString(),
      gameId: progress.gameId.toString(),
      bestScore: progress.bestScore.isPresent()
        ? progress.bestScore.get().toNumber()
        : null,
      levels: progress.levels.map((level) => ({
        levelId: level.levelId.toString(),
        completed: level.completed,
        stars: level.stars.toNumber(),
        bestScore: level.bestScore.toNumber(),
      })),
      updatedAt: progress.updatedAt,
      revision,
    };
  }
}
