import { inject } from 'vitest';

// Runs in every test worker: the app reads the in-memory database URI from
// configuration, exactly as it reads the real one in production.
process.env.MONGODB_URI = inject('mongoUri');
