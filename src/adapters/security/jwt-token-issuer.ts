import { JwtService } from '@nestjs/jwt';
import {
  AccessToken,
  AuthUser,
  ITokenIssuer,
} from '../../application/ports/token-issuer.js';
import { Optional } from '../../domain/shared/optional.js';
import { User } from '../../domain/user/user.js';

// The only algorithm accepted: tokens signed any other way (or unsigned,
// "alg: none") are rejected even if the signature matches.
const ALGORITHM = 'HS256';

// Adapter: the access token is a signed JWT. It carries who the user is
// (sub, username, role) and never the password hash. Signing and verifying
// live together, so the token format is defined in one place.
export class JwtTokenIssuer implements ITokenIssuer {
  constructor(
    private readonly jwt: JwtService,
    private readonly expiresInSeconds: number,
  ) {}

  async issueFor(user: User): Promise<AccessToken> {
    const token = await this.jwt.signAsync(
      {
        sub: user.id.toString(),
        username: user.username.toString(),
        role: user.role,
      },
      { expiresIn: this.expiresInSeconds, algorithm: ALGORITHM },
    );
    return { token, expiresInSeconds: this.expiresInSeconds };
  }

  // BR-003-1: valid signature, HS256 only, not expired. Any bad token is an
  // expected case and gives an empty result, never an exception.
  async verify(token: string): Promise<Optional<AuthUser>> {
    try {
      const payload = await this.jwt.verifyAsync<Record<string, unknown>>(
        token,
        { algorithms: [ALGORITHM] },
      );
      const { sub, role, exp } = payload;
      // Only our own access tokens: a subject that is not blank, a role and
      // an expiry (a token without "exp" would never expire).
      if (
        typeof sub !== 'string' ||
        sub.trim() === '' ||
        typeof role !== 'string' ||
        typeof exp !== 'number'
      ) {
        return Optional.empty();
      }
      return Optional.of({ id: sub, role });
    } catch {
      return Optional.empty();
    }
  }
}
