import { PasswordHash } from '../../../domain/user/password-hash.js';
import { Role } from '../../../domain/user/role.js';
import { User } from '../../../domain/user/user.js';
import { UserId } from '../../../domain/user/user-id.js';
import { Username } from '../../../domain/user/username.js';
import { UserDocument } from './user.schema.js';

const ROLES: readonly string[] = Object.values(Role);

function toRole(raw: string): Role {
  if (!ROLES.includes(raw)) {
    throw new Error(`Stored user has an unknown role: ${raw}`);
  }
  return raw as Role;
}

// Data Mapper: translates between the domain User and its stored document.
// Rebuilding goes through the value objects, so stored data is re-validated.
export const UserMapper = {
  toDomain(doc: UserDocument): User {
    return User.restore(
      UserId.of(doc._id),
      Username.of(doc.username),
      PasswordHash.of(doc.passwordHash),
      toRole(doc.role),
      doc.createdAt,
    );
  },

  toDocument(user: User): UserDocument {
    return {
      _id: user.id.toString(),
      username: user.username.toString(),
      passwordHash: user.passwordHash.toString(),
      role: user.role,
      createdAt: user.createdAt,
    };
  },
};
