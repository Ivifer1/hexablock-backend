import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { Connection } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import fit from '../docs/specs/levels/hexa-fit.example.json' with { type: 'json' };
import {
  PROGRESS_COLLECTION,
  PROGRESS_KEY,
} from '../src/adapters/persistence/mongo/progress.schema.js';
import type { IProgressRepository } from '../src/application/ports/progress-repository.js';
import { AppModule } from '../src/infrastructure/app.module.js';
import { configureApp } from '../src/infrastructure/http/configure-app.js';
import { PROGRESS_REPOSITORY } from '../src/infrastructure/progress/progress.module.js';
import { CLOCK } from '../src/infrastructure/tokens.js';

const path = '/api/v1/progress';
const gamePath = (gameId: string) => path + '/' + gameId;
const firstAt = '2026-11-25T09:00:00.000Z';
const laterAt = '2026-11-25T09:01:00.000Z';
const score = (bestScore: number) => ({ bestScore, levels: {} });
const level = (completed: boolean, stars: number, bestScore: number) => ({
  completed,
  stars,
  bestScore,
});
const levels = (entries: Record<string, ReturnType<typeof level>> = {}) => ({
  bestScore: null,
  levels: entries,
});
const progress = (
  gameId: string,
  snapshot: object,
  updatedAt: string | null,
) => ({ gameId, ...snapshot, updatedAt });

