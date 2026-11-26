import { randomUUID } from 'node:crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mongo } from 'mongoose';
import { inject } from 'vitest';
import { MongoProgressRepository } from '../../../src/adapters/persistence/mongo/mongo-progress.repository.js';
import type { ProgressDocument } from '../../../src/adapters/persistence/mongo/progress.schema.js';
import { GameId } from '../../../src/domain/game/game-id.js';
import { LevelId } from '../../../src/domain/level/level-id.js';
import { LevelProgress } from '../../../src/domain/progress/level-progress.js';
import { Progress } from '../../../src/domain/progress/progress.js';
import type { ProgressInput } from '../../../src/application/ports/progress-repository.js';
import { Optional } from '../../../src/domain/shared/optional.js';
import { Count } from '../../../src/domain/shared/count.js';
import { UserId } from '../../../src/domain/user/user-id.js';

const player = UserId.of('bootstrap:first-admin');
const other = UserId.of('another-player');
const fit = GameId.of('hexa-fit');
const lines = GameId.of('hexa-lines');
const date = new Date('2026-11-25T00:00:00.000Z');

function level(id: string, completed: boolean, stars: number, score: number) {
  return LevelProgress.of(
    LevelId.of(id),
    completed,
    Count.of(stars),
    Count.of(score),
  );
}

