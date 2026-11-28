import { randomUUID } from 'node:crypto';
import { mongo } from 'mongoose';
import { inject } from 'vitest';
import { MongoPersonalBestRepository } from '../../../src/adapters/persistence/mongo/mongo-personal-best.repository.js';
import {
  PERSONAL_BEST_COLLECTION,
  type PersonalBestDocument,
} from '../../../src/adapters/persistence/mongo/personal-best.schema.js';
import { GameId } from '../../../src/domain/game/game-id.js';
import { LevelId } from '../../../src/domain/level/level-id.js';
import { RankingScope } from '../../../src/domain/score/ranking-scope.js';
import { Score } from '../../../src/domain/score/score.js';
import { UserId } from '../../../src/domain/user/user-id.js';

const firstAt = new Date('2026-11-26T12:00:00.000Z');
const laterAt = new Date('2026-11-26T12:01:00.000Z');
const player = UserId.of('player-a');
const other = UserId.of('player-b');
const lines = RankingScope.forGame(GameId.of('hexa-lines'));
const fit = GameId.of('hexa-fit');
const key = { gameId: 1, levelId: 1, userId: 1 } as const;
const binary = { locale: 'simple' } as const;
const gameKey = { gameId: 'hexa-lines', levelId: null, userId: 'player-a' };

