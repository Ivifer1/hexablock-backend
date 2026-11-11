import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';
import { AppModule } from '../src/infrastructure/app.module.js';

describe('Database connection (e2e, issue #15)', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  it('should_connect_to_database_when_app_starts', async () => {
    // Arrange
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();

    // Act
    await app.init();

    // Assert
    const connection = app.get<Connection>(getConnectionToken());
    expect(connection.readyState).toBe(ConnectionStates.connected);
  });
});
