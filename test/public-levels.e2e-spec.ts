import type { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { Connection, Model } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import fitExample from '../docs/specs/levels/hexa-fit.example.json' with { type: 'json' };
import sortExample from '../docs/specs/levels/hexa-sort.example.json' with { type: 'json' };
import {
  LEVEL_MODEL,
  type LevelDocument,
} from '../src/adapters/persistence/mongo/level.schema.js';
import { AppModule } from '../src/infrastructure/app.module.js';
import { configureApp } from '../src/infrastructure/http/configure-app.js';

const levelsPath = '/api/v1/levels';
const timestamp = expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/);

function fitDocument(id: string, order: number): LevelDocument {
  return {
    _id: id,
    schemaVersion: fitExample.schemaVersion,
    gameId: fitExample.gameId,
    order,
    name: fitExample.name,
    board: fitExample.board,
    section: { key: 'fit', payload: fitExample.fit },
  };
}

describe('Public level reads (e2e, UC-004)', () => {
  let app: INestApplication<App>;
  let connection: Connection;
  const levels = () => connection.collection<LevelDocument>('levels');
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    connection = app.get<Connection>(getConnectionToken());
  });

  afterEach(async () => {
    await levels().deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  it('should_not_create_level_collection_when_read_module_initializes', async () => {
    // Arrange
    const model = app.get<Model<LevelDocument>>(getModelToken(LEVEL_MODEL));

    // Act
    await model.init();

    // Assert
    expect(await connection.listCollections()).not.toContainEqual(
      expect.objectContaining({ name: 'levels' }),
    );
  });

  const sortWithoutSeed = {
    goal: sortExample.sort.goal,
    colors: sortExample.sort.colors,
    stackHeight: sortExample.sort.stackHeight,
  };

  it.each([undefined, 0])(
    'should_return_public_sort_json_when_seed_is_%s',
    async (seed) => {
      // Arrange
      const { sort: _sort, id, ...common } = sortExample;
      const payload =
        seed === undefined ? sortWithoutSeed : { ...sortWithoutSeed, seed };
      await levels().insertOne({
        _id: id,
        ...common,
        section: { key: 'sort', payload },
      });

      // Act
      const response = await http().get(`${levelsPath}/${id}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({ id, ...common, sort: payload });
    },
  );

  it.each(['missing-level', 'INVALID'])(
    'should_return_404_when_level_id_does_not_resolve_%s',
    async (id) => {
      // Arrange: the malformed ID cannot resolve even if storage contains it.
      await levels().insertOne(fitDocument('INVALID', 1));
      const before = await levels().find({}).toArray();
      const path = `${levelsPath}/${id}`;

      // Act
      const response = await http().get(path);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toStrictEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'Level not found',
        path,
        timestamp,
      });
      expect(await levels().find({}).toArray()).toStrictEqual(before);
    },
  );

  it('should_return_generic_500_when_storage_cannot_rehydrate_a_level', async () => {
    // Arrange
    const id = 'damaged-level';
    await levels().insertOne({
      ...fitDocument(id, 1),
      section: { key: 'fit', payload: { pieces: [], stars: [] } },
    });
    const path = `${levelsPath}/${id}`;

    // Act
    const response = await http().get(path);

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toStrictEqual({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error',
      path,
      timestamp,
    });
    expect(await levels().countDocuments()).toBe(1);
  });
});
