import { Model, Types } from 'mongoose';
import { IUserRepository } from '../../../application/ports/user-repository.js';
import { Optional } from '../../../domain/shared/optional.js';
import { User } from '../../../domain/user/user.js';
import { UserId } from '../../../domain/user/user-id.js';
import { Username } from '../../../domain/user/username.js';
import { UserMapper } from './user.mapper.js';
import { UserDocument } from './user.schema.js';

// Repository + Adapter: implements the IUserRepository port with a Mongoose
// model. The unique index on `username` rejects duplicates even when two
// registrations race.
export class MongoUserRepository implements IUserRepository {
  constructor(private readonly model: Model<UserDocument>) {}

  nextId(): UserId {
    return UserId.of(new Types.ObjectId().toHexString());
  }

  async findById(id: UserId): Promise<Optional<User>> {
    const doc = await this.model
      .findById(id.toString())
      .lean<UserDocument>()
      .exec();
    return doc ? Optional.of(UserMapper.toDomain(doc)) : Optional.empty();
  }

  async findByUsername(username: Username): Promise<Optional<User>> {
    const doc = await this.model
      .findOne({ username: username.toString() })
      .lean<UserDocument>()
      .exec();
    return doc ? Optional.of(UserMapper.toDomain(doc)) : Optional.empty();
  }

  async save(user: User): Promise<void> {
    const doc = UserMapper.toDocument(user);
    await this.model
      .replaceOne({ _id: doc._id }, doc, { upsert: true })
      .exec();
  }
}