describe('MongoProgressRepository (integration, UC-008)', () => {
  let client: mongo.MongoClient;
  let database: mongo.Db;
  let collection: mongo.Collection<ProgressDocument>;
  let repository: MongoProgressRepository;

  beforeEach(async () => {
    client = await new mongo.MongoClient(inject('mongoUri')).connect();
    database = client.db('uc008-' + randomUUID());
    collection = database.collection<ProgressDocument>('progress');
    repository = new MongoProgressRepository(collection, { now: () => date });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    try {
      await database.dropDatabase();
    } finally {
      await client.close();
    }
  });

  async function createRequiredIndex() {
    await collection.createIndex({ userId: 1, gameId: 1 }, { unique: true });
  }

  describe('UC-009 server timestamps', () => {
    const firstAt = new Date('2026-11-25T01:00:00.000Z');
    const laterAt = new Date('2026-11-25T02:00:00.000Z');
    const fitKey = { userId: player.toString(), gameId: fit.toString() };
    const input = (...levels: LevelProgress[]): ProgressInput => ({
      userId: player,
      gameId: fit,
      bestScore: Optional.empty<Count>(),
      levels,
    });

    it('should_record_server_timestamp_when_progress_is_first_saved', async () => {
      // Arrange
      await createRequiredIndex();
      const store = new MongoProgressRepository(collection, {
        now: () => firstAt,
      });
      const initial = input(level('fit-001', true, 1, 120));

      // Act
      const saved = await store.saveBest(initial);
      const persisted = await collection.findOne(fitKey);

      // Assert
      expect(saved.updatedAt).toEqual(firstAt);
      expect(persisted).toMatchObject({ updatedAt: firstAt, revision: 0 });
    });

    it.each(['identical', 'stale'] as const)(
      'should_preserve_timestamp_and_revision_when_replay_is_%s',
      async (replay) => {
        // Arrange
        await createRequiredIndex();
        let now = firstAt;
        const store = new MongoProgressRepository(collection, {
          now: () => now,
        });
        const savedLevels = [
          level('fit-001', true, 2, 120),
          level('fit-002', true, 1, 20),
        ];
        const initial = await store.saveBest(input(...savedLevels));
        const storedBefore = await collection.findOne(fitKey);
        const insert = vi.spyOn(collection, 'insertOne');
        const replace = vi.spyOn(collection, 'replaceOne');
        now = laterAt;
        const incomingLevels =
          replay === 'identical'
            ? [...savedLevels].reverse()
            : [level('fit-001', false, 1, 80)];

        // Act
        const saved = await store.saveBest(input(...incomingLevels));
        const persisted = await collection.findOne(fitKey);

        // Assert
        expect(saved).toEqual(initial);
        expect(persisted).toEqual(storedBefore);
        expect(insert).not.toHaveBeenCalled();
        expect(replace).not.toHaveBeenCalled();
      },
    );

    it.each([
      {
        field: 'stars',
        incoming: level('fit-001', false, 3, 80),
        retained: level('fit-001', true, 3, 120),
      },
      {
        field: 'score',
        incoming: level('fit-001', false, 1, 150),
        retained: level('fit-001', true, 2, 150),
      },
    ])(
      'should_record_new_timestamp_when_improved_field_is_$field',
      async ({ incoming, retained }) => {
        // Arrange
        await createRequiredIndex();
        let now = firstAt;
        const store = new MongoProgressRepository(collection, {
          now: () => now,
        });
        const omitted = level('fit-002', true, 1, 20);
        await store.saveBest(input(level('fit-001', true, 2, 120), omitted));
        now = laterAt;

        // Act
        const saved = await store.saveBest(input(incoming));
        const reloaded = (await store.find(player, fit)).get();
        const persisted = await collection.findOne(fitKey);

        // Assert
        expect(saved.levels).toEqual([retained, omitted]);
        expect(saved.updatedAt).toEqual(laterAt);
        expect(reloaded).toEqual(saved);
        expect(persisted).toMatchObject({ updatedAt: laterAt, revision: 1 });
      },
    );

    it('should_preserve_winner_timestamp_and_revision_when_retry_becomes_unchanged', async () => {
      // Arrange
      await createRequiredIndex();
      const winnerCollection =
        database.collection<ProgressDocument>('progress');
      const winner = new MongoProgressRepository(winnerCollection, {
        now: () => laterAt,
      });
      const initial = new MongoProgressRepository(winnerCollection, {
        now: () => firstAt,
      });
      await initial.saveBest(input(level('fit-001', true, 1, 100)));
      const now = vi.fn(() => new Date('2026-11-25T03:00:00.000Z'));
      const loser = new MongoProgressRepository(collection, { now });
      const originalReplace = collection.replaceOne.bind(collection);
      let winnerDocument: unknown = null;
      const replace = vi
        .spyOn(collection, 'replaceOne')
        .mockImplementationOnce(async (filter, document, options) => {
          await winner.saveBest(input(level('fit-001', true, 3, 150)));
          winnerDocument = await winnerCollection.findOne(fitKey);
          return originalReplace(filter, document, options);
        });

      // Act
      const saved = await loser.saveBest(
        input(level('fit-001', false, 2, 120)),
      );
      const persisted = await winnerCollection.findOne(fitKey);

      // Assert
      expect(saved.levels).toEqual([level('fit-001', true, 3, 150)]);
      expect(saved.updatedAt).toEqual(laterAt);
      expect(persisted).toEqual(winnerDocument);
      expect(persisted).toMatchObject({ updatedAt: laterAt, revision: 1 });
      expect(replace).toHaveBeenCalledTimes(1);
      expect(now).toHaveBeenCalledTimes(1);
    });
  });

  it('should_round_trip_both_shapes_when_progress_is_saved', async () => {
    // Arrange
    await createRequiredIndex();
    const scored = Progress.forScore(player, lines, Count.of(120), date);
    const leveled = Progress.forLevels(
      player,
      fit,
      [level('fit-001', true, 3, 120)],
      date,
    );

    // Act
    const savedScore = await repository.saveBest(scored);
    const savedLevels = await repository.saveBest(leveled);
    const reloadedScore = await repository.find(player, lines);
    const reloadedLevels = await repository.find(player, fit);

    // Assert
    expect(savedScore).toEqual(scored);
    expect(savedLevels).toEqual(leveled);
    expect(reloadedScore.get()).toEqual(scored);
    expect(reloadedLevels.get()).toEqual(leveled);
    expect(await collection.countDocuments({ userId: player.toString() })).toBe(
      2,
    );
  });

  it('should_isolate_progress_when_the_player_or_game_differs', async () => {
    // Arrange
    await createRequiredIndex();
    await repository.saveBest(Progress.forLevels(player, fit, [], date));
    await repository.saveBest(
      Progress.forScore(player, lines, Count.of(20), date),
    );
    await repository.saveBest(
      Progress.forScore(other, lines, Count.of(5), date),
    );

    // Act
    const missingGame = await repository.find(other, fit);
    const samePlayer = await repository.listForUser(player);
    const otherPlayer = await repository.listForUser(other);

    // Assert
    expect(missingGame.isPresent()).toBe(false);
    expect(
      samePlayer.map((progress) => progress.gameId.toString()).sort(),
    ).toEqual(['hexa-fit', 'hexa-lines']);
    expect(
      otherPlayer.map((progress) => progress.bestScore.get().toNumber()),
    ).toEqual([5]);
    expect(await collection.countDocuments()).toBe(3);
  });

  it.each([
    { name: 'first_inserts_overlap', existing: false },
    { name: 'updates_overlap', existing: true },
  ])('should_preserve_all_improvements_when_$name', async ({ existing }) => {
    // Arrange
    await createRequiredIndex();
    if (existing) {
      await repository.saveBest(Progress.forLevels(player, fit, [], date));
    }
    const read = collection.findOne.bind(collection);
    let release: () => void = () => {
      throw new Error('Read barrier unavailable');
    };
    const gate = new Promise<void>((done) => {
      release = done;
    });
    let originalReads = 0;
    const spy = vi
      .spyOn(collection, 'findOne')
      .mockImplementation(async (filter, options) => {
        const snapshot = await read(filter, options);
        if (originalReads < 2) {
          originalReads += 1;
          if (originalReads === 2) release();
          await gate;
        }
        return snapshot;
      });
    const left = Progress.forLevels(
      player,
      fit,
      [level('fit-001', true, 1, 120), level('fit-002', false, 0, 10)],
      date,
    );
    const right = Progress.forLevels(
      player,
      fit,
      [level('fit-001', false, 3, 80), level('fit-003', true, 2, 80)],
      date,
    );

    // Act
    try {
      await Promise.all([
        repository.saveBest(left),
        repository.saveBest(right),
      ]);
    } finally {
      release();
      spy.mockRestore();
    }

    // Assert
    const values = (await repository.find(player, fit)).get().levels;
    expect(values).toHaveLength(3);
    expect(values).toEqual(
      expect.arrayContaining([
        level('fit-001', true, 3, 120),
        level('fit-002', false, 0, 10),
        level('fit-003', true, 2, 80),
      ]),
    );
    expect(await collection.countDocuments()).toBe(1);
  });

  it.each([
    { name: 'missing', options: { unique: true }, provision: false },
    { name: 'non_unique', options: { unique: false }, provision: true },
    {
      name: 'hidden',
      options: { unique: true, hidden: true },
      provision: true,
    },
    {
      name: 'sparse',
      options: { unique: true, sparse: true },
      provision: true,
    },
    {
      name: 'partial',
      options: {
        unique: true,
        partialFilterExpression: { userId: player.toString() },
      },
      provision: true,
    },
    {
      name: 'non_binary',
      options: { unique: true, collation: { locale: 'en', strength: 2 } },
      provision: true,
    },
  ])(
    'should_reject_writes_when_the_index_is_$name',
    async ({ options, provision }) => {
      // Arrange
      if (provision)
        await collection.createIndex({ userId: 1, gameId: 1 }, options);
      const incoming = Progress.forScore(player, lines, Count.of(50), date);

      // Act and assert
      expect((await repository.find(player, lines)).isPresent()).toBe(false);
      await expect(repository.saveBest(incoming)).rejects.toThrow();
      expect(await collection.countDocuments()).toBe(0);
      expect(
        await database.listCollections({ name: 'progress' }).hasNext(),
      ).toBe(provision);
    },
  );

  it('should_reject_writes_when_the_unique_index_is_building', async () => {
    // Arrange
    const server = await MongoMemoryServer.create({
      instance: { args: ['--setParameter', 'enableTestCommands=1'] },
    });
    const probe = new mongo.MongoClient(server.getUri(), {
      serverSelectionTimeoutMS: 5000,
    });
    try {
      await probe.connect();
      const db = probe.db('uc008-index-build');
      const progress = db.collection<ProgressDocument>('progress');
      const admin = db.admin();
      await progress.insertOne({
        userId: other.toString(),
        gameId: lines.toString(),
        bestScore: 4,
        levels: [],
        updatedAt: date,
        revision: 0,
      });
      const failpoint = 'hangBeforeRunningIndexBuild';
      const state = await admin.command({
        configureFailPoint: failpoint,
        mode: 'alwaysOn',
      });
      const build = progress
        .createIndex({ userId: 1, gameId: 1 }, { unique: true })
        .then(
          () => true,
          () => false,
        );
      try {
        await admin.command({
          waitForFailPoint: failpoint,
          timesEntered: Number(state.count) + 1,
          maxTimeMS: 4000,
        });
        const inProgress = await progress.listIndexes().toArray();
        expect(inProgress).toContainEqual(
          expect.objectContaining({
            name: 'userId_1_gameId_1',
            unique: true,
          }),
        );
        const insert = vi.spyOn(progress, 'insertOne');
        const replace = vi.spyOn(progress, 'replaceOne');
        const store = new MongoProgressRepository(progress, {
          now: () => date,
        });

        // Act and assert
        const incoming = Progress.forScore(player, lines, Count.of(12), date);
        const result = await Promise.allSettled([store.saveBest(incoming)]);
        expect(result[0].status).toBe('rejected');
        expect(insert).not.toHaveBeenCalled();
        expect(replace).not.toHaveBeenCalled();
        expect(await progress.countDocuments()).toBe(1);
      } finally {
        await admin.command({ configureFailPoint: failpoint, mode: 'off' });
        expect(await build).toBe(true);
      }
    } finally {
      try {
        await probe.close();
      } finally {
        await server.stop();
      }
    }
  }, 15_000);

  it('should_not_retry_when_the_write_outcome_is_uncertain', async () => {
    // Arrange
    await createRequiredIndex();
    await repository.saveBest(
      Progress.forScore(player, lines, Count.of(3), date),
    );
    const replace = collection.replaceOne.bind(collection);
    const failure = new Error('Acknowledgement was lost');
    const writes = vi
      .spyOn(collection, 'replaceOne')
      .mockImplementationOnce(async (...args) => {
        await replace(...args);
        throw failure;
      });

    // Act and assert
    const incoming = Progress.forScore(player, lines, Count.of(8), date);
    await expect(repository.saveBest(incoming)).rejects.toBe(failure);
    expect(writes).toHaveBeenCalledTimes(1);
    expect(
      (await repository.find(player, lines)).get().bestScore.get().toNumber(),
    ).toBe(8);
  });
});
