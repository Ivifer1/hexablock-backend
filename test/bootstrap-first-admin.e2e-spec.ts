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

  it('should_insert_one_admin_when_two_bootstraps_race_with_different_names', async () => {
    // Arrange
    await users.createIndex({ username: 1 }, { unique: true });
    const names = [username, 'other_admin'];
    const insertOne = mongo.Collection.prototype.insertOne;
    let arrived = 0;
    let release = () => {};
    const bothReady = new Promise<void>((resolve) => {
      release = resolve;
    });
    // Force both commands past the precheck before either real insert.
    const watchdog = setTimeout(release, 2000);
    const inserts = vi
      .spyOn(mongo.Collection.prototype, 'insertOne')
      .mockImplementation(async function (this: mongo.Collection, ...args) {
        if (++arrived === 2) release();
        await bothReady;
        return insertOne.apply(this, args);
      });

    // Act
    const results = await Promise.all(
      names.map((name) => bootstrap([name], envFor(uri))),
    ).finally(() => {
      clearTimeout(watchdog);
      inserts.mockRestore();
    });

    // Assert
    expect(arrived).toBe(2);
    const winners = results.flatMap((result, index) =>
      result.status === 0 ? [names[index]] : [],
    );
    expect(winners).toHaveLength(1);
    expectRejection(results.find((result) => result.status !== 0)!);
    expect(await users.find().toArray()).toEqual([
      expect.objectContaining({
        _id: reservedId,
        username: winners[0],
        role: 'admin',
      }),
    ]);
  });

  it('should_leave_users_unchanged_when_target_or_credentials_are_invalid', async () => {
    // Arrange
    await users.createIndex({ username: 1 }, { unique: true });
    const before = await snapshot();
    const env = envFor(uri);

    // Act
    const results = [
      await bootstrap([username], {}),
      await bootstrap([username], envFor(serverUri)),
      await bootstrap(['Bad-Username'], env),
      await bootstrap([username, 'argument-password'], env),
      await bootstrap([username], env, 'short\n'),
      await bootstrap([username], env, ''),
      await bootstrap([username], env, 'x'.repeat(4097)),
      await bootstrap([username], env, `${password}\nsecond line\n`),
      await bootstrap([username], env, undefined, true),
    ];

    // Assert
    results.forEach(expectRejection);
    expect(results[3].output).not.toContain('argument-password');
    expect(await snapshot()).toEqual(before);
  });

  it.each([
    { name: 'missing', options: undefined },
    { name: 'nonunique', options: {} },
    {
      name: 'partial',
      options: { unique: true, partialFilterExpression: { role: 'admin' } },
    },
    { name: 'sparse', options: { unique: true, sparse: true } },
    {
      name: 'nonbinary',
      options: { unique: true, collation: { locale: 'en', strength: 2 } },
    },
  ])(
    'should_fail_without_writing_when_the_username_index_is_$name',
    async ({ options }) => {
      // Arrange
      await db.createCollection('users');
      if (options) await users.createIndex({ username: 1 }, options);
      const before = await snapshot();

      // Act
      const result = await bootstrap([username], envFor(uri));

      // Assert
      expectRejection(result);
      expect(await snapshot()).toEqual(before);
    },
  );

  it('should_not_create_a_collection_when_users_does_not_exist', async () => {
    // Arrange: the database has no collections.

    // Act
    const result = await bootstrap([username], envFor(uri));

    // Assert
    expectRejection(result);
    expect(await db.listCollections({}, { nameOnly: true }).toArray()).toEqual(
      [],
    );
  });

  it('should_report_uncertainty_without_retry_when_insert_confirmation_is_lost', async () => {
    // Arrange
    await users.createIndex({ username: 1 }, { unique: true });
    const insertOne = mongo.Collection.prototype.insertOne;
    let attempts = 0;
    const inserts = vi
      .spyOn(mongo.Collection.prototype, 'insertOne')
      .mockImplementation(async function (this: mongo.Collection, ...args) {
        attempts += 1;
        await insertOne.apply(this, args);
        throw new Error('private driver details: ' + uri);
      });

    // Act
    const result = await bootstrap([username], envFor(uri)).finally(() => {
      inserts.mockRestore();
    });

    // Assert
    expect(attempts).toBe(1);
    expectRejection(result);
    expect(result.stdout).toEqual([]);
    expect(result.output).toMatch(/could not confirm.*before retrying/i);
    expect(result.output).not.toContain('private driver details');
    expect(result.output).not.toContain(uri);
    expect(await users.find().toArray()).toEqual([
      expect.objectContaining({ username, role: 'admin' }),
    ]);
  });

  it('should_not_disclose_secrets_when_reading_the_password_fails', async () => {
    // Arrange
    await users.createIndex({ username: 1 }, { unique: true });
    const before = await snapshot();
    const driverDetail = 'private error diagnostic';
    async function* brokenInput() {
      yield Buffer.from(password);
      throw new Error(`${driverDetail}: ${uri}`);
    }
    const lines: string[] = [];

    // Act
    const status = await runBootstrapFirstAdmin([username], envFor(uri), {
      input: Readable.from(brokenInput()),
      out: (line) => lines.push(line),
      err: (line) => lines.push(line),
    });

    // Assert
    expect(status).not.toBe(0);
    expect(lines.join('\n').trim()).not.toBe('');
    expect(lines.join('\n')).not.toContain(driverDetail);
    expect(lines.join('\n')).not.toContain(uri);
    expect(lines.join('\n')).not.toContain(password.trim());
    expect(await snapshot()).toEqual(before);
  });
});
