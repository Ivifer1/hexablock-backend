import { IClock } from '../../src/application/ports/clock.js';
import { IPasswordHasher } from '../../src/application/ports/password-hasher.js';
import {
  AccessToken,
  ITokenIssuer,
} from '../../src/application/ports/token-issuer.js';
import { IUserRepository } from '../../src/application/ports/user-repository.js';
import { Optional } from '../../src/domain/shared/optional.js';
import { Password } from '../../src/domain/user/password.js';
import { PasswordHash } from '../../src/domain/user/password-hash.js';
import { User } from '../../src/domain/user/user.js';
import { UserId } from '../../src/domain/user/user-id.js';
import { Username } from '../../src/domain/user/username.js';

// Hand-written fakes for the application ports, used by use case unit tests.

export class InMemoryUserRepository implements IUserRepository {
  readonly saved: User[] = [];
  private sequence = 0;

  nextId(): UserId {
    this.sequence += 1;
    return UserId.of(`user-${this.sequence}`);
  }

  findById(id: UserId): Promise<Optional<User>> {
    return Promise.resolve(this.find((user) => user.id.equals(id)));
  }

  findByUsername(username: Username): Promise<Optional<User>> {
    return Promise.resolve(
      this.find((user) => user.username.equals(username)),
    );
  }

  save(user: User): Promise<void> {
    this.saved.push(user);
    return Promise.resolve();
  }

  private find(matches: (user: User) => boolean): Optional<User> {
    const user = this.saved.find(matches);
    return user ? Optional.of(user) : Optional.empty();
  }
}

export class FakePasswordHasher implements IPasswordHasher {
  hash(password: Password): Promise<PasswordHash> {
    return Promise.resolve(PasswordHash.of(`hashed:${password.toString()}`));
  }
}

export class FixedClock implements IClock {
  constructor(private readonly instant: Date) {}

  now(): Date {
    return new Date(this.instant.getTime());
  }
}

export class FakeTokenIssuer implements ITokenIssuer {
  issueFor(user: User): Promise<AccessToken> {
    return Promise.resolve({
      token: `token-for-${user.id.toString()}`,
      expiresInSeconds: 604800,
    });
  }
}
