import type { GameId } from '../domain/game/game-id.js';
import { DomainError } from '../domain/shared/domain-error.js';
import { ErrorCode } from '../domain/shared/error-code.js';
import type { IProgressModel } from './progress/progress-model.js';

export type RankingKind = 'game' | 'level';

export interface IGameProgressCatalog {
  modelFor(game: GameId): IProgressModel;
}

export interface IGameRankingCatalog {
  rankingFor(game: GameId): RankingKind;
}

export interface GameRegistration {
  readonly game: GameId;
  readonly model: IProgressModel;
  readonly ranking: RankingKind;
}

export class GameCatalog implements IGameProgressCatalog, IGameRankingCatalog {
  private readonly registrations: readonly GameRegistration[];

  constructor(registrations: readonly GameRegistration[]) {
    this.registrations = [...registrations];
  }

  modelFor(game: GameId): IProgressModel {
    const found = this.registrations.find((entry) => entry.game.equals(game));
    if (!found) throw new DomainError(ErrorCode.ProgressGameNotFound);
    return found.model;
  }

  rankingFor(game: GameId): RankingKind {
    const found = this.registrations.find((entry) => entry.game.equals(game));
    if (!found) throw new DomainError(ErrorCode.GameNotFound);
    return found.ranking;
  }
}
