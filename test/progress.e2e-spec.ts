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
import { AppModule } from '../src/infrastructure/app.module.js';
import { configureApp } from '../src/infrastructure/http/configure-app.js';
import { CLOCK } from '../src/infrastructure/tokens.js';

const path = '/api/v1/progress';
const gamePath = (gameId: string) => path + '/' + gameId;
const firstAt = '2026-11-25T09:00:00.000Z';
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
  let other: { id: string; token: string };
  let now = firstAt;

  const http = () => request(app.getHttpServer());
  const records = () => connection.collection(PROGRESS_COLLECTION);
  const get = (route: string, token = player.token) =>
    http().get(route).auth(token, { type: 'bearer' });

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

  it.each(['unknown-game', 'INVALID'])(
    'should_return_not_found_when_game_is_%s',
    async (gameId) => {
      // Arrange
      const route = gamePath(gameId);

      // Act
      const replies = [await get(route)];

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

});
