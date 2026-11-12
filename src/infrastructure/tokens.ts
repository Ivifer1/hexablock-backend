// Injection tokens for the ports. Interfaces do not exist at runtime, so the
// composition root needs a value to say "whoever asks for this port gets
// this adapter".
export const USER_REPOSITORY = Symbol('IUserRepository');
export const PASSWORD_HASHER = Symbol('IPasswordHasher');
export const TOKEN_ISSUER = Symbol('ITokenIssuer');
export const CLOCK = Symbol('IClock');
