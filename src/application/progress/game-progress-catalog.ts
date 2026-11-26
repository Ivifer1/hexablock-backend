import type { GameId } from '../../domain/game/game-id.js';
import { DomainError } from '../../domain/shared/domain-error.js';
import { ErrorCode } from '../../domain/shared/error-code.js';
import type { IProgressModel } from './progress-model.js';

export interface IGameProgressCatalog {
  modelFor(game: GameId): IProgressModel;
}

interface GameProgressRegistration {
  readonly game: GameId;
  readonly model: IProgressModel;
}

export class GameProgressCatalog implements IGameProgressCatalog {
  private readonly registrations: readonly GameProgressRegistration[];

  constructor(registrations: readonly GameProgressRegistration[]) {
    this.registrations = [...registrations];
  }

  modelFor(game: GameId): IProgressModel {
    const found = this.registrations.find((entry) => entry.game.equals(game));
    if (!found) throw new DomainError(ErrorCode.ProgressGameNotFound);
    return found.model;
  }
}
