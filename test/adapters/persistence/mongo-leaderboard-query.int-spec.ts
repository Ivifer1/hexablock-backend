import { randomUUID } from 'node:crypto';
import { mongo } from 'mongoose';
import { inject } from 'vitest';
import { MongoLeaderboardQuery } from '../../../src/adapters/persistence/mongo/mongo-leaderboard-query.js';
import { GameId } from '../../../src/domain/game/game-id.js';
import { LevelId } from '../../../src/domain/level/level-id.js';
import { RankingScope } from '../../../src/domain/score/ranking-scope.js';
import { Count } from '../../../src/domain/shared/count.js';

const at = new Date('2026-11-26T12:00:00Z');
const game = GameId.of('hexa-lines');
const scope = RankingScope.forGame(game);
const orderedKey = { gameId: 1, levelId: 1, score: -1, achievedAt: 1, userId: 1 } as const;

describe('UC-011 MongoLeaderboardQuery', () => {
  let client: mongo.MongoClient;
  let db: mongo.Db;
  let query: MongoLeaderboardQuery;
  beforeEach(async () => {
    client = await new mongo.MongoClient(inject('mongoUri')).connect();
    db = client.db('uc011-' + randomUUID());
    query = new MongoLeaderboardQuery(db);
  });
  afterEach(async () => { try { await db.dropDatabase(); } finally { await client.close(); } });

  async function seed() {
    await db.collection('users').insertMany([
      { _id: 'a', username: 'alice', passwordHash: 'private', role: 'admin' },
      { _id: 'b', username: 'bruno', passwordHash: 'private', role: 'user' },
      { _id: 'c', username: 'carol', passwordHash: 'private', role: 'user' },
    ] as never[]);
    await db.collection('personal_bests').insertMany([
      { gameId: 'hexa-lines', levelId: null, userId: 'b', score: 120, achievedAt: at },
      { gameId: 'hexa-lines', levelId: null, userId: 'a', score: 120, achievedAt: at },
      { gameId: 'hexa-lines', levelId: null, userId: 'c', score: 120, achievedAt: new Date(at.getTime() + 1000) },
      { gameId: 'hexa-merge', levelId: null, userId: 'a', score: 999, achievedAt: at },
      { gameId: 'hexa-lines', levelId: 'level-1', userId: 'a', score: 70, achievedAt: at },
      { gameId: 'hexa-lines', levelId: 'level-2', userId: 'a', score: 900, achievedAt: at },
      { gameId: 'hexa-lines', userId: 'a', score: 1000, achievedAt: at },
    ]);
  }

  it('should_project_only_public_values_when_reading_a_bounded_ordered_scope', async () => {
    // Arrange
    await seed();
    const before = await db.collection('personal_bests').find().toArray();
    // Act
    const result = await query.read(scope, Count.of(2));
    const level = await query.read(RankingScope.forLevel(game, LevelId.of('level-1')), Count.of(10));
    // Assert
    expect(result.map(entry => entry.username.toString())).toEqual(['alice', 'bruno']);
    expect(result.map(entry => entry.score.toNumber())).toEqual([120, 120]);
    expect(Object.keys(result[0]!).sort((a, b) => a.localeCompare(b))).toEqual(['achievedAt', 'score', 'username']);
    expect(level.map(entry => entry.score.toNumber())).toEqual([70]);
    expect(await db.collection('personal_bests').find().toArray()).toEqual(before);
  });
  it('should_resolve_users_only_when_their_scores_are_selected', async () => {
    // Arrange
    await seed();
    await db.collection('users').deleteOne({ _id: 'c' } as never);
    // Act
    const prefix = await query.read(scope, Count.of(2));
    const all = query.read(scope, Count.of(10));
    // Assert
    expect(prefix).toHaveLength(2);
    await expect(all).rejects.toThrow();
  });
  it('should_reject_corruption_when_a_selected_record_is_invalid', async () => {
    // Arrange
    await seed();
    await db.collection('personal_bests').updateOne({ userId: 'a', levelId: null, gameId: 'hexa-lines' }, { $set: { score: 1.5 } });
    // Act
    const result = query.read(scope, Count.of(100));
    // Assert
    await expect(result).rejects.toThrow();
  });
  it('should_preserve_empty_state_when_no_ranking_exists', async () => {
    // Arrange
    const before = await db.listCollections().toArray();
    // Act
    const result = await query.read(scope, Count.of(10));
    // Assert
    expect(result).toEqual([]);
    expect(await db.listCollections().toArray()).toEqual(before);
  });
  it('should_report_storage_failure_when_a_selected_username_is_invalid', async () => {
    // Arrange
    await seed();
    await db.collection('users').updateOne({ _id: 'a' } as never, { $set: { username: '' } });
    // Act
    const result = query.read(scope, Count.of(10));
    // Assert
    await expect(result).rejects.toThrow('Invalid stored leaderboard username');
  });
  it.each([null, 'level-1'])('should_use_ordered_index_when_scope_is_%s', async levelId => {
    // Arrange
    await seed();
    const records = db.collection('personal_bests');
    await records.createIndex(orderedKey, { name: 'leaderboard_order', collation: { locale: 'simple' } });
    // Act
    const plan = await records.find({ gameId: 'hexa-lines', levelId: { $eq: levelId, $exists: true } }).collation({ locale: 'simple' }).sort({ score: -1, achievedAt: 1, userId: 1 }).limit(2).hint('leaderboard_order').explain('executionStats');
    // Assert
    const serialized = JSON.stringify(plan.queryPlanner.winningPlan);
    expect(serialized).toContain('leaderboard_order');
    expect(serialized).not.toMatch(/"stage":"SORT"/);
    expect(plan.executionStats.nReturned).toBeLessThanOrEqual(2);
  });
});
