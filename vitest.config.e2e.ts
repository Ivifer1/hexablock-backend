import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    // Integration tests (*.int-spec.ts) share the in-memory MongoDB with e2e.
    include: ['**/*.e2e-spec.ts', '**/*.int-spec.ts'],
    // One in-memory MongoDB for the whole run; each worker gets its URI.
    globalSetup: ['./test/support/mongo-memory.global-setup.ts'],
    setupFiles: [
      './test/support/mongo-memory.setup.ts',
      './test/support/auth.setup.ts',
    ],
  },
});
