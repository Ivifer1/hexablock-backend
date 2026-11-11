import { PasswordHash } from '../../../src/domain/user/password-hash.js';
import { Role } from '../../../src/domain/user/role.js';
import { User } from '../../../src/domain/user/user.js';
import { UserId } from '../../../src/domain/user/user-id.js';
import { Username } from '../../../src/domain/user/username.js';

const id = UserId.of('6730f1c2a1b2c3d4e5f60718');
const username = Username.of('ivifer');
const passwordHash = PasswordHash.of('$hashed$');
const createdAt = new Date('2026-11-11T12:00:00.000Z');

describe('User (issue #16)', () => {
  it('should_create_player_when_user_is_created', () => {
    // Arrange + Act
    const user = User.create(id, username, passwordHash, createdAt);

    // Assert
    expect(user.role).toBe(Role.Player);
    expect(user.isAdmin()).toBe(false);
    expect(user.id.equals(id)).toBe(true);
    expect(user.username.equals(username)).toBe(true);
    expect(user.passwordHash.equals(passwordHash)).toBe(true);
    expect(user.createdAt).toEqual(createdAt);
  });

  it('should_report_admin_when_user_is_restored_as_admin', () => {
    // Arrange + Act
    const user = User.restore(id, username, passwordHash, Role.Admin, createdAt);

    // Assert
    expect(user.role).toBe(Role.Admin);
    expect(user.isAdmin()).toBe(true);
  });

  it('should_keep_created_at_when_caller_changes_the_original_date', () => {
    // Arrange
    const date = new Date('2026-11-11T12:00:00.000Z');
    const user = User.create(id, username, passwordHash, date);

    // Act
    date.setFullYear(2000);

    // Assert
    expect(user.createdAt.toISOString()).toBe('2026-11-11T12:00:00.000Z');
  });
});
