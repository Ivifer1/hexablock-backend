import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { Connection } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import fit from '../docs/specs/levels/hexa-fit.example.json' with { type: 'json' };
import sort from '../docs/specs/levels/hexa-sort.example.json' with { type: 'json' };
import type { LevelDocument } from '../src/adapters/persistence/mongo/level.schema.js';
import { AppModule } from '../src/infrastructure/app.module.js';
import { configureApp } from '../src/infrastructure/http/configure-app.js';
import { CLOCK } from '../src/infrastructure/tokens.js';

const path = '/api/v1/scores';
const firstAt = new Date('2026-11-26T12:00:00.000Z');
const laterAt = new Date('2026-11-26T12:01:00.000Z');

describe('POST /api/v1/scores success cases (e2e, UC-010)', () => {
  let app: INestApplication<App>;
  let connection: Connection;
  let player: { id: string; token: string };
  let other: { id: string; token: string };
  let now = firstAt;

  const http = () => request(app.getHttpServer());
  const records = () => connection.collection('personal_bests');
  const submit = (body: object | string, token = player.token) =>
    http().post(path).auth(token, { type: 'bearer' }).type('json').send(body);

  async function register(username: string) {
    const response = await http()
      .post('/api/v1/auth/register')
      .send({ username, password: 'correct-horse' });
    expect(response.status).toBe(201);
    const body = response.body as { user: { id: string }; accessToken: string };
    return { id: body.user.id, token: body.accessToken };
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CLOCK)
      .useValue({ now: () => new Date(now) })
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    connection = app.get<Connection>(getConnectionToken());
    await records().createIndex(
      { gameId: 1, levelId: 1, userId: 1 },
      { unique: true, collation: { locale: 'simple' } },
    );
    const { id: fitId, fit: fitPayload, ...fitCommon } = fit;
    const { id: sortId, sort: sortPayload, ...sortCommon } = sort;
    const fitDocument = {
      _id: fitId,
      ...fitCommon,
      section: { key: 'fit', payload: fitPayload },
    };
    await connection.collection<LevelDocument>('levels').insertMany([
      fitDocument,
      {
        _id: 'fit-004',
        ...fitCommon,
        order: fit.order + 1,
        section: { key: 'fit', payload: fitPayload },
      },
      {
        _id: sortId,
        ...sortCommon,
        section: { key: 'sort', payload: sortPayload },
      },
    ]);
    player = await register('score_success_player');
    other = await register('score_success_other');
  });

  beforeEach(() => {
    now = firstAt;
  });

  afterEach(async () => {
    await records().deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  it('should_create_a_zero_personal_best_for_a_game_ranking', async () => {
    // Arrange
    const body = { gameId: 'hexa-lines', score: 0 };

    // Act
    const response = await submit(body);
    const stored = await records().findOne({
      gameId: body.gameId,
      userId: player.id,
    });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body).toStrictEqual({
      gameId: body.gameId,
      score: 0,
      personalBest: true,
    });
    expect(stored).toMatchObject({
      gameId: body.gameId,
      levelId: null,
      userId: player.id,
      score: 0,
      achievedAt: firstAt,
    });
  });

  it('should_keep_the_retained_best_and_date_when_a_score_ties_or_is_lower', async () => {
    // Arrange
    await submit({ gameId: 'hexa-lines', score: 120 });
    const initial = await records().findOne({ gameId: 'hexa-lines' });
    now = laterAt;

    // Act
    const tied = await submit({ gameId: 'hexa-lines', score: 120 });
    const lower = await submit({ gameId: 'hexa-lines', score: 80 });
    const stored = await records().findOne({ gameId: 'hexa-lines' });

    // Assert
    expect(tied.status).toBe(201);
    expect(lower.status).toBe(201);
    expect(tied.body).toMatchObject({ score: 120, personalBest: false });
    expect(lower.body).toMatchObject({ score: 120, personalBest: false });
    expect(stored).toStrictEqual(initial);
  });

  it('should_improve_a_personal_best_for_a_level_belonging_to_the_game', async () => {
    // Arrange
    const body = { gameId: fit.gameId, levelId: fit.id, score: 80 };
    const first = await submit(body);
    now = laterAt;

    // Act
    const improved = await submit({ ...body, score: 120 });
    const stored = await records().findOne({
      gameId: fit.gameId,
      levelId: fit.id,
      userId: player.id,
    });

    // Assert
    expect(first.status).toBe(201);
    expect(first.body).toStrictEqual({
      gameId: fit.gameId,
      levelId: fit.id,
      score: 80,
      personalBest: true,
    });
    expect(improved.status).toBe(201);
    expect(improved.body).toStrictEqual({
      gameId: fit.gameId,
      levelId: fit.id,
      score: 120,
      personalBest: true,
    });
    expect(stored).toMatchObject({
      userId: player.id,
      score: 120,
      achievedAt: laterAt,
    });
  });

  it('should_isolate_game_rankings_by_authenticated_player', async () => {
    // Arrange
    const first = await submit({ gameId: 'hexa-lines', score: 60 });

    // Act
    const second = await submit(
      { gameId: 'hexa-lines', score: 30 },
      other.token,
    );
    const stored = await records()
      .find({ gameId: 'hexa-lines' })
      .sort({ userId: 1 })
      .toArray();

    // Assert
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(stored).toHaveLength(2);
    expect(stored.map(({ userId }) => userId)).toEqual(
      expect.arrayContaining([player.id, other.id]),
    );
    expect(stored.map(({ score }) => score).sort((left, right) => left - right)).toEqual([30, 60]);
  });

  it('should_reject_a_client_supplied_player_id_without_writing', async () => {
    // Arrange
    const before = await records().find({}).toArray();

    // Act
    const response = await submit({
      gameId: 'hexa-lines',
      score: 200,
      userId: other.id,
    });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ statusCode: 400 });
    expect(await records().find({}).toArray()).toStrictEqual(before);
  });

  it.each([
    ['missing', { gameId: fit.gameId, score: 10 }],
    ['unknown', { gameId: fit.gameId, levelId: 'fit-missing', score: 10 }],
    ['foreign', { gameId: fit.gameId, levelId: sort.id, score: 10 }],
    ['null', { gameId: fit.gameId, levelId: null, score: 10 }],
    ['unexpected on a game ranking', { gameId: 'hexa-lines', levelId: fit.id, score: 10 }],
  ])('should_reject_a_%s_level_without_writing', async (_case, body) => {
    // Arrange
    const before = await records().find({}).toArray();

    // Act
    const response = await submit(body);

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ statusCode: 400 });
    expect(await records().find({}).toArray()).toStrictEqual(before);
  });

  it('should_accept_an_exact_integral_score_when_json_uses_exponent_notation', async () => {
    // Arrange
    const body = '{"gameId":"hexa-lines","score":1.25e2}';

    // Act
    const response = await submit(body);

    // Assert
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      gameId: 'hexa-lines',
      score: 125,
      personalBest: true,
    });
  });

  it('should_reject_a_rounded_raw_score_without_writing', async () => {
    // Arrange
    const before = await records().find({}).toArray();
    const body = '{"gameId":"hexa-lines","score":9007199254740991.1}';

    // Act
    const response = await submit(body);

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ statusCode: 400 });
    expect(await records().find({}).toArray()).toStrictEqual(before);
  });
});
