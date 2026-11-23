import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { AppModule } from '../src/infrastructure/app.module.js';
import { configureApp } from '../src/infrastructure/http/configure-app.js';

interface ContractSchema {
  readonly $ref?: string;
  readonly required?: readonly string[];
  readonly properties: Record<string, ContractSchema>;
  readonly items: ContractSchema;
}

interface JsonContent {
  readonly content: { 'application/json': { schema: ContractSchema } };
}

interface Operation {
  readonly requestBody?: JsonContent & { required: boolean };
  readonly parameters?: unknown;
  readonly responses: Record<string, JsonContent>;
  readonly security?: ReadonlyArray<Record<string, readonly string[]>>;
}

interface ContractDocument {
  readonly paths: Record<string, Record<string, Operation>>;
  readonly components: {
    readonly schemas: Record<string, ContractSchema>;
    readonly securitySchemes: Record<string, unknown>;
  };
}

const operations = [
  ['get', '/health', ['200']],
  ['get', '/api/v1/auth/me', ['200', '401', '500']],
  ['post', '/api/v1/auth/login', ['200', '400', '401', '413', '500']],
  ['post', '/api/v1/auth/register', ['201', '400', '409', '413', '500']],
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
  body: JsonContent,
): ContractSchema {
  return readSchema(document, body.content['application/json'].schema);
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

  it('should_describe_the_auth_contract_when_client_requests_openapi_json', async () => {
    // Arrange
    const http = await start('true');

    // Act
    const response = await http.get('/docs-json');

    // Assert
    expect(response.status).toBe(200);
    const document = response.body as ContractDocument;
    for (const [method, path, codes] of operations) {
      const operation = document.paths[path][method];
      expect(Object.keys(operation.responses)).toEqual(codes);
      const auth = operation.security ?? [];
      if (path === '/api/v1/auth/me') {
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
  });

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
