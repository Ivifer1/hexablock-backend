import { User } from '../../domain/user/user.js';

// Proof of authentication handed to the client, and how long it lasts.
export interface AccessToken {
  readonly token: string;
  readonly expiresInSeconds: number;
}

// Output port: issues the access token of a signed-in user.
export interface ITokenIssuer {
  issueFor(user: User): Promise<AccessToken>;
}
