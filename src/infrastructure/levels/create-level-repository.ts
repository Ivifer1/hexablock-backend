import type { Model } from 'mongoose';
import { HexaFitSectionMapper } from '../../adapters/persistence/mongo/hexa-fit-section.mapper.js';
import { HexaSortSectionMapper } from '../../adapters/persistence/mongo/hexa-sort-section.mapper.js';
import { LevelMapper } from '../../adapters/persistence/mongo/level.mapper.js';
import type { LevelDocument } from '../../adapters/persistence/mongo/level.schema.js';
import { MongoLevelRepository } from '../../adapters/persistence/mongo/mongo-level.repository.js';
import type { ILevelRepository } from '../../application/ports/level-repository.js';
import { GameId } from '../../domain/game/game-id.js';
import { createLevelValidator } from './create-level-validator.js';

// The caller provides a model whose indexes are initialized before accepting writes.
export function createLevelRepository(
  model: Model<LevelDocument>,
): ILevelRepository {
  const mapper = new LevelMapper(createLevelValidator(), [
    { gameId: GameId.of('hexa-fit'), mapper: new HexaFitSectionMapper() },
    { gameId: GameId.of('hexa-sort'), mapper: new HexaSortSectionMapper() },
  ]);
  return new MongoLevelRepository(model, mapper);
}
