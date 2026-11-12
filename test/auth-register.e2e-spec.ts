import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/infrastructure/app.module.js';
import { configureApp } from '../src/infrastructure/http/configure-app.js';

describe('POST /api/v1/auth/register (e2e, UC-001)', () => {
  let app: INestApplication<App>;
  let connection: Connection;

  const credentials = { username: 'ivifer', password: 'correct-horse' };

  function register(body: unknown) {
    return request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(body as object);
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    connection = app.get<Connection>(getConnectionToken());
  });

  beforeEach(async () => {
    await connection.collection('users').deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  it('should_return_201_with_user_and_token_when_registration_succeeds', async () => {
    // Arrange: no users (beforeEach).

    // Act
    const response = await register(credentials);

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.user).toEqual({
      id: expect.stringMatching(/^[0-9a-f]{24}$/),
      username: 'ivifer',
      role: 'player',
    });
    expect(response.body.expiresIn).toBe(604800);
    const payload = await app
      .get(JwtService)
      .verifyAsync<{ sub: string }>(response.body.accessToken);
    expect(payload.sub).toBe(response.body.user.id);
  });

  it('should_not_return_password_or_hash_when_registration_succeeds', async () => {
    // Arrange: no users (beforeEach).

    // Act
    const response = await register(credentials);

    // Assert
    const stored = await connection
      .collection('users')
      .findOne({ username: 'ivifer' });
    const text = JSON.stringify(response.body);
    expect(Object.keys(response.body).sort()).toEqual([
      'accessToken',
      'expiresIn',
      'user',
    ]);
    expect(text).not.toContain('correct-horse');
    expect(text).not.toContain(stored?.passwordHash);
    expect(stored?.passwordHash).not.toContain('correct-horse');
  });

  it('should_return_400_with_details_for_each_invalid_field_when_body_is_invalid', async () => {
    // Arrange
    const body = { username: 'Iv', password: 'short' };

    // Act
    const response = await register(body);

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Invalid request',
      details: [
        {
          field: 'username',
          message:
            'must have 3 to 20 characters: lowercase letters, digits or _',
        },
        { field: 'password', message: 'must have at least 8 characters' },
      ],
      path: '/api/v1/auth/register',
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
    expect(await connection.collection('users').countDocuments()).toBe(0);
  });

  it('should_return_400_when_body_fields_are_missing', async () => {
    // Arrange
    const body = { username: 'ivifer' };

    // Act
    const response = await register(body);

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.details).toEqual([
      { field: 'password', message: 'must be a string' },
    ]);
  });

  it('should_return_409_when_username_is_taken', async () => {
    // Arrange
    await register(credentials);

    // Act
    const response = await register({
      username: 'ivifer',
      password: 'another-password',
    });

    // Assert
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      statusCode: 409,
      error: 'Conflict',
      message: 'Username already taken',
      path: '/api/v1/auth/register',
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
    expect(await connection.collection('users').countDocuments()).toBe(1);
  });

  it('should_return_400_in_contract_shape_without_echoing_input_when_json_is_malformed', async () => {
    // Arrange
    const body = '{"username":"secret-probe"';

    // Act
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('Content-Type', 'application/json')
      .send(body);

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Invalid request',
      path: '/api/v1/auth/register',
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
    expect(JSON.stringify(response.body)).not.toContain('secret-probe');
  });

  it('should_return_413_in_contract_shape_when_body_is_too_large', async () => {
    // Arrange: the default JSON body limit is 100 kB.
    const body = { username: 'ivifer', password: 'x'.repeat(200 * 1024) };

    // Act
    const response = await register(body);

    // Assert
    expect(response.status).toBe(413);
    expect(response.body).toEqual({
      statusCode: 413,
      error: 'Payload Too Large',
      message: 'Request body too large',
      path: '/api/v1/auth/register',
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
  });

  it('should_keep_health_outside_the_api_prefix_when_app_is_configured', async () => {
    // Arrange: the configured application (beforeAll).

    // Act
    const response = await request(app.getHttpServer()).get('/health');

    // Assert
    expect(response.status).toBe(200);
  });
});
