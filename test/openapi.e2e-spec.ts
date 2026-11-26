import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { vi } from 'vitest';
import fitExample from '../docs/specs/levels/hexa-fit.example.json' with { type: 'json' };
import sortExample from '../docs/specs/levels/hexa-sort.example.json' with { type: 'json' };
import { AppModule } from '../src/infrastructure/app.module.js';
import { configureApp } from '../src/infrastructure/http/configure-app.js';

interface ContractSchema {
  readonly $ref?: string;
  readonly required?: readonly string[];
  readonly properties: Record<string, ContractSchema>;
  readonly items: ContractSchema;
  readonly oneOf?: readonly ContractSchema[];
}

interface JsonContent {
  readonly content: { 'application/json': { schema: ContractSchema } };
}

interface ContractResponse extends Partial<JsonContent> {
  readonly description: string;
}

interface Operation {
  readonly requestBody?: JsonContent & { required: boolean };
  readonly parameters?: unknown;
  readonly responses: Record<string, ContractResponse>;
  readonly security?: ReadonlyArray<Record<string, readonly string[]>>;
}

interface ContractDocument {
  readonly security?: Operation['security'];
  readonly paths: Record<string, Record<string, Operation>>;
  readonly components: {
    readonly schemas: Record<string, ContractSchema>;
    readonly securitySchemes: Record<string, unknown>;
  };
}

const operations = [
  ['get', '/health', ['200']],
  ['get', '/api/v1/auth/me', ['200', '401', '500']],
  ['get', '/api/v1/levels', ['200', '400', '404', '500']],
  ['get', '/api/v1/levels/{id}', ['200', '404', '500']],
  ['post', '/api/v1/auth/login', ['200', '400', '401', '413', '500']],
  ['post', '/api/v1/auth/register', ['201', '400', '409', '413', '500']],
  ['post', '/api/v1/scores', ['201', '400', '401', '404', '413', '500']],
] as const;

const adminLevelOperations = [
  ['post', '/api/v1/levels', ['201', '400', '401', '403', '409', '413', '500']],
  [
    'put',
    '/api/v1/levels/{id}',
    ['200', '400', '401', '403', '404', '409', '413', '500'],
  ],
  ['delete', '/api/v1/levels/{id}', ['204', '401', '403', '404', '500']],
] as const;

const progressOperations = [
  ['get', '/api/v1/progress', ['200', '401', '500']],
  ['get', '/api/v1/progress/{gameId}', ['200', '401', '404', '500']],
  [
    'put',
    '/api/v1/progress/{gameId}',
    ['200', '400', '401', '404', '413', '500'],
  ],
] as const;

function readSchema(
  document: ContractDocument,
  schema: ContractSchema,
): ContractSchema {
  return schema.$ref
    ? document.components.schemas[
        schema.$ref.replace('#/components/schemas/', '')
      ]
    : schema;
}

function jsonSchema(
  document: ContractDocument,
  body: Partial<JsonContent>,
): ContractSchema {
  const schema = body.content?.['application/json'].schema;
  if (!schema) throw new Error('Expected an application/json schema');
  return readSchema(document, schema);
}

