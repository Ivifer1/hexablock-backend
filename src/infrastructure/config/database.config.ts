// Reads the database connection string from the environment (never from code).
// Fails at startup with a clear message instead of an obscure driver error later.
export function readDatabaseUri(
  env: Readonly<Record<string, string | undefined>>,
): string {
  const uri = env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }
  return uri;
}
