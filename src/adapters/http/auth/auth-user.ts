// Who a valid access token identifies, as the HTTP layer sees it.
export interface AuthUser {
  readonly id: string;
  readonly role: string;
}
