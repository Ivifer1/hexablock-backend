import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/infrastructure/app.module.js';
import { configureApp } from '../src/infrastructure/http/configure-app.js';

describe('HTTP error format (e2e, issue #20)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should_return_404_in_contract_shape_without_query_when_route_does_not_exist', async () => {
    // Arrange
    const url = '/api/v1/no-such-route?access_token=secret-token';

    // Act
    const response = await request(app.getHttpServer()).get(url);

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Not Found',
      path: '/api/v1/no-such-route',
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
    expect(JSON.stringify(response.body)).not.toContain('secret-token');
  });
});
