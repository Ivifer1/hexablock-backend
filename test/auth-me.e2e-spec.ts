import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/infrastructure/app.module.js';
import { configureApp } from '../src/infrastructure/http/configure-app.js';

describe('GET /api/v1/auth/me (e2e, UC-003)', () => {
  let app: INestApplication<App>;
  let connection: Connection;
  let accessToken: string;
  let userId: string;

  const timestamp = expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/);
  const unauthorized = {
    statusCode: 401,
    error: 'Unauthorized',
    message: 'Authentication required',
    path: '/api/v1/auth/me',
    timestamp,
  };

  function me(authorization?: string) {
    const call = request(app.getHttpServer()).get('/api/v1/auth/me');
    return authorization ? call.set('Authorization', authorization) : call;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    connection = app.get<Connection>(getConnectionToken());
    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ username: 'ivifer', password: 'correct-horse' });
    accessToken = registered.body.accessToken;
    userId = registered.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should_return_200_with_current_user_when_token_is_valid', async () => {
    // Arrange: the token issued at registration (beforeAll).

    // Act
    const response = await me(`Bearer ${accessToken}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: userId,
      username: 'ivifer',
      role: 'player',
    });
  });

  it('should_return_same_401_when_token_is_missing_malformed_or_expired', async () => {
    // Arrange
    const expired = await app.get(JwtService).signAsync({
      sub: userId,
      username: 'ivifer',
      role: 'player',
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    const headers = [
      undefined,
      `Basic ${accessToken}`,
      'Bearer',
      'Bearer not-a-token',
      `Bearer ${accessToken}x`,
      `Bearer ${expired}`,
    ];

    // Act
    const responses = await Promise.all(headers.map((header) => me(header)));

    // Assert
    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    }
  });

  it('should_return_401_when_user_of_token_no_longer_exists', async () => {
    // Arrange
    const other = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ username: 'leaving', password: 'correct-horse' });
    await connection
      .collection('users')
      .deleteOne({ username: 'leaving' });

    // Act
    const response = await me(`Bearer ${other.body.accessToken}`);

    // Assert
    expect(response.status).toBe(401);
    expect(response.body).toEqual(unauthorized);
  });
});
