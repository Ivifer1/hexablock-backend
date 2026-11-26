import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { Connection } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/infrastructure/app.module.js';
import { configureApp } from '../src/infrastructure/http/configure-app.js';

const path = '/api/v1/scores';
const username = 'score_player';
const attempt = { gameId: 'hexa-lines', score: 10 };

function errorBody(statusCode: number, error: string, message: string) {
  return {
    statusCode,
    error,
    message,
    path,
    timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
  };
}

describe('POST /api/v1/scores (e2e, UC-010)', () => {
  let app: INestApplication<App>;
  let connection: Connection;
  let accessToken: string;
  let expiredToken: string;

  const http = () => request(app.getHttpServer());

  function submit(body: object, token?: string) {
    const call = http().post(path).send(body);
    return token === undefined ? call : call.auth(token, { type: 'bearer' });
  }

  async function snapshot() {
    const names = (await connection.listCollections()).map(({ name }) => name);
    return Promise.all(
      names.sort().map(async (name) => ({
        name,
        records: await connection
          .collection(name)
          .find({})
          .sort({ _id: 1 })
          .toArray(),
      })),
    );
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    connection = app.get<Connection>(getConnectionToken());
    const registered = await http()
      .post('/api/v1/auth/register')
      .send({ username, password: 'correct-horse' });
    expect(registered.status).toBe(201);
    const body = registered.body as {
      accessToken: string;
      user: { id: string };
    };
    expect(body.accessToken).toEqual(expect.any(String));
    accessToken = body.accessToken;
    expiredToken = await app.get(JwtService).signAsync({
      sub: body.user.id,
      username,
      role: 'player',
      exp: Math.floor(Date.now() / 1000) - 10,
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each(['missing', 'invalid', 'expired'] as const)(
    'should_return_401_when_the_session_is_%s',
    async (session) => {
      // Arrange
      const before = await snapshot();
      const tokens = {
        missing: undefined,
        invalid: 'not-a-token',
        expired: expiredToken,
      };

      // Act
      const response = await submit(attempt, tokens[session]);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toStrictEqual(
        errorBody(401, 'Unauthorized', 'Authentication required'),
      );
      expect(await snapshot()).toStrictEqual(before);
    },
  );

  it.each([
    { name: 'a_string', value: '10' },
    { name: 'null', value: null },
    { name: 'negative', value: -1 },
    { name: 'fractional', value: 1.5 },
    { name: 'above_the_safe_limit', value: Number.MAX_SAFE_INTEGER + 1 },
  ])('should_return_400_when_the_score_is_$name', async ({ value }) => {
    // Arrange
    const before = await snapshot();

    // Act
    const response = await submit({ ...attempt, score: value }, accessToken);

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      ...errorBody(400, 'Bad Request', 'Invalid request'),
      details: [{ field: 'score', message: expect.stringMatching(/\S/) }],
    });
    expect(await snapshot()).toStrictEqual(before);
  });

  it('should_return_404_when_the_game_is_not_registered', async () => {
    // Arrange
    const before = await snapshot();

    // Act
    const response = await submit(
      { ...attempt, gameId: 'hexa-unknown' },
      accessToken,
    );

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toStrictEqual(
      errorBody(404, 'Not Found', 'Game not found'),
    );
    expect(await snapshot()).toStrictEqual(before);
  });
});