describe('Read the running API documentation (e2e, UC-007)', () => {
  const apps: INestApplication<App>[] = [];

  async function start(flag: string | undefined) {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = module.createNestApplication<INestApplication<App>>();
    apps.push(app);
    vi.stubEnv('SWAGGER_ENABLED', flag);
    try {
      configureApp(app);
    } finally {
      vi.unstubAllEnvs();
    }
    await app.init();
    return request(app.getHttpServer());
  }

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it('should_serve_ui_and_openapi_json_when_documentation_is_enabled', async () => {
    // Arrange
    const http = await start('true');

    // Act
    const ui = await http.get('/docs');
    const json = await http.get('/docs-json');
    const init = await http.get('/docs/swagger-ui-init.js');
    const yaml = await http.get('/docs-yaml');

    // Assert
    expect(ui.status).toBe(200);
    expect(ui.headers['content-type']).toMatch(/text\/html/);
    expect(ui.text).toContain('swagger-ui');
    expect(json.status).toBe(200);
    expect(json.headers['content-type']).toMatch(/application\/json/);
    expect(json.body).toMatchObject({ openapi: expect.stringMatching(/^3\./) });
    expect(init.status).toBe(200);
    expect(init.text).toMatch(/"persistAuthorization"\s*:\s*false/);
    expect(yaml.status).toBe(404);
  });

  it.each([undefined, 'false', 'TRUE'])(
    'should_return_not_found_for_both_routes_when_documentation_is_disabled_%s',
    async (flag) => {
      // Arrange
      const http = await start(flag);

      // Act
      const ui = await http.get('/docs');
      const json = await http.get('/docs-json');

      // Assert
      expect(ui.status).toBe(404);
      expect(json.status).toBe(404);
    },
  );

  it('should_hide_documentation_assets_when_documentation_is_disabled', async () => {
    // Arrange
    const http = await start(undefined);

    // Act
    const init = await http.get('/docs/swagger-ui-init.js');
    const css = await http.get('/docs/swagger-ui.css');

    // Assert
    expect(init.status).toBe(404);
    expect(css.status).toBe(404);
  });

  it('should_list_only_the_implemented_operations_when_client_requests_openapi_json', async () => {
    // Arrange
    const http = await start('true');

    // Act
    const response = await http.get('/docs-json');

    // Assert
    expect(response.status).toBe(200);
    const { paths } = response.body as ContractDocument;
    const listed = Object.entries(paths).flatMap(([path, item]) =>
      Object.keys(item).map((method) => `${method} ${path}`),
    );
    expect(listed.sort()).toEqual(
      [...operations, ...adminLevelOperations, ...progressOperations]
        .map(([method, path]) => `${method} ${path}`)
        .sort(),
    );
  });

  it('should_document_progress_authentication_and_shapes_when_openapi_is_enabled', async () => {
    // Arrange
    const http = await start('true');

    // Act
    const response = await http.get('/docs-json');
    const document = response.body as ContractDocument;

    // Assert
    expect(response.status).toBe(200);
    for (const [method, path, codes] of progressOperations) {
      const operation = document.paths[path][method];
      expect(Object.keys(operation.responses)).toEqual(codes);
      expect(operation.security).toEqual([{ bearer: [] }]);
      if (path.includes('{gameId}'))
        expect(operation.parameters).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              in: 'path',
              name: 'gameId',
              required: true,
            }),
          ]),
        );
    }
    const keyed = document.paths['/api/v1/progress/{gameId}'];
    expect(
      jsonSchema(document, keyed.get.responses['200']).properties.updatedAt,
    ).toMatchObject({ type: 'string', format: 'date-time', nullable: true });
    expect(
      jsonSchema(document, keyed.put.responses['200']).properties.updatedAt,
    ).not.toMatchObject({ nullable: true });
    expect(jsonSchema(document, keyed.put.requestBody!)).toMatchObject({
      oneOf: [
        { $ref: '#/components/schemas/ScoreProgressInput' },
        { $ref: '#/components/schemas/LevelProgressInput' },
      ],
    });
    expect(
      document.components.schemas.LevelProgressInput.properties.levels,
    ).toMatchObject({
      type: 'object',
      additionalProperties: { $ref: '#/components/schemas/LevelProgressEntry' },
    });
    expect(jsonSchema(document, keyed.put.responses['400'])).toEqual(
      document.components.schemas.BadRequest,
    );
  });

  it('should_describe_the_actual_http_contract_when_client_requests_openapi_json', async () => {
    // Arrange
    const http = await start('true');

    // Act
    const response = await http.get('/docs-json');

    // Assert
    expect(response.status).toBe(200);
    const document = response.body as ContractDocument;
    expect(document.security ?? []).toEqual([]);
    for (const [method, path, codes] of operations) {
      const operation = document.paths[path][method];
      expect(Object.keys(operation.responses)).toEqual(codes);
      const auth = operation.security ?? [];
      if (path === '/api/v1/auth/me' || path === '/api/v1/scores') {
        expect(auth).toHaveLength(1);
        const [scheme] = Object.keys(auth[0]);
        expect(auth[0][scheme]).toEqual([]);
        expect(document.components.securitySchemes[scheme]).toMatchObject({
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        });
      } else {
        expect(auth).toEqual([]);
      }
    }
    const register = document.paths['/api/v1/auth/register'].post;
    const login = document.paths['/api/v1/auth/login'].post;
    for (const operation of [register, login]) {
      expect(operation.requestBody?.required).toBe(true);
      const requestBody = jsonSchema(document, operation.requestBody!);
      expect(requestBody.required).toEqual(['username', 'password']);
      expect(requestBody.properties).toMatchObject({
        username: { type: 'string' },
        password: { type: 'string' },
      });
    }
    const authResult = jsonSchema(document, register.responses['201']);
    expect(authResult.required).toEqual(['user', 'accessToken', 'expiresIn']);
    expect(jsonSchema(document, login.responses['200'])).toEqual(authResult);
    const user = jsonSchema(
      document,
      document.paths['/api/v1/auth/me'].get.responses['200'],
    );
    expect(user.required).toEqual(['id', 'username', 'role']);
    expect(readSchema(document, authResult.properties.user)).toEqual(user);

    const list = document.paths['/api/v1/levels'].get;
    const get = document.paths['/api/v1/levels/{id}'].get;
    expect(list.parameters).toContainEqual(
      expect.objectContaining({ name: 'gameId', in: 'query', required: true }),
    );
    expect(get.parameters).toContainEqual(
      expect.objectContaining({ name: 'id', in: 'path', required: true }),
    );
    const listResult = jsonSchema(document, list.responses['200']);
    expect(listResult.required).toEqual(['items']);
    const level = jsonSchema(document, get.responses['200']);
    expect(readSchema(document, listResult.properties.items.items)).toEqual(
      level,
    );
    expect(level).toMatchObject({
      required: ['schemaVersion', 'id', 'gameId', 'order', 'name', 'board'],
      additionalProperties: { type: 'object' },
      properties: {
        name: { required: ['es', 'en'] },
        board: {
          properties: {
            cells: {
              type: 'array',
              items: { type: 'array', items: { type: 'integer' } },
            },
          },
        },
      },
    });
    expect(get.responses['200'].content?.['application/json']).toMatchObject({
      examples: { fit: { value: fitExample }, sort: { value: sortExample } },
    });
    expect(level.properties).not.toHaveProperty('fit');
    expect(level.properties).not.toHaveProperty('sort');
    const badRequest = jsonSchema(document, register.responses['400']);
    expect(badRequest.required).toEqual([
      'statusCode',
      'error',
      'message',
      'path',
      'timestamp',
    ]);
    expect(badRequest.properties.details).toMatchObject({
      type: 'array',
      items: { required: ['field', 'message'] },
    });
    expect(badRequest.required).not.toContain('details');
    expect(
      jsonSchema(document, register.responses['409']).properties,
    ).not.toHaveProperty('details');

    const submitScore = document.paths['/api/v1/scores'].post;
    expect(submitScore.security).toEqual([{ bearer: [] }]);
    expect(submitScore.requestBody?.required).toBe(true);
    const scoreInput = jsonSchema(document, submitScore.requestBody!);
    expect(scoreInput).toMatchObject({
      required: ['gameId', 'score'],
      additionalProperties: false,
      properties: {
        gameId: { type: 'string' },
        levelId: { type: 'string' },
        score: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
      },
    });
    const scoreResult = jsonSchema(document, submitScore.responses['201']);
    expect(scoreResult.oneOf).toHaveLength(2);
    expect(submitScore.responses['400']).toBeDefined();
  });

  it.each(adminLevelOperations)(
    'should_document_the_admin_level_contract_when_client_inspects_%s_%s',
    async (method, path, [success, ...errors]) => {
      // Arrange
      const http = await start('true');
      const levelMedia = {
        schema: { $ref: '#/components/schemas/Level' },
        examples: { fit: { value: fitExample }, sort: { value: sortExample } },
      };

      // Act
      const response = await http.get('/docs-json');

      // Assert
      expect(response.status).toBe(200);
      const document = response.body as ContractDocument;
      const operation = document.paths[path][method];
      expect.soft(operation.security).toEqual([{ bearer: [] }]);
      expect
        .soft(Object.keys(operation.responses))
        .toEqual([success, ...errors]);
      expect.soft(operation.responses['403']).toMatchObject({
        description: expect.stringMatching(/stored.*admin/i),
      });
      for (const code of errors) {
        expect.soft(operation.responses[code]).toMatchObject({
          content: {
            'application/json': {
              schema: {
                $ref:
                  code === '400'
                    ? '#/components/schemas/BadRequest'
                    : '#/components/schemas/Error',
              },
            },
          },
        });
      }

      if (method !== 'post') {
        expect.soft(operation.parameters).toContainEqual(
          expect.objectContaining({
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'fit-003' },
          }),
        );
      }

      if (method === 'delete') {
        expect.soft(operation.requestBody).toBeUndefined();
        expect.soft(operation.responses[success]).not.toHaveProperty('content');
      } else {
        expect.soft(operation.requestBody).toMatchObject({
          required: true,
          content: { 'application/json': levelMedia },
        });
        expect.soft(operation.responses[success]).toMatchObject({
          content: { 'application/json': levelMedia },
        });
      }
    },
  );

  it('should_preserve_existing_http_behavior_when_documentation_is_enabled', async () => {
    // Arrange
    const http = await start('true');

    // Act
    const health = await http.get('/health');
    const prefixedHealth = await http.get('/api/v1/health');
    const unauthenticated = await http.get('/api/v1/auth/me');
    const levels = await http
      .get('/api/v1/levels')
      .query({ gameId: 'hexa-fit' });

    // Assert
    expect([
      health.status,
      prefixedHealth.status,
      unauthenticated.status,
      levels.status,
    ]).toEqual([200, 404, 401, 200]);
    expect(health.body).toEqual({ status: 'ok' });
    expect(unauthenticated.body).toMatchObject({
      statusCode: 401,
      message: 'Authentication required',
    });
    expect(levels.body).toEqual({ items: [] });
  });
});
