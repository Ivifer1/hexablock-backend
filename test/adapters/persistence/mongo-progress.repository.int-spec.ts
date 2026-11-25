import { randomUUID } from 'node:crypto';
import { mongo } from 'mongoose';
import { inject } from 'vitest';
import { MongoProgressRepository } from '../../../src/adapters/persistence/mongo/mongo-progress.repository.js';
import type { ProgressDocument } from '../../../src/adapters/persistence/mongo/progress.schema.js';
import { GameId } from '../../../src/domain/game/game-id.js';
import { LevelId } from '../../../src/domain/level/level-id.js';
import { LevelProgress } from '../../../src/domain/progress/level-progress.js';
import { Progress } from '../../../src/domain/progress/progress.js';
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
    repository = new MongoProgressRepository(collection);
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
});
