import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // One in-memory MongoDB for the whole run; each worker gets its URI.
    globalSetup: ['./test/support/mongo-memory.global-setup.ts'],
    setupFiles: ['./test/support/mongo-memory.setup.ts'],
  },
});
