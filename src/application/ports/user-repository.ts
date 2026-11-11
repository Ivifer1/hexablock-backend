import { Optional } from '../../domain/shared/optional.js';
import { User } from '../../domain/user/user.js';
import { UserId } from '../../domain/user/user-id.js';
import { Username } from '../../domain/user/username.js';

// Output port: where users are stored. Use cases depend on this interface;
// the database adapter implements it.
export interface IUserRepository {
  // A fresh, unique identity for a user that is about to be created.
  nextId(): UserId;
  findById(id: UserId): Promise<Optional<User>>;
  findByUsername(username: Username): Promise<Optional<User>>;
  // Creates the user or replaces the stored one with the same id.
  save(user: User): Promise<void>;
}
