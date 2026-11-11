import { DomainError } from '../shared/domain-error.js';
import { ErrorCode } from '../shared/error-code.js';

// Opaque identity of a user. The domain does not care how ids look; the
// repository creates them (IUserRepository.nextId).
export class UserId {
  private constructor(private readonly value: string) {}

  static of(raw: string): UserId {
    if (raw.trim().length === 0) {
      throw new DomainError(ErrorCode.InvalidUserId);
    }
    return new UserId(raw);
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
