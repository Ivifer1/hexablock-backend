import type { Model } from 'mongoose';
import type { ILevelRepository } from '../../../application/ports/level-repository.js';
import type { GameId } from '../../../domain/game/game-id.js';
import type { Level } from '../../../domain/level/level.js';
import type { LevelId } from '../../../domain/level/level-id.js';
import { DomainError } from '../../../domain/shared/domain-error.js';
import { ErrorCode } from '../../../domain/shared/error-code.js';
import { Optional } from '../../../domain/shared/optional.js';
import type { LevelMapper } from './level.mapper.js';
import type { LevelDocument } from './level.schema.js';

export class MongoLevelRepository implements ILevelRepository {
  constructor(
    private readonly model: Model<LevelDocument>,
    private readonly mapper: LevelMapper,
  ) {}

  async list(gameId: GameId): Promise<readonly Level[]> {
    const documents = await this.model
      .find({ gameId: gameId.toString() })
      .sort({ order: 1 })
      .lean<LevelDocument[]>()
      .exec();
    return documents.map((document) => this.mapper.toDomain(document));
  }

  async findById(id: LevelId): Promise<Optional<Level>> {
    const document = await this.model
      .findById(id.toString())
      .lean<LevelDocument>()
      .exec();
    return document
      ? Optional.of(this.mapper.toDomain(document))
      : Optional.empty();
  }

  async create(level: Level): Promise<void> {
    const document = this.mapper.toDocument(level);
    try {
      await this.model.create(document);
    } catch (error) {
      rethrowWriteError(error);
    }
  }

  async replace(level: Level): Promise<boolean> {
    const document = this.mapper.toDocument(level);
    try {
      const result = await this.model
        .replaceOne({ _id: document._id }, document, { upsert: false })
        .exec();
      return result.matchedCount === 1;
    } catch (error) {
      rethrowWriteError(error);
    }
  }

  async delete(id: LevelId): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id.toString() }).exec();
    return result.deletedCount === 1;
  }
}

const DUPLICATE_KEY = 11000;

function rethrowWriteError(error: unknown): never {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === DUPLICATE_KEY &&
    'keyPattern' in error
  ) {
    const keys = error.keyPattern;
    if (typeof keys === 'object' && keys !== null) {
      const fields = Object.keys(keys);
      if (fields.length === 1 && Object.hasOwn(keys, '_id')) {
        throw new DomainError(ErrorCode.LevelIdTaken);
      }
      if (
        fields.length === 2 &&
        Object.hasOwn(keys, 'gameId') &&
        Object.hasOwn(keys, 'order')
      ) {
        throw new DomainError(ErrorCode.LevelOrderTaken);
      }
    }
  }
  throw error;
}
