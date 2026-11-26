import type { IGameRankingCatalog } from '../game-catalog.js';
import type { ILevelRepository } from '../ports/level-repository.js';
import type {
  IPersonalBestRepository,
  PersonalBestResult,
} from '../ports/personal-best-repository.js';
import { DomainError } from '../../domain/shared/domain-error.js';
import { ErrorCode } from '../../domain/shared/error-code.js';
import type { GameId } from '../../domain/game/game-id.js';
import type { LevelId } from '../../domain/level/level-id.js';
import type { Score } from '../../domain/score/score.js';
import { RankingScope } from '../../domain/score/ranking-scope.js';
import type { UserId } from '../../domain/user/user-id.js';
import { Optional } from '../../domain/shared/optional.js';
import { ScoreInputError } from './score-input.error.js';

export interface SubmitScoreInput {
  readonly playerId: UserId;
  readonly gameId: GameId;
  readonly score: Score;
  readonly levelId: Optional<LevelId>;
}

export class SubmitScoreUseCase {
  constructor(
    private readonly catalog: IGameRankingCatalog,
    private readonly levels: Pick<ILevelRepository, 'findById'>,
    private readonly records: IPersonalBestRepository,
  ) {}

  async execute(input: SubmitScoreInput): Promise<PersonalBestResult> {
    const ranking = this.catalog.rankingFor(input.gameId);
    let scope: RankingScope;

    if (ranking === 'game') {
      if (input.levelId.isPresent()) {
        throw new ScoreInputError(
          'levelId',
          'A game ranking does not accept a level ID',
        );
      }
      scope = RankingScope.forGame(input.gameId);
    } else {
      if (!input.levelId.isPresent()) {
        throw new ScoreInputError(
          'levelId',
          'A level ID is required for this game',
        );
      }
      const level = await this.levels.findById(input.levelId.get());
      if (!level.isPresent() || !level.get().gameId.equals(input.gameId)) {
        throw new ScoreInputError(
          'levelId',
          'The level must belong to the requested game',
        );
      }
      scope = RankingScope.forLevel(input.gameId, input.levelId.get());
    }

    try {
      return await this.records.retain({
        playerId: input.playerId,
        scope,
        score: input.score,
      });
    } catch (error) {
      if (
        error instanceof DomainError &&
        error.code === ErrorCode.InvalidScore
      ) {
        throw new ScoreInputError('score', 'Expected a nonnegative safe integer');
      }
      throw error;
    }
  }
}
