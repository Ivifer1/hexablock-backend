import { AccessToken } from '../../../application/ports/token-issuer.js';
import { User } from '../../../domain/user/user.js';

// Response of register and login (API contract, section Auth). The password
// hash is never part of it.
export interface AuthResponse {
  readonly user: {
    readonly id: string;
    readonly username: string;
    readonly role: string;
  };
  readonly accessToken: string;
  readonly expiresIn: number;
}

export function toAuthResponse(
  user: User,
  accessToken: AccessToken,
): AuthResponse {
  return {
    user: {
      id: user.id.toString(),
      username: user.username.toString(),
      role: user.role,
    },
    accessToken: accessToken.token,
    expiresIn: accessToken.expiresInSeconds,
  };
}