describe('Player progress (e2e, UC-009)', () => {
  let app: INestApplication<App>;
  let connection: Connection;
  let player: { id: string; token: string };
  let now = firstAt;

  const http = () => request(app.getHttpServer());
  const records = () => connection.collection(PROGRESS_COLLECTION);
  const get = (route: string, token = player.token) =>
    http().get(route).auth(token, { type: 'bearer' });
  const put = (gameId: string, body: object | string, token = player.token) =>
    http()
      .put(gamePath(gameId))
      .auth(token, { type: 'bearer' })
      .type('json')
      .send(body);

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
    await records().createIndex(PROGRESS_KEY, { unique: true });
    player = await register('progress_alpha');
  });

  beforeEach(() => {
    now = firstAt;
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await records().deleteMany({});
  });
  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['get', path],
    ['get', gamePath(fit.gameId)],
    ['put', gamePath(fit.gameId)],
  ] as const)(
    'should_reject_invalid_sessions_when_calling_%s_%s',
    async (method, route) => {
      // Arrange
      const expired = await app.get(JwtService).signAsync({
        sub: player.id,
        username: 'progress_alpha',
        role: 'player',
        exp: Math.floor(Date.now() / 1000) - 10,
      });

      // Act
      const replies = await Promise.all(
        [undefined, 'not-a-token', expired].map((token) => {
          const call = http()[method](route);
          if (method === 'put')
            call.send(levels({ [fit.id]: level(true, 3, 150) }));
          return token ? call.auth(token, { type: 'bearer' }) : call;
        }),
      );

      // Assert
      expect(replies.map(({ status }) => status)).toEqual([401, 401, 401]);
      for (const reply of replies)
        expect(reply.body).toMatchObject({
          statusCode: 401,
          message: 'Authentication required',
          path: route,
        });
      expect(await records().countDocuments()).toBe(0);
    },
  );

  it('should_return_empty_defaults_without_writing_when_no_progress_is_saved', async () => {
    // Arrange: neither player has a saved record.

    // Act
    const replies = await Promise.all([
      get(path),
      get(gamePath('hexa-lines')),
      get(gamePath(fit.gameId)),
    ]);

    // Assert
    expect(replies.map(({ status }) => status)).toEqual([200, 200, 200]);
    expect(replies.map(({ body }) => body)).toEqual([
      { items: [] },
      progress('hexa-lines', score(0), null),
      progress(fit.gameId, levels(), null),
    ]);
    expect(await records().countDocuments()).toBe(0);
  });

  it('should_preserve_best_score_and_date_when_a_score_game_replays', async () => {
    // Arrange
    const initial = await put('hexa-merge', score(90));
    now = laterAt;

    // Act
    const unchanged = await put('hexa-merge', score(90));
    const worse = await put('hexa-merge', score(10));
    const improved = await put('hexa-merge', score(110));
    const stored = await get(gamePath('hexa-merge'));

    // Assert
    expect(
      [initial, unchanged, worse, improved, stored].map(({ status }) => status),
    ).toEqual([200, 200, 200, 200, 200]);
    expect([initial, unchanged, worse].map(({ body }) => body)).toEqual(
      Array(3).fill(progress('hexa-merge', score(90), firstAt)),
    );
    expect(improved.body).toEqual(progress('hexa-merge', score(110), laterAt));
    expect(stored.body).toEqual(improved.body);
  });

  it.each(['unknown-game', 'INVALID'])(
    'should_return_not_found_when_game_is_%s',
    async (gameId) => {
      // Arrange
      const route = gamePath(gameId);

      // Act
      const replies = [await get(route), await put(gameId, score(80))];

      // Assert
      for (const reply of replies)
        expect(reply.body).toMatchObject({
          statusCode: 404,
          message: 'Game not found',
          path: route,
        });
      expect(await records().countDocuments()).toBe(0);
    },
  );

  it.each([
    ['negative score', 'hexa-lines', score(-1)],
    ['fractional score', 'hexa-lines', score(1.5)],
    [
      'unsafe score',
      'hexa-lines',
      '{"bestScore":9007199254740993,"levels":{}}',
    ],
    ['string score', 'hexa-lines', { ...score(1), bestScore: '1' }],
    ['null score', 'hexa-lines', levels()],
    [
      'levels in a score game',
      'hexa-lines',
      { ...score(1), levels: { [fit.id]: level(true, 1, 10) } },
    ],
    ['foreign user', 'hexa-lines', { ...score(200), userId: 'someone-else' }],
    ['injected game', 'hexa-lines', { ...score(200), gameId: fit.gameId }],
    ['injected date', 'hexa-lines', { ...score(200), updatedAt: firstAt }],
  ] as const)(
    'should_reject_invalid_snapshot_without_writing_when_case_is_%s',
    async (_name, gameId, body) => {
      // Arrange
      const saved = await put('hexa-lines', score(10));
      const before = await records().find({}).toArray();

      // Act
      const reply = await put(gameId, body);

      // Assert
      expect(saved.status).toBe(200);
      expect(reply.status).toBe(400);
      expect(reply.body).toMatchObject({
        statusCode: 400,
        message: 'Invalid request',
        details: expect.any(Array),
      });
      expect(reply.body.details).not.toHaveLength(0);
      expect(await records().find({}).toArray()).toEqual(before);
    },
  );

  it('should_reject_missing_fields_without_mutation_when_syncing_progress', async () => {
    // Arrange
    expect((await put('hexa-lines', score(10))).status).toBe(200);
    const before = await records().find({}).toArray();

    // Act
    const replies = [
      await put('hexa-lines', { levels: {} }),
      await put('hexa-lines', { bestScore: 20 }),
    ];

    // Assert
    expect(replies.map(({ status }) => status)).toEqual([400, 400]);
    expect(await records().find({}).toArray()).toEqual(before);
  });

  it('should_not_report_success_when_save_acknowledgement_is_uncertain', async () => {
    // Arrange
    const repository = app.get<IProgressRepository>(PROGRESS_REPOSITORY);
    const save = repository.saveBest.bind(repository);
    vi.spyOn(repository, 'saveBest').mockImplementationOnce(
      async (snapshot) => {
        await save(snapshot);
        throw new Error('Simulated lost acknowledgement');
      },
    );

    // Act
    const reply = await put('hexa-lines', score(80));
    const stored = await get(gamePath('hexa-lines'));

    // Assert
    expect(reply.status).toBe(500);
    expect(reply.body).toMatchObject({
      statusCode: 500,
      message: 'Internal server error',
    });
    expect(stored.body).toEqual(progress('hexa-lines', score(80), firstAt));
  });
});
