import { mongo } from 'mongoose';
import type { IProgressRepository } from '../../../application/ports/progress-repository.js';
import type { GameId } from '../../../domain/game/game-id.js';
import type { Progress } from '../../../domain/progress/progress.js';
import { Optional } from '../../../domain/shared/optional.js';
import type { UserId } from '../../../domain/user/user-id.js';
import { ProgressMapper } from './progress.mapper.js';
import {
  PROGRESS_COLLATION,
  PROGRESS_KEY,
  type ProgressDocument,
} from './progress.schema.js';

const MAX_ATTEMPTS = 5;
const READ_OPTIONS = {
  collation: PROGRESS_COLLATION,
  readPreference: 'primary',
} as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function matchesOrderedKey(value: unknown): boolean {
  if (!isObject(value)) return false;
  const entries = Object.entries(value);
  const expected = Object.entries(PROGRESS_KEY);
  return (
    entries.length === expected.length &&
    expected.every(
      ([field, order], index) =>
        entries[index]?.[0] === field && entries[index][1] === order,
    )
  );
}

function isRequiredIndex(index: mongo.IndexDescriptionInfo): boolean {
  return (
    matchesOrderedKey(index.key) &&
    index.unique === true &&
    index.sparse !== true &&
    index.hidden !== true &&
    !Object.hasOwn(index, 'partialFilterExpression') &&
    (index.collation === undefined ||
      index.collation.locale === PROGRESS_COLLATION.locale)
  );
}

function isPairCollision(
  error: unknown,
  key: Pick<ProgressDocument, 'userId' | 'gameId'>,
): boolean {
  if (!(error instanceof mongo.MongoServerError) || error.code !== 11000)
    return false;
  const values: unknown = error.keyValue;
  return (
    matchesOrderedKey(error.keyPattern) &&
    isObject(values) &&
    values.userId === key.userId &&
    values.gameId === key.gameId
  );
}

function lookup(userId: UserId, gameId: GameId) {
  return { userId: userId.toString(), gameId: gameId.toString() };
}

export class MongoProgressRepository implements IProgressRepository {
  constructor(
    private readonly collection: mongo.Collection<ProgressDocument>,
  ) {}

  async find(userId: UserId, gameId: GameId): Promise<Optional<Progress>> {
    const doc = await this.collection.findOne(
      lookup(userId, gameId),
      READ_OPTIONS,
    );
    return doc ? Optional.of(ProgressMapper.toDomain(doc)) : Optional.empty();
  }

  async listForUser(userId: UserId): Promise<readonly Progress[]> {
    const docs = await this.collection
      .find({ userId: userId.toString() }, READ_OPTIONS)
      .toArray();
    return docs.map(ProgressMapper.toDomain);
  }

  async saveBest(snapshot: Progress): Promise<Progress> {
    const indexes = await this.collection
      .listIndexes({ readPreference: 'primary' })
      .toArray();
    const index = indexes.find(isRequiredIndex);
    if (!index?.name) throw new Error('Required progress index is unavailable');

    const key = lookup(snapshot.userId, snapshot.gameId);
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      // Catalog entries can describe unfinished builds. MongoDB must accept
      // the exact index as a query hint before the repository attempts a write.
      const current = await this.collection.findOne(key, {
        ...READ_OPTIONS,
        hint: index.name,
      });
      if (!current) {
        try {
          const result = await this.collection.insertOne(
            ProgressMapper.toDocument(snapshot, 0),
          );
          if (!result.acknowledged)
            throw new Error('Progress insert was not acknowledged');
          return snapshot;
        } catch (error) {
          if (!isPairCollision(error, key)) throw error;
          continue;
        }
      }

      const merged = ProgressMapper.toDomain(current).mergedWith(snapshot);
      const nextRevision = current.revision + 1;
      if (!Number.isSafeInteger(nextRevision))
        throw new Error('Progress revision exhausted');
      const result = await this.collection.replaceOne(
        { ...key, _id: current._id, revision: current.revision },
        ProgressMapper.toDocument(merged, nextRevision),
        { collation: PROGRESS_COLLATION },
      );
      if (!result.acknowledged)
        throw new Error('Progress update was not acknowledged');
      if (result.matchedCount === 1) return merged;
    }
    throw new Error('Could not save progress after concurrent changes');
  }
}
