import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/infrastructure/app.module.js';
import { configureApp } from '../src/infrastructure/http/configure-app.js';

describe('POST /api/v1/auth/login (e2e, UC-002)', () => {
  let app: INestApplication<App>;
  let connection: Connection;
  let registeredId: string;

  const credentials = { username: 'ivifer', password: 'correct-horse' };
  const timestamp = expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/);

  function login(body: unknown) {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
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
    await connection.collection('users').deleteMany({});
    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(credentials);
    registeredId = registered.body.user.id;
  });

  afterAll(async () => {
    await connection.collection('users').deleteMany({});
    await app.close();
  });

  it('should_return_200_with_user_and_token_when_login_succeeds', async () => {
    // Arrange: the user registered in beforeAll.

    // Act
    const response = await login(credentials);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({
      id: registeredId,
      username: 'ivifer',
      role: 'player',
    });
    expect(response.body.expiresIn).toBe(604800);
    const payload = await app
      .get(JwtService)
      .verifyAsync<{ sub: string }>(response.body.accessToken);
    expect(payload.sub).toBe(registeredId);
  });

  it('should_return_same_401_when_username_or_password_is_wrong', async () => {
    // Arrange
    const wrongPassword = { username: 'ivifer', password: 'wrong-horse' };
    const unknownUser = { username: 'nobody', password: 'correct-horse' };

    // Act
    const byPassword = await login(wrongPassword);
    const byUsername = await login(unknownUser);

    // Assert
    const expected = {
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid credentials',
      path: '/api/v1/auth/login',
      timestamp,
    };
    expect(byPassword.status).toBe(401);
    expect(byPassword.body).toEqual(expected);
    expect(byUsername.status).toBe(401);
    expect(byUsername.body).toEqual(expected);
  });

  it('should_return_500_in_contract_shape_without_details_when_stored_hash_is_corrupt', async () => {
    // Arrange: a user whose stored hash cannot be read (unexpected error).
    await connection.collection('users').insertOne({
      _id: 'aaaaaaaaaaaaaaaaaaaaaaaa' as never,
      username: 'corrupt',
      passwordHash: 'bcrypt$not-ours',
      role: 'player',
      createdAt: new Date('2026-11-12T00:00:00.000Z'),
    });

    // Act
    const response = await login({
      username: 'corrupt',
      password: 'correct-horse',
    });

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error',
      path: '/api/v1/auth/login',
      timestamp,
    });
    expect(JSON.stringify(response.body)).not.toContain('bcrypt');
  });

  it('should_return_400_with_details_when_body_is_invalid', async () => {
    // Arrange
    const body = { username: 'Iv' };

    // Act
    const response = await login(body);

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.details).toEqual([
      {
        field: 'username',
        message: 'must have 3 to 20 characters: lowercase letters, digits or _',
      },
      { field: 'password', message: 'must be a string' },
    ]);
  });
});
