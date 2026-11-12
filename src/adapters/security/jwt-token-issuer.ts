import { JwtService } from '@nestjs/jwt';
import {
  AccessToken,
  ITokenIssuer,
} from '../../application/ports/token-issuer.js';
import { User } from '../../domain/user/user.js';

// Adapter: the access token is a signed JWT. It carries who the user is
// (sub, username, role) and never the password hash.
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
      { expiresIn: this.expiresInSeconds },
    );
    return { token, expiresInSeconds: this.expiresInSeconds };
  }
}
