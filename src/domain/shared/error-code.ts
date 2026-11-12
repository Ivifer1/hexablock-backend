// Stable codes for broken domain rules. The HTTP layer turns each code into
// a status and a message, so the domain never holds user-facing text.
export enum ErrorCode {
  InvalidUserId = 'INVALID_USER_ID',
  InvalidUsername = 'INVALID_USERNAME',
  InvalidPasswordHash = 'INVALID_PASSWORD_HASH',
  InvalidPassword = 'INVALID_PASSWORD',
  UsernameTaken = 'USERNAME_TAKEN',
  InvalidCredentials = 'INVALID_CREDENTIALS',
  AuthenticationRequired = 'AUTHENTICATION_REQUIRED',
}
