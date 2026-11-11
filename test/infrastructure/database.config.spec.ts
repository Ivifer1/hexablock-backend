import { readDatabaseUri } from '../../src/infrastructure/config/database.config.js';

describe('readDatabaseUri (issue #15)', () => {
  it('should_return_uri_when_mongodb_uri_is_set', () => {
    // Arrange
    const env = { MONGODB_URI: 'mongodb://localhost:27017/hexablock' };

    // Act
    const uri = readDatabaseUri(env);

    // Assert
    expect(uri).toBe('mongodb://localhost:27017/hexablock');
  });

  it('should_throw_when_mongodb_uri_is_missing', () => {
    // Arrange
    const env = {};

    // Act
    const read = () => readDatabaseUri(env);

    // Assert
    expect(read).toThrow('MONGODB_URI is not set');
  });

  it('should_throw_when_mongodb_uri_is_blank', () => {
    // Arrange
    const env = { MONGODB_URI: '   ' };

    // Act
    const read = () => readDatabaseUri(env);

    // Assert
    expect(read).toThrow('MONGODB_URI is not set');
  });
});
