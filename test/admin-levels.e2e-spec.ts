import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { Connection } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import fit from '../docs/specs/levels/hexa-fit.example.json' with { type: 'json' };
import sort from '../docs/specs/levels/hexa-sort.example.json' with { type: 'json' };
import type { LevelDocument } from '../src/adapters/persistence/mongo/level.schema.js';
import type { UserDocument } from '../src/adapters/persistence/mongo/user.schema.js';
import { AppModule } from '../src/infrastructure/app.module.js';
import { configureApp } from '../src/infrastructure/http/configure-app.js';

const path = '/api/v1/levels';
const index = 'uc005-test-order';
const keys = { gameId: 1, order: 1 } as const;
const credentials = { username: 'level_admin', password: 'correct-horse' };
const timestamp = expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/);

function errorBody(
  statusCode: number,
  error: string,
  message: string,
  route: string,
) {
  return { statusCode, error, message, path: route, timestamp };
}

describe('Administrative level writes (e2e, UC-005)', () => {
  let app: INestApplication<App>;
  let connection: Connection;
  let adminToken: string;
  let originalPlayerToken: string;

  const http = () => request(app.getHttpServer());
  const levels = () => connection.collection<LevelDocument>('levels');
  const users = () => connection.collection<UserDocument>('users');
  const snapshot = () => levels().find({}).sort({ _id: 1 }).toArray();
  const setRole = (role: string) =>
    users().updateOne({ username: credentials.username }, { $set: { role } });
  const create = (definition: object, token = adminToken) =>
    http().post(path).auth(token, { type: 'bearer' }).send(definition);
  const replace = (id: string, definition: object) =>
    http()
      .put(`${path}/${id}`)
      .auth(adminToken, { type: 'bearer' })
      .send(definition);
  const remove = (id: string) =>
    http().delete(`${path}/${id}`).auth(adminToken, { type: 'bearer' });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    connection = app.get<Connection>(getConnectionToken());
    await levels().createIndex(keys, { unique: true, name: index });
    const registered = await http()
      .post('/api/v1/auth/register')
      .send(credentials);
    expect(registered.status).toBe(201);
    expect(registered.body.accessToken).toEqual(expect.any(String));
    originalPlayerToken = registered.body.accessToken;
    await setRole('admin');
    const loggedIn = await http().post('/api/v1/auth/login').send(credentials);
    expect(loggedIn.status).toBe(200);
    expect(loggedIn.body.user.role).toBe('admin');
    expect(loggedIn.body.accessToken).toEqual(expect.any(String));
    adminToken = loggedIn.body.accessToken;
  });

  afterEach(async () => {
    await levels().deleteMany({});
    await setRole('admin');
  });

  afterAll(async () => {
    await app.close();
  });

  const writeRoutes = [
    ['post', path],
    ['put', `${path}/${fit.id}`],
    ['delete', `${path}/${fit.id}`],
  ] as const;

  it.each(writeRoutes)(
    'should_return_401_when_write_has_no_valid_token_%s',
    async (method, route) => {
      // Arrange
      const before = await snapshot();

      // Act
      const missing = await http()[method](route).send(fit);
      const invalid = await http()
        [method](route)
        .auth('bad-token', { type: 'bearer' })
        .send(fit);

      // Assert
      expect(missing.status).toBe(401);
      expect(invalid.status).toBe(401);
      const expected = errorBody(
        401,
        'Unauthorized',
        'Authentication required',
        route,
      );
      expect(missing.body).toStrictEqual(expected);
      expect(invalid.body).toStrictEqual(expected);
      expect(await snapshot()).toStrictEqual(before);
    },
  );

  it.each(writeRoutes)(
    'should_return_403_when_stored_role_is_player_despite_admin_token_%s',
    async (method, route) => {
      // Arrange
      const before = await snapshot();
      await setRole('player');

      // Act
      const response = await http()
        [method](route)
        .auth(adminToken, { type: 'bearer' })
        .send(fit);

      // Assert
      expect(response.status).toBe(403);
      expect(response.body).toStrictEqual(
        errorBody(403, 'Forbidden', 'Administrator role required', route),
      );
      expect(await snapshot()).toStrictEqual(before);
    },
  );

  it('should_return_401_when_token_account_was_deleted', async () => {
    // Arrange
    const before = await snapshot();
    const account = await users().findOne({ username: credentials.username });
    if (!account) throw new Error('Missing test account');
    await users().deleteOne({ _id: account._id });

    try {
      // Act
      const response = await create(fit);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toStrictEqual(
        errorBody(401, 'Unauthorized', 'Authentication required', path),
      );
      expect(await snapshot()).toStrictEqual(before);
    } finally {
      await users().insertOne(account);
    }
  });

  it('should_create_public_fit_json_when_player_token_now_has_stored_admin_role', async () => {
    // Arrange: the token predates promotion; the stored role is admin.

    // Act
    const created = await create(fit, originalPlayerToken);
    const seen = await http().get(`${path}/${fit.id}`);

    // Assert
    expect(created.status).toBe(201);
    expect(created.body).toStrictEqual(fit);
    expect(seen.status).toBe(200);
    expect(seen.body).toStrictEqual(fit);
    expect(await snapshot()).toHaveLength(1);
  });

  it('should_replace_full_sort_definition_and_remove_it_when_admin', async () => {
    // Arrange
    const old = { ...sort, sort: { ...sort.sort, seed: 0 } };
    const next = {
      ...sort,
      name: { ...sort.name, en: 'Updated title' },
      sort: {
        goal: sort.sort.goal,
        colors: sort.sort.colors,
        stackHeight: sort.sort.stackHeight,
      },
    };
    expect((await create(old)).status).toBe(201);

    // Act
    const replaced = await replace(sort.id, next);
    const stored = await http().get(`${path}/${sort.id}`);
    const removed = await remove(sort.id);

    // Assert
    expect(replaced.status).toBe(200);
    expect(replaced.body).toStrictEqual(next);
    expect(stored.body).toStrictEqual(next);
    expect(removed.status).toBe(204);
    expect(removed.text).toBe('');
    expect(await snapshot()).toStrictEqual([]);
  });
});
