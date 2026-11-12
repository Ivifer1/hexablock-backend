// Runs in every e2e test worker: a fixed signing secret for tests only
// (32 bytes, the minimum the app accepts). Production reads JWT_SECRET from
// the real environment.
process.env.JWT_SECRET = 'test-only-secret-with-32-bytes!!';
