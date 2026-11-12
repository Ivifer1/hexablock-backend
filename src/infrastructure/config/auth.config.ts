export interface AuthConfig {
  readonly jwtSecret: string;
  readonly jwtExpiresInSeconds: number;
}

const SEVEN_DAYS_IN_SECONDS = 604800;

// Reads the token settings. The secret never lives in code: the app refuses
// to start without it. The lifetime is optional (BR-001-6).
export function readAuthConfig(
  env: Record<string, string | undefined>,
): AuthConfig {
  const jwtSecret = env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not set');
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
  return Number(raw.trim());
}