describe('MongoPersonalBestRepository (integration, UC-010)', () => {
  let client: mongo.MongoClient;
  let db: mongo.Db;
  let collection: mongo.Collection<PersonalBestDocument>;
  let repository: MongoPersonalBestRepository;
  let now: Date;
  const clock = { now: () => now };

  beforeEach(async () => {
    client = await new mongo.MongoClient(inject('mongoUri')).connect();
    db = client.db('uc010-' + randomUUID());
    collection = db.collection<PersonalBestDocument>(PERSONAL_BEST_COLLECTION);
    now = firstAt;
    repository = new MongoPersonalBestRepository(collection, clock);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    try {
      await db.dropDatabase();
    } finally {
      await client.close();
    }
  });

  const installIndex = () =>
    collection.createIndex(key, {
      unique: true,
      collation: binary,
      name: 'retained_score_key',
    });

  const retain = (value: number, scope = lines, playerId = player) =>
    repository.retain({ playerId, scope, score: Score.of(value) });

  it('should_store_zero_and_then_a_higher_score_when_each_write_is_confirmed', async () => {
    // Arrange
    await installIndex();

    // Act
    const first = await retain(0);
    now = laterAt;
    const improved = await retain(12);

    // Assert
    expect(first).toMatchObject({
      personalBest: true,
      record: { score: Score.of(0) },
    });
    expect(first.record.achievedAt.toDate()).toEqual(firstAt);
    expect(improved).toMatchObject({
      personalBest: true,
      record: { score: Score.of(12) },
    });
    expect(improved.record.achievedAt.toDate()).toEqual(laterAt);
    expect(await collection.findOne(gameKey)).toMatchObject({
      ...gameKey,
      score: 12,
      achievedAt: laterAt,
    });
    expect(await collection.countDocuments()).toBe(1);
  });

  it('should_keep_the_original_record_without_a_write_or_clock_read_when_attempt_is_equal_or_lower', async () => {
    // Arrange
    await installIndex();
    const saved = await retain(60);
    const before = await collection.findOne(gameKey);
    const insert = vi.spyOn(collection, 'insertOne');
    const update = vi.spyOn(collection, 'updateOne');
    const time = vi.spyOn(clock, 'now');
    now = laterAt;

    // Act
    const replies = [await retain(60), await retain(59)];

    // Assert
    expect(replies).toEqual([
      { record: saved.record, personalBest: false },
      { record: saved.record, personalBest: false },
    ]);
    expect(await collection.findOne(gameKey)).toEqual(before);
    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(time).not.toHaveBeenCalled();
  });

  it('should_keep_distinct_records_when_player_game_or_level_differs', async () => {
    // Arrange
    await installIndex();
    const one = RankingScope.forLevel(fit, LevelId.of('fit-001'));
    const two = RankingScope.forLevel(fit, LevelId.of('fit-002'));

    // Act
    const replies = await Promise.all([
      retain(10),
      retain(20, lines, other),
      retain(30, RankingScope.forGame(GameId.of('hexa-merge'))),
      retain(40, one),
      retain(50, two),
    ]);

    // Assert
    const rows = await collection
      .find({}, { projection: { _id: 0 } })
      .sort({ score: 1 })
      .toArray();
    expect(replies.map(({ personalBest }) => personalBest)).toEqual(
      Array(5).fill(true),
    );
    expect(rows).toEqual([
      { ...gameKey, score: 10, achievedAt: firstAt },
      { ...gameKey, userId: 'player-b', score: 20, achievedAt: firstAt },
      { ...gameKey, gameId: 'hexa-merge', score: 30, achievedAt: firstAt },
      {
        ...gameKey,
        gameId: 'hexa-fit',
        levelId: 'fit-001',
        score: 40,
        achievedAt: firstAt,
      },
      {
        ...gameKey,
        gameId: 'hexa-fit',
        levelId: 'fit-002',
        score: 50,
        achievedAt: firstAt,
      },
    ]);
  });

  it.each([
    ['wrong order', { levelId: 1, gameId: 1, userId: 1 }, { unique: true }],
    ['non-unique', key, { unique: false }],
    ['sparse', key, { unique: true, sparse: true }],
    ['hidden', key, { unique: true, hidden: true }],
    [
      'partial',
      key,
      { unique: true, partialFilterExpression: { userId: 'player-a' } },
    ],
    ['non-binary', key, { unique: true, collation: { locale: 'en' } }],
  ] as const)(
    'should_prevent_writes_when_the_required_index_is_%s',
    async (_name, pattern, options) => {
      // Arrange
      await collection.createIndex(pattern, options);

      // Act and assert
      await expect(retain(40)).rejects.toThrow(
        'Required personal best index is unavailable',
      );
      expect(await collection.countDocuments()).toBe(0);
    },
  );

  it('should_not_provision_storage_when_collection_or_required_index_is_missing', async () => {
    // Arrange: no collection or index exists.

    // Act and assert
    await expect(retain(40)).rejects.toThrow();
    expect(
      await db.listCollections({ name: PERSONAL_BEST_COLLECTION }).hasNext(),
    ).toBe(false);
  });

  it('should_not_write_when_primary_refuses_the_exact_index_hint', async () => {
    // Arrange
    const name = await installIndex();
    const unavailable = new Error('Index cannot be used yet');
    const read = vi
      .spyOn(collection, 'findOne')
      .mockRejectedValueOnce(unavailable);
    const insert = vi.spyOn(collection, 'insertOne');

    // Act and assert
    await expect(retain(40)).rejects.toThrow(unavailable);
    expect(read).toHaveBeenCalledWith(gameKey, {
      collation: binary,
      readPreference: 'primary',
      hint: name,
    });
    expect(insert).not.toHaveBeenCalled();
    expect(await collection.countDocuments()).toBe(0);
  });

  it.each(['insert', 'update'] as const)(
    'should_return_the_winners_record_without_claiming_its_write_when_%s_loses',
    async (race) => {
      // Arrange
      await installIndex();
      if (race === 'update') await retain(10);
      const insert = collection.insertOne.bind(collection);
      const update = collection.updateOne.bind(collection);
      let winner: Awaited<ReturnType<typeof retain>> | undefined;
      const win = async () => {
        now = laterAt;
        winner = await retain(90);
      };
      if (race === 'insert')
        vi.spyOn(collection, 'insertOne').mockImplementationOnce(
          async (...args) => {
            await win();
            return insert(...args);
          },
        );
      else
        vi.spyOn(collection, 'updateOne').mockImplementationOnce(
          async (...args) => {
            await win();
            return update(...args);
          },
        );

      // Act
      const loser = await retain(40);

      // Assert
      expect(winner?.personalBest).toBe(true);
      expect(loser).toEqual({ record: winner?.record, personalBest: false });
      expect(loser.record.achievedAt.toDate()).toEqual(laterAt);
      expect(await collection.findOne(gameKey)).toMatchObject({
        score: 90,
        achievedAt: laterAt,
      });
      expect(await collection.countDocuments()).toBe(1);
    },
  );

  it('should_not_retry_a_duplicate_when_the_conflict_is_on_another_index', async () => {
    // Arrange
    await installIndex();
    await collection.createIndex({ score: 1 }, { unique: true });
    await retain(40);
    const before = await collection.find().toArray();
    const insert = vi.spyOn(collection, 'insertOne');
    const update = vi.spyOn(collection, 'updateOne');

    // Act and assert
    await expect(retain(40, lines, other)).rejects.toMatchObject({
      code: 11000,
      keyPattern: { score: 1 },
    });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
    expect(await collection.find().toArray()).toEqual(before);
  });

  it('should_reject_and_not_retry_when_an_insert_reply_is_lost_after_mongo_applies_it', async () => {
    // Arrange
    await installIndex();
    const insert = collection.insertOne.bind(collection);
    const lost = new Error('Reply lost after insert');
    const attempt = vi
      .spyOn(collection, 'insertOne')
      .mockImplementationOnce(async (...args) => {
        await insert(...args);
        throw lost;
      });

    // Act and assert
    await expect(retain(40)).rejects.toThrow(lost);
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(await collection.findOne(gameKey)).toMatchObject({ score: 40 });
  });

  it('should_not_claim_success_when_update_is_unacknowledged_or_contention_never_resolves', async () => {
    // Arrange
    await installIndex();
    await retain(10);
    const before = await collection.findOne(gameKey);
    const result = {
      acknowledged: false,
      matchedCount: 0,
      modifiedCount: 0,
      upsertedCount: 0,
      upsertedId: null,
    };
    let contentionWrites = 0;
    const update = vi
      .spyOn(collection, 'updateOne')
      .mockImplementation(async () => {
        // Test safety guard, not a production retry-count requirement.
        if (++contentionWrites > 50)
          throw new Error('Test contention safety guard exceeded');
        return { ...result, acknowledged: true };
      })
      .mockResolvedValueOnce(result);

    // Act and assert
    await expect(retain(40)).rejects.toThrow(
      'Personal best update was not acknowledged',
    );
    expect(update).toHaveBeenCalledTimes(1);
    await expect(retain(40)).rejects.toThrow(
      'Could not save personal best after concurrent changes',
    );
    expect(contentionWrites).toBeGreaterThan(0);
    expect(await collection.findOne(gameKey)).toEqual(before);
  });

  it('should_retry_and_improve_when_a_lower_concurrent_attempt_wins_first', async () => {
    // Arrange
    await installIndex();
    await retain(10);
    const update = collection.updateOne.bind(collection);
    let intervening: Awaited<ReturnType<typeof retain>> | undefined;
    vi.spyOn(collection, 'updateOne').mockImplementationOnce(
      async (...args) => {
        now = laterAt;
        intervening = await retain(40);
        return update(...args);
      },
    );

    // Act
    const result = await retain(90);

    // Assert
    expect(intervening?.personalBest).toBe(true);
    expect(intervening?.record.score.toNumber()).toBe(40);
    expect(result.personalBest).toBe(true);
    expect(result.record.score.toNumber()).toBe(90);
    expect(result.record.achievedAt.toDate()).toEqual(laterAt);
    expect(await collection.findOne(gameKey)).toMatchObject({
      score: 90,
      achievedAt: laterAt,
    });
    expect(await collection.countDocuments()).toBe(1);
  });

  it('should_reject_without_retry_when_an_applied_update_loses_its_reply', async () => {
    // Arrange
    await installIndex();
    await retain(10);
    now = laterAt;
    const update = collection.updateOne.bind(collection);
    const lost = new Error('Reply lost after update');
    const writes = vi
      .spyOn(collection, 'updateOne')
      .mockImplementationOnce(async (...args) => {
        await update(...args);
        throw lost;
      });

    // Act and assert
    await expect(retain(90)).rejects.toThrow(lost);
    expect(writes).toHaveBeenCalledTimes(1);
    expect(await collection.findOne(gameKey)).toMatchObject({
      score: 90,
      achievedAt: laterAt,
    });
    expect(await collection.countDocuments()).toBe(1);
  });
});
