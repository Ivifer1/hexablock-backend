import { GameId } from '../../../domain/game/game-id.js';
import { LevelId } from '../../../domain/level/level-id.js';
import { AchievedAt } from '../../../domain/score/achieved-at.js';
import { PersonalBest } from '../../../domain/score/personal-best.js';
import { RankingScope } from '../../../domain/score/ranking-scope.js';
import { Score } from '../../../domain/score/score.js';
import { UserId } from '../../../domain/user/user-id.js';
import type { PersonalBestDocument } from './personal-best.schema.js';

export type PersonalBestKey = Pick<
  PersonalBestDocument,
  'gameId' | 'levelId' | 'userId'
>;

export class PersonalBestMapper {
  static toKey(user: UserId, scope: RankingScope): PersonalBestKey {
    return {
      gameId: scope.gameId.toString(),
      levelId: scope.levelId.isPresent()
        ? scope.levelId.get().toString()
        : null,
      userId: user.toString(),
    };
  }

  static toDomain(document: PersonalBestDocument): PersonalBest {
    if (
      typeof document.userId !== 'string' ||
      typeof document.gameId !== 'string' ||
      (document.levelId !== null && typeof document.levelId !== 'string') ||
      !(document.achievedAt instanceof Date)
    ) {
      throw new Error('Invalid stored personal best');
    }
    try {
      const game = GameId.of(document.gameId);
      const scope =
        document.levelId === null
          ? RankingScope.forGame(game)
          : RankingScope.forLevel(game, LevelId.of(document.levelId));
      return PersonalBest.record(
        UserId.of(document.userId),
        scope,
        Score.of(document.score),
        AchievedAt.of(document.achievedAt),
      );
    } catch (cause) {
      throw new Error('Invalid stored personal best', { cause });
    }
  }

  static toValues(
    record: PersonalBest,
  ): Pick<PersonalBestDocument, 'score' | 'achievedAt'> {
    return {
      score: record.score.toNumber(),
      achievedAt: record.achievedAt.toDate(),
    };
  }
}
