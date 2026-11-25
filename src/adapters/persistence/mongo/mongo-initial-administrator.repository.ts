import { mongo } from 'mongoose';
import type {
  IInitialAdministratorRepository,
  InitialAdministratorResult,
} from '../../../application/ports/initial-administrator-repository.js';
import { Role } from '../../../domain/user/role.js';
import type { User } from '../../../domain/user/user.js';
import { UserId } from '../../../domain/user/user-id.js';
import { UserMapper } from './user.mapper.js';
import type { UserDocument } from './user.schema.js';

// Deliberately outside the normal ObjectId namespace. All bootstrap attempts
// use the same _id so only one insert can win on the unsharded collection.
const FIRST_ADMIN_ID = UserId.of('bootstrap:first-admin');
const SIMPLE = { locale: 'simple' } as const;

function isSafeUsernameIndex(index: mongo.IndexDescriptionInfo): boolean {
  return (
    Object.keys(index.key).length === 1 &&
    index.key.username === 1 &&
    index.unique === true &&
    index.sparse !== true &&
    index.partialFilterExpression === undefined &&
    (index.collation === undefined || index.collation.locale === SIMPLE.locale)
  );
}

function isBootstrapCollision(error: unknown): boolean {
  if (!(error instanceof mongo.MongoServerError) || error.code !== 11000) {
    return false;
  }
  const keyPattern: unknown = error.keyPattern;
  return (
    typeof keyPattern === 'object' &&
    keyPattern !== null &&
    Object.keys(keyPattern).length === 1 &&
    ('_id' in keyPattern || 'username' in keyPattern)
  );
}

export class MongoInitialAdministratorRepository implements IInitialAdministratorRepository {
  constructor(private readonly users: mongo.Collection<UserDocument>) {}

  firstAdministratorId(): UserId {
    return FIRST_ADMIN_ID;
  }

  async createFirstAdministrator(
    user: User,
  ): Promise<InitialAdministratorResult> {
    if (!user.isAdmin() || !user.id.equals(FIRST_ADMIN_ID)) {
      throw new Error('Invalid first administrator identity');
    }

    if (!(await this.hasRequiredIndex())) return 'username-index-not-ready';
    if (await this.hasAdministrator()) return 'administrator-exists';

    try {
      const result = await this.users.insertOne(UserMapper.toDocument(user));
      if (!result.acknowledged) throw new Error('Insert was not acknowledged');
      return 'created';
    } catch (error) {
      if (!isBootstrapCollision(error)) throw error;
      // Do not rely on which constraint MongoDB reported first.
      if (await this.hasAdministrator()) return 'administrator-exists';
      const taken = await this.users.findOne(
        { username: user.username.toString() },
        { collation: SIMPLE, projection: { _id: 1 } },
      );
      return taken ? 'username-taken' : 'identity-conflict';
    }
  }

  private async hasAdministrator(): Promise<boolean> {
    return (
      (await this.users.findOne(
        { role: Role.Admin },
        { collation: SIMPLE, projection: { _id: 1 } },
      )) !== null
    );
  }

  private async hasRequiredIndex(): Promise<boolean> {
    try {
      const indexes = await this.users.listIndexes().toArray();
      return indexes.some(isSafeUsernameIndex);
    } catch (error) {
      // An absent collection cannot already have the required username index.
      if (error instanceof mongo.MongoServerError && error.code === 26) {
        return false;
      }
      throw error;
    }
  }
}
