import { PasswordHash } from './password-hash.js';
import { Role } from './role.js';
import { UserId } from './user-id.js';
import { Username } from './username.js';

// Aggregate root for a registered player. Immutable: a change produces a new
// User. The id and the date come from outside (repository and clock) so the
// domain stays deterministic.
export class User {
  private readonly registeredAt: Date;

  private constructor(
    readonly id: UserId,
    readonly username: Username,
    readonly passwordHash: PasswordHash,
    readonly role: Role,
    createdAt: Date,
  ) {
    this.registeredAt = new Date(createdAt.getTime());
  }

  // A new user always starts as a player; admins are never self-registered.
  static create(
    id: UserId,
    username: Username,
    passwordHash: PasswordHash,
    createdAt: Date,
  ): User {
    return new User(id, username, passwordHash, Role.Player, createdAt);
  }

  // Rebuilds a stored user, keeping its role.
  static restore(
    id: UserId,
    username: Username,
    passwordHash: PasswordHash,
    role: Role,
    createdAt: Date,
  ): User {
    return new User(id, username, passwordHash, role, createdAt);
  }

  get createdAt(): Date {
    return new Date(this.registeredAt.getTime());
  }

  isAdmin(): boolean {
    return this.role === Role.Admin;
  }
}
