import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { AppModule } from '../src/infrastructure/app.module.js';
import { configureApp } from '../src/infrastructure/http/configure-app.js';

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
