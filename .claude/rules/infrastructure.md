---
paths:
  - "src/infrastructure/**"
---
# Frameworks & Infrastructure layer

Contains: `main.ts` bootstrap, NestJS modules as the composition root, database connection and migrations, configuration
loading from environment, Swagger setup.

Rules:
- Modules are the only place that know concrete classes: they bind ports to adapters with `useFactory`/`useClass`,
  build use cases with their ports, and wrap them with AOP decorators.
- The `gameId` strategy registry is assembled here; supporting a new variant = one registration plus new classes.
- Secrets and URLs come from environment variables validated at startup; never hard-coded, never logged.
- Swapping the database means changing this layer and the repository adapters only.
