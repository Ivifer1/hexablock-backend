import { randomUUID } from 'node:crypto';
import { Connection, createConnection, Model } from 'mongoose';
import { MongoUserRepository } from '../../../src/adapters/persistence/mongo/mongo-user.repository.js';
import {
  UserDocument,
  UserSchema,
} from '../../../src/adapters/persistence/mongo/user.schema.js';
import { DomainError } from '../../../src/domain/shared/domain-error.js';
import { ErrorCode } from '../../../src/domain/shared/error-code.js';
import { PasswordHash } from '../../../src/domain/user/password-hash.js';
import { Role } from '../../../src/domain/user/role.js';
import { User } from '../../../src/domain/user/user.js';
import { Username } from '../../../src/domain/user/username.js';

// Integration: the real repository against the in-memory MongoDB started by
// the global setup. Each run uses its own database name, dropped at the end.
describe('MongoUserRepository (integration, issue #16)', () => {
  let connection: Connection;
  let model: Model<UserDocument>;
  let repository: MongoUserRepository;

  const createdAt = new Date('2026-11-11T12:00:00.000Z');

  function newUser(username: string): User {
    return User.create(
      repository.nextId(),
      Username.of(username),
      PasswordHash.of('$hashed$'),
      createdAt,
    );
  }

  beforeAll(async () => {
    connection = await createConnection(process.env.MONGODB_URI ?? '', {
      dbName: `users-${randomUUID()}`,
    }).asPromise();
    model = connection.model<UserDocument>('User', UserSchema);
    await model.init();
  });

  beforeEach(async () => {
    await model.deleteMany({});
    repository = new MongoUserRepository(model);
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await connection.close();
  });

  it('should_find_saved_user_when_searching_by_id', async () => {
    // Arrange
    const user = newUser('ivifer');
    await repository.save(user);

    // Act
    const found = await repository.findById(user.id);

    // Assert
    expect(found.isPresent()).toBe(true);
    const stored = found.get();
    expect(stored.id.equals(user.id)).toBe(true);
    expect(stored.username.equals(user.username)).toBe(true);
    expect(stored.passwordHash.equals(user.passwordHash)).toBe(true);
    expect(stored.role).toBe(Role.Player);
    expect(stored.createdAt).toEqual(createdAt);
  });

  it('should_find_saved_user_when_searching_by_username', async () => {
    // Arrange
    const user = newUser('ivifer');
    await repository.save(user);

    // Act
    const found = await repository.findByUsername(Username.of('ivifer'));

    // Assert
    expect(found.isPresent()).toBe(true);
    expect(found.get().id.equals(user.id)).toBe(true);
  });

  it('should_return_empty_when_username_does_not_exist', async () => {
    // Arrange
    await repository.save(newUser('ivifer'));

    // Act
    const found = await repository.findByUsername(Username.of('nobody'));

    // Assert
    expect(found.isPresent()).toBe(false);
  });

  it('should_return_empty_when_id_does_not_exist', async () => {
    // Arrange
    const missingId = repository.nextId();

    // Act
    const found = await repository.findById(missingId);

    // Assert
    expect(found.isPresent()).toBe(false);
  });

  it('should_throw_username_taken_when_username_is_taken', async () => {
    // Arrange
    await repository.save(newUser('ivifer'));
    const duplicate = newUser('ivifer');

    // Act
    const save = repository.save(duplicate);

    // Assert
    await expect(save).rejects.toBeInstanceOf(DomainError);
    await expect(save).rejects.toMatchObject({
      code: ErrorCode.UsernameTaken,
    });
    expect(await model.countDocuments({ username: 'ivifer' })).toBe(1);
  });

  it('should_update_user_when_saved_again', async () => {
    // Arrange
    const user = newUser('ivifer');
    await repository.save(user);
    const promoted = User.restore(
      user.id,
      user.username,
      user.passwordHash,
      Role.Admin,
      user.createdAt,
    );

    // Act
    await repository.save(promoted);

    // Assert
    expect(await model.countDocuments({})).toBe(1);
    const stored = await repository.findById(user.id);
    expect(stored.get().isAdmin()).toBe(true);
  });

  it('should_return_different_ids_when_next_id_is_called_twice', () => {
    // Arrange + Act
    const first = repository.nextId();
    const second = repository.nextId();

    // Assert
    expect(first.equals(second)).toBe(false);
  });
});
