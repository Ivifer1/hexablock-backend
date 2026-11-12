export interface AuthConfig {
  readonly jwtSecret: string;
  readonly jwtExpiresInSeconds: number;
}

const SEVEN_DAYS_IN_SECONDS = 604800;
const THIRTY_DAYS_IN_SECONDS = 2592000;
// HS256 needs a key at least as long as its hash: 256 bits (RFC 7518, 3.2).
const MIN_SECRET_BYTES = 32;

// Reads the token settings. The secret never lives in code: the app refuses
// to start without it or with one too short to resist brute force. The
// lifetime is optional (BR-001-6) and capped, so no token is permanent.
export function readAuthConfig(
  env: Record<string, string | undefined>,
): AuthConfig {
  const jwtSecret = env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not set');
  }
  if (Buffer.byteLength(jwtSecret, 'utf8') < MIN_SECRET_BYTES) {
    throw new Error(`JWT_SECRET must have at least ${MIN_SECRET_BYTES} bytes`);
  }
  return {
    jwtSecret,
    jwtExpiresInSeconds: readExpiry(env.JWT_EXPIRES_IN),
  };
}

function readExpiry(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') {
    return SEVEN_DAYS_IN_SECONDS;
  }
  if (!/^[1-9]\d*$/.test(raw.trim())) {
    throw new Error('JWT_EXPIRES_IN must be a positive integer (seconds)');
  }
  const seconds = Number(raw.trim());
  if (!Number.isSafeInteger(seconds) || seconds > THIRTY_DAYS_IN_SECONDS) {
    throw new Error(
      `JWT_EXPIRES_IN must be at most ${THIRTY_DAYS_IN_SECONDS} seconds (30 days)`,
    );
  }
  return seconds;
}
