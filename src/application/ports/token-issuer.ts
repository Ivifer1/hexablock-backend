import { User } from '../../domain/user/user.js';

// Proof of authentication handed to the client, and how long it lasts.
export interface AccessToken {
  readonly token: string;
  readonly expiresInSeconds: number;
}

// Who a valid access token identifies: the session's user and role. Lives
// next to the port that issues tokens, so adapters that verify tokens (the
// token issuer) and adapters that use the session (the HTTP guard) depend on
// the application layer instead of on each other.
export interface AuthUser {
  readonly id: string;
  readonly role: string;
}

// Output port: issues the access token of a signed-in user.
export interface ITokenIssuer {
  issueFor(user: User): Promise<AccessToken>;
}
