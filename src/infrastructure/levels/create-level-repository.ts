import type { Model } from 'mongoose';
import {
  decodeFitSection,
  decodeSortSection,
  encodeFitSection,
  encodeSortSection,
} from '../../adapters/levels/level-section-payloads.js';
import { HexaFitSectionMapper } from '../../adapters/persistence/mongo/hexa-fit-section.mapper.js';
import { HexaSortSectionMapper } from '../../adapters/persistence/mongo/hexa-sort-section.mapper.js';
import { LevelMapper } from '../../adapters/persistence/mongo/level.mapper.js';
import type { LevelDocument } from '../../adapters/persistence/mongo/level.schema.js';
import { MongoLevelRepository } from '../../adapters/persistence/mongo/mongo-level.repository.js';
import type { ILevelRepository } from '../../application/ports/level-repository.js';
import { GameId } from '../../domain/game/game-id.js';
import { ErrorCode } from '../../domain/shared/error-code.js';
import { createLevelValidator } from './create-level-validator.js';

export function createLevelSectionBindings() {
  const fit = new HexaFitSectionMapper();
  const sort = new HexaSortSectionMapper();
  return [
    {
      gameId: GameId.of('hexa-fit'),
      sectionKey: fit.sectionKey,
      mapper: fit,
      encode: encodeFitSection,
      decode: decodeFitSection,
      validationErrors: [ErrorCode.InvalidFitSection],
    },
    {
      gameId: GameId.of('hexa-sort'),
      sectionKey: sort.sectionKey,
      mapper: sort,
      encode: encodeSortSection,
      decode: decodeSortSection,
      validationErrors: [ErrorCode.InvalidSortSection],
    },
  ];
}

// The caller initializes indexes if it intends to accept writes.
export function createLevelRepository(
  model: Model<LevelDocument>,
  validator = createLevelValidator(),
): ILevelRepository {
  const mapper = new LevelMapper(validator, createLevelSectionBindings());
  return new MongoLevelRepository(model, mapper);
}
