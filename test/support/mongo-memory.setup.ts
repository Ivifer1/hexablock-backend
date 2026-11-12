import { randomUUID } from 'node:crypto';
import { inject } from 'vitest';

// Runs before every e2e/integration test file: the app reads the in-memory
// database URI from configuration, exactly as it reads the real one in
// production. Each test file gets its own database on the shared server, so
// files running in parallel never see or delete each other's data.
const serverUri = inject('mongoUri').replace(/\/?$/, '/');
process.env.MONGODB_URI = `${serverUri}e2e-${randomUUID()}`;
