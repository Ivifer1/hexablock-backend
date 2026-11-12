import { AccessToken } from '../../../application/ports/token-issuer.js';
import { User } from '../../../domain/user/user.js';

// A user as the API shows it (GET /auth/me and inside register/login). The
// password hash is never part of it.
export interface UserResponse {
  readonly id: string;
  readonly username: string;
  readonly role: string;
}

// Response of register and login (API contract, section Auth).
export interface AuthResponse {
  readonly user: UserResponse;
  readonly accessToken: string;
  readonly expiresIn: number;
}

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id.toString(),
    username: user.username.toString(),
    role: user.role,
  };
}

export function toAuthResponse(
  user: User,
  accessToken: AccessToken,
): AuthResponse {
  return {
    user: toUserResponse(user),
    accessToken: accessToken.token,
    expiresIn: accessToken.expiresInSeconds,
  };
}
