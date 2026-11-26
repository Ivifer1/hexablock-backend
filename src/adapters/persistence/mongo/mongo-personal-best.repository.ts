import { mongo } from 'mongoose';
import type { IClock } from '../../../application/ports/clock.js';
import type {
  IPersonalBestRepository,
  PersonalBestAttempt,
  PersonalBestResult,
} from '../../../application/ports/personal-best-repository.js';
import { AchievedAt } from '../../../domain/score/achieved-at.js';
import { PersonalBest } from '../../../domain/score/personal-best.js';
import {
  PersonalBestMapper,
  type PersonalBestKey,
} from './personal-best.mapper.js';
import {
  PERSONAL_BEST_COLLATION,
  PERSONAL_BEST_KEY,
  type PersonalBestDocument,
} from './personal-best.schema.js';

const MAX_ATTEMPTS = 5;
const READ_OPTIONS = {
  collation: PERSONAL_BEST_COLLATION,
  readPreference: 'primary',
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasExactIndexKey(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const actual = Object.entries(value);
  const expected = Object.entries(PERSONAL_BEST_KEY);
  return (
    actual.length === expected.length &&
    expected.every(
      ([field, direction], index) =>
        actual[index]?.[0] === field && actual[index][1] === direction,
    )
  );
}

function isRequiredIndex(index: mongo.IndexDescriptionInfo): boolean {
  return (
    hasExactIndexKey(index.key) &&
    index.unique === true &&
    index.sparse !== true &&
    index.hidden !== true &&
    !Object.hasOwn(index, 'partialFilterExpression') &&
    (index.collation === undefined ||
      index.collation.locale === PERSONAL_BEST_COLLATION.locale)
  );
}

function isRankingCollision(error: unknown, key: PersonalBestKey): boolean {
  if (!(error instanceof mongo.MongoServerError) || error.code !== 11000)
    return false;
  const values: unknown = error.keyValue;
  return (
    hasExactIndexKey(error.keyPattern) &&
    isRecord(values) &&
    Object.keys(values).length === 3 &&
    Object.entries(key).every(
      ([field, value]) =>
        Object.hasOwn(values, field) && values[field] === value,
    )
  );
}

export class MongoPersonalBestRepository implements IPersonalBestRepository {
  constructor(
    private readonly collection: mongo.Collection<PersonalBestDocument>,
    private readonly clock: IClock,
  ) {}

  async retain(attempt: PersonalBestAttempt): Promise<PersonalBestResult> {
    const key = PersonalBestMapper.toKey(attempt.playerId, attempt.scope);
    const indexes = await this.collection
      .listIndexes({ readPreference: 'primary' })
      .toArray();
    const index = indexes.find(isRequiredIndex);
    if (!index?.name)
      throw new Error('Required personal best index is unavailable');

    for (let retry = 0; retry < MAX_ATTEMPTS; retry += 1) {
      // The index can be visible in the catalog before MongoDB accepts its hint.
      const document = await this.collection.findOne(key, {
        ...READ_OPTIONS,
        hint: index.name,
      });
      if (!document) {
        const record = this.record(attempt);
        try {
          const result = await this.collection.insertOne({
            ...key,
            ...PersonalBestMapper.toValues(record),
          });
          if (!result.acknowledged)
            throw new Error('Personal best insert was not acknowledged');
          return { record, personalBest: true };
        } catch (error) {
          if (!isRankingCollision(error, key)) throw error;
          continue;
        }
      }

      const stored = PersonalBestMapper.toDomain(document);
      if (!attempt.score.isGreaterThan(stored.score))
        return { record: stored, personalBest: false };

      const record = this.record(attempt);
      const result = await this.collection.updateOne(
        { ...key, _id: document._id, score: document.score },
        { $set: PersonalBestMapper.toValues(record) },
        { collation: PERSONAL_BEST_COLLATION },
      );
      if (!result.acknowledged)
        throw new Error('Personal best update was not acknowledged');
      if (result.matchedCount === 0) continue;
      if (result.matchedCount !== 1 || result.modifiedCount !== 1)
        throw new Error('Personal best update was not confirmed');
      return { record, personalBest: true };
    }

    throw new Error('Could not save personal best after concurrent changes');
  }

  private record(attempt: PersonalBestAttempt): PersonalBest {
    return PersonalBest.record(
      attempt.playerId,
      attempt.scope,
      attempt.score,
      AchievedAt.of(this.clock.now()),
    );
  }
}
