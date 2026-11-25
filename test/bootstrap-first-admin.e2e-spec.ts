import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { Test } from '@nestjs/testing';
import { mongo } from 'mongoose';
import request from 'supertest';
import { inject } from 'vitest';
import type { UserDocument } from '../src/adapters/persistence/mongo/user.schema.js';
import { AppModule } from '../src/infrastructure/app.module.js';
import { runBootstrapFirstAdmin } from '../src/infrastructure/bootstrap/bootstrap-first-admin.command.js';
import { configureApp } from '../src/infrastructure/http/configure-app.js';

const username = 'first_admin';
const password = '  private passphrase  ';
const reservedId = 'bootstrap:first-admin';
const serverUri = inject('mongoUri').replace(/\/?$/, '/');
const envFor = (uri: string) => ({ MONGODB_URI: uri });

async function bootstrap(
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
  text = `${password}\n`,
  isTTY = false,
) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const input = Object.assign(Readable.from([Buffer.from(text)]), { isTTY });
  const status = await runBootstrapFirstAdmin(args, env, {
    input,
    out: (line) => stdout.push(line),
    err: (line) => stderr.push(line),
  });
  return { status, stdout, stderr, output: [...stdout, ...stderr].join('\n') };
}

function expectRejection(result: Awaited<ReturnType<typeof bootstrap>>) {
  expect(result.status).not.toBe(0);
  expect(result.stderr.join('\n').trim()).not.toBe('');
  expect(result.output).not.toContain(password.trim());
}

describe('First administrator bootstrap (e2e, UC-006)', () => {
  let client: mongo.MongoClient;
  let db: mongo.Db;
  let uri: string;
  let users: mongo.Collection<UserDocument>;

  beforeEach(async () => {
    uri = `${serverUri}e2e-bootstrap-${randomUUID()}`;
    client = await new mongo.MongoClient(uri).connect();
    db = client.db();
    users = db.collection('users');
  });

  afterEach(async () => {
    try {
      await db.dropDatabase();
    } finally {
      await client.close();
    }
  });

  async function snapshot() {
    return {
      users: await users.find().sort({ _id: 1 }).toArray(),
      indexes: await users.indexes(),
    };
  }

  function existingUser(overrides: Partial<UserDocument> = {}): UserDocument {
    return {
      _id: '507f1f77bcf86cd799439011',
      username,
      role: 'player',
      passwordHash: 'original-hash',
      createdAt: new Date('2026-11-21T00:00:00Z'),
      ...overrides,
    };
  }

  it('should_create_one_admin_when_bootstrap_runs_against_an_empty_users_collection', async () => {
    // Arrange
    await users.createIndex({ username: 1 }, { unique: true });
    const indexes = await users.indexes();
    vi.stubEnv('MONGODB_URI', uri);

    // Act
    const result = await bootstrap([username], envFor(uri), `${password}\r\n`);

    // Assert
    expect(result.status).toBe(0);
    expect(result.stdout.join('\n').trim()).not.toBe('');
    expect(result.stderr).toEqual([]);
    const after = await snapshot();
    expect(after).toEqual({
      users: [
        {
          _id: reservedId,
          username,
          role: 'admin',
          passwordHash: expect.stringMatching(/^scrypt\$/),
          createdAt: expect.any(Date),
        },
      ],
      indexes,
    });
    expect(result.output).not.toContain(password.trim());
    expect(result.output).not.toContain(after.users[0].passwordHash);
    expect(result.output).not.toMatch(/eyJ[\w-]+\.[\w-]+\.[\w-]+/);

    try {
      const module = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      const app = module.createNestApplication();
      try {
        configureApp(app);
        await app.init();
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ username, password });
        expect(response.status).toBe(200);
        expect(response.body.user).toEqual({
          id: reservedId,
          username,
          role: 'admin',
        });
      } finally {
        await app.close();
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it.each([
    {
      name: 'an administrator already exists',
      user: existingUser({ role: 'admin' }),
    },
    { name: 'the username belongs to a player', user: existingUser() },
    {
      name: 'the reserved identity is taken',
      user: existingUser({ _id: reservedId, username: 'other_player' }),
    },
  ])('should_leave_the_stored_account_intact_when_$name', async ({ user }) => {
    // Arrange
    await users.createIndex({ username: 1 }, { unique: true });
    await users.insertOne(user);
    const before = await snapshot();

    // Act
    const result = await bootstrap([username], envFor(uri));

    // Assert
    expectRejection(result);
    expect(await snapshot()).toEqual(before);
  });
});
