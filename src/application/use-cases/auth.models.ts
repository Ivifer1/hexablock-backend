import { Password } from '../../domain/user/password.js';
import { User } from '../../domain/user/user.js';
import { Username } from '../../domain/user/username.js';
import { AccessToken } from '../ports/token-issuer.js';

// Input of register and login: already valid value objects.
export interface Credentials {
  readonly username: Username;
  readonly password: Password;
}

// Output of register and login: the signed-in user and their token.
export interface AuthResult {
  readonly user: User;
  readonly accessToken: AccessToken;
}
