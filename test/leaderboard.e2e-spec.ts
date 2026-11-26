import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import fit from '../docs/specs/levels/hexa-fit.example.json' with { type: 'json' };
import { AppModule } from '../src/infrastructure/app.module.js';
import { configureApp } from '../src/infrastructure/http/configure-app.js';

describe('UC-011 authenticated leaderboard (e2e)', () => {
  let app: INestApplication<App>;
  let db: Connection;
  let token: string;
  const at = new Date('2026-11-26T12:00:00Z');
  const http = () => request(app.getHttpServer());
  const read = (game = 'hexa-lines', query = '') =>
    http()
      .get(`/api/v1/leaderboard/${game}${query}`)
      .auth(token, { type: 'bearer' });
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get<Connection>(getConnectionToken());
    const response = await http()
      .post('/api/v1/auth/register')
      .send({ username: 'ranking_reader', password: 'correct-horse' });
    token = (response.body as { accessToken: string }).accessToken;
    const { id, fit: payload, ...common } = fit;
    await db.collection('levels').insertOne({
      _id: id,
      ...common,
      section: { key: 'fit', payload },
    } as never);
    await db.collection('users').insertMany(
      Array.from({ length: 101 }, (_, index) => ({
        _id: `rank-${index}`,
        username: `rank_user_${index}`,
        role: 'user',
        passwordHash: 'private',
      })) as never[],
    );
  });
  afterEach(async () => {
    await db.collection('personal_bests').deleteMany({});
  });
  afterAll(async () => {
    await app.close();
  });
  it.each(['hexa-lines', 'hexa-fit'])(
    'should_require_authentication_when_reading_%s',
    async (game) => {
      // Arrange
      const path = `/api/v1/leaderboard/${game}`;
      const expired = app
        .get(JwtService)
        .sign({ sub: 'expired' }, { expiresIn: -1 });
      // Act
      const responses = await Promise.all([
        http().get(path),
        http().get(path).auth('invalid', { type: 'bearer' }),
        http().get(path).auth(expired, { type: 'bearer' }),
      ]);
      // Assert
      expect(responses.map((response) => response.status)).toEqual([
        401, 401, 401,
      ]);
    },
  );
  it('should_return_empty_entries_when_a_valid_ranking_has_no_scores', async () => {
    // Arrange / Act
    const response = await read();
    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ gameId: 'hexa-lines', entries: [] });
  });
  it('should_share_ranks_and_expose_public_fields_when_scores_and_times_tie', async () => {
    // Arrange
    await db.collection('personal_bests').insertMany(
      [0, 1, 2].map((index) => ({
        gameId: 'hexa-lines',
        levelId: null,
        userId: `rank-${index}`,
        score: index < 2 ? 120 : 90,
        achievedAt: at,
      })),
    );
    // Act
    const response = await read();
    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      gameId: 'hexa-lines',
      entries: [0, 1, 2].map((index) => ({
        rank: index < 2 ? 1 : 3,
        username: `rank_user_${index}`,
        score: index < 2 ? 120 : 90,
        achievedAt: at.toISOString(),
      })),
    });
  });
  it.each([
    ['', 10],
    ['?limit=1', 1],
    ['?limit=100', 100],
    ['?limit=01', 1],
  ] as const)('should_apply_limit_when_query_is_%s', async (query, limit) => {
    // Arrange
    await db.collection('personal_bests').insertMany(
      Array.from({ length: 101 }, (_, index) => ({
        gameId: 'hexa-lines',
        levelId: null,
        userId: `rank-${index}`,
        score: index,
        achievedAt: at,
      })),
    );
    // Act
    const response = await read('hexa-lines', query);
    // Assert
    expect(response.status).toBe(200);
    expect(
      (response.body as { entries: { score: number }[] }).entries.map(
        (entry) => entry.score,
      ),
    ).toEqual(Array.from({ length: limit }, (_, index) => 100 - index));
  });
  it.each([
    '?limit=0',
    '?limit=101',
    '?limit=1.5',
    '?limit=1e2',
    '?limit=',
    '?limit=%20',
    '?limit=%2B1',
    '?limit=1&limit=2',
    '?other=1',
    '?levelId=',
    '?levelId=a&levelId=b',
    '?levelId=fit-003',
  ])(
    'should_reject_closed_query_violations_when_query_is_%s',
    async (query) => {
      // Arrange / Act
      const response = await read('hexa-lines', query);
      // Assert
      expect(response.status).toBe(400);
      expect(await db.collection('personal_bests').countDocuments()).toBe(0);
    },
  );
  it('should_validate_level_membership_when_reading_a_level_scope', async () => {
    // Arrange
    await db.collection('personal_bests').insertMany(
      [fit.id, 'fit-other'].map((levelId) => ({
        gameId: fit.gameId,
        levelId,
        userId: 'rank-0',
        score: 70,
        achievedAt: at,
      })),
    );
    // Act
    const response = await read(fit.gameId, `?levelId=${fit.id}`);
    const missing = await read(fit.gameId);
    const unknown = await read(fit.gameId, '?levelId=missing');
    const foreign = await read('hexa-sort', `?levelId=${fit.id}`);
    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      gameId: fit.gameId,
      levelId: fit.id,
      entries: [
        {
          rank: 1,
          username: 'rank_user_0',
          score: 70,
          achievedAt: at.toISOString(),
        },
      ],
    });
    expect([missing.status, unknown.status, foreign.status]).toEqual([
      400, 400, 400,
    ]);
  });
  it('should_validate_syntax_before_scope_when_inputs_are_invalid', async () => {
    // Arrange / Act
    const responses = await Promise.all([
      read('INVALID'),
      read('unknown'),
      read('unknown', '?limit=bad'),
    ]);
    // Assert
    expect(responses.map((response) => response.status)).toEqual([
      400, 404, 400,
    ]);
  });
  it('should_fail_without_partial_data_when_a_selected_user_is_missing', async () => {
    // Arrange
    await db.collection('personal_bests').insertOne({
      gameId: 'hexa-lines',
      levelId: null,
      userId: 'missing',
      score: 99,
      achievedAt: at,
    });
    // Act
    const response = await read();
    // Assert
    expect(response.status).toBe(500);
    expect(response.body).not.toHaveProperty('entries');
    expect(await db.collection('personal_bests').countDocuments()).toBe(1);
  });
});
