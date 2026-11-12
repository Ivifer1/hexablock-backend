// Runs in every e2e test worker: a fixed signing secret for tests only.
// Production reads JWT_SECRET from the real environment.
process.env.JWT_SECRET = 'test-only-secret';
