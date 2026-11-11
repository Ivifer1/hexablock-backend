# Change record: feat/db-mongodb-connection

Status: APPROVED
<!-- Only a human changes this line to "Status: APPROVED" (hooks block the agent from doing it). -->
Author(s): Ivifer1 with Claude Code (Claude Opus 5.5)
Date: 2026-11-10

## Spec and traceability
- Issue: #15 Set up MongoDB connection and in-memory test database
- Decision: ADR-0001 (MongoDB with Mongoose, `mongodb-memory-server` for tests)
- Requirements: NFR-003 (no secrets in code); brief section 3.6 (integration tests on an in-memory database)
- Use cases: none. This is infrastructure that later use cases (UC for register, login, progress…) rely on.

## Problem
The backend has no database connection yet. Issue #16 (user entity and repository) needs a running Mongoose connection,
and its integration tests need an in-memory MongoDB. The connection string must come from configuration, not from code.

## Proposed design
The connection lives only in `infrastructure`. No port is declared because no use case needs the URI: use cases will
depend on repository ports (from #16 on), and only the repository adapters will see Mongoose.

| Type | Kind | Layer | Responsibility (one sentence) |
| --- | --- | --- | --- |
| `readDatabaseUri(env)` | function | infrastructure (`config/database.config.ts`) | Reads `MONGODB_URI` from the environment and fails at startup if it is missing or blank. |
| `DatabaseModule` | NestJS module | infrastructure (`database/database.module.ts`) | Opens the Mongoose connection with `MongooseModule.forRootAsync`, using `readDatabaseUri`. |
| `AppModule` | NestJS module (changed) | infrastructure | Imports `DatabaseModule`. |
| `main.ts` | bootstrap (changed) | infrastructure | Loads a local `.env` file when it exists (`process.loadEnvFile`, built into Node 24; no new package). |
| `.env.example` | config sample | repo root | Documents `MONGODB_URI` and `PORT` without real secrets. |
| `mongo-memory.global-setup.ts` | Vitest global setup | test support | Starts one `MongoMemoryServer` for the e2e run, shares its URI with `provide`, stops it at the end. |
| `mongo-memory.setup.ts` | Vitest setup file | test support | Sets `process.env.MONGODB_URI` in each test worker from `inject('mongoUri')`. |

New dependencies (already chosen by the team in ADR-0001): `mongoose@^9.12.1` and `@nestjs/mongoose@^12.0.1`
(dependencies, peer range of `@nestjs/mongoose` accepts Mongoose 9 and Nest 12), `mongodb-memory-server@^11.3.0` (devDependency).

## Clean Architecture
- Dependencies introduced: `infrastructure → @nestjs/mongoose, mongoose`. Nothing in `domain`, `application` or `adapters` changes.
- Ports: none in this change. Repository ports arrive with #16.
- Wiring: `AppModule` (composition root) imports `DatabaseModule`.
- The existing lint rules already forbid `mongoose`/`mongodb` in `domain` and `application`; this change keeps them untouched.

## SOLID
- **SRP:** `readDatabaseUri` only reads and validates the setting; `DatabaseModule` only opens the connection; `main.ts` only boots.
- **DIP:** use cases will never know the database exists; they will depend on repository ports declared in `application` (#16).

## Design patterns
No new GoF pattern. `DatabaseModule` is part of the composition root, and adding a pattern here would be overdesign.

## Extensibility and infrastructure independence
- A fifth variant does not touch this change: the database connection is variant-agnostic.
- Swapping MongoDB for another database changes `DatabaseModule`, the config function and the repository adapters only.
- Files that would NOT change: everything in `domain/` and `application/`.

## Alternatives considered
- `@nestjs/config` to read env vars: more features (schemas, namespaces), but it adds a dependency for a single variable.
  Node 24 already loads `.env` files, and a plain function is easier to test and explain. We can adopt it later if config grows.
- Reading `process.env.MONGODB_URI` inline in the module: shorter, but a missing value would surface as an obscure Mongoose
  error instead of a clear startup error, and it could not be unit tested.
- Using a real MongoDB in CI (service container): closer to production, but slower and the brief asks for an in-memory database.

## Test plan
| Spec element | Test name | Level |
| --- | --- | --- |
| Connection string comes from configuration | `should_return_uri_when_mongodb_uri_is_set` | unit |
| Missing configuration fails fast | `should_throw_when_mongodb_uri_is_missing` | unit |
| Blank configuration fails fast | `should_throw_when_mongodb_uri_is_blank` | unit |
| App connects to the in-memory database in CI | `should_connect_to_database_when_app_starts` | e2e |
| Previous behaviour still holds | `should_return_ok_status_when_health_is_requested` (existing) | e2e |

## Open questions for the team
1. Integration tests (repository + in-memory DB, from #16 on): run them with the e2e config, or add a third config
   (`*.int-spec.ts`)? This change only wires the in-memory database into the e2e config.
2. `mongodb-memory-server` downloads a MongoDB binary (~100 MB) the first time. In CI we may want to cache it later.

## Implementation notes
Built as proposed. `readDatabaseUri` lives in `src/infrastructure/config/database.config.ts` and accepts any
string record (not only `process.env`) so it is unit-testable without touching the real environment.
`DatabaseModule` is in `src/infrastructure/database/`. `main.ts` loads `.env` only when the file exists, so CI and
production keep using the real environment. README (Getting Started, Tests) and `.env.example` document `MONGODB_URI`.
No deviations from the proposal.

## Verification
- RED first: before `src/` changed, the unit suite failed (module not found) and the e2e connection test failed;
  the in-memory MongoDB already started.
- `npm test`: 24 passed. `npm run test:e2e`: 2 passed (new connection test and the existing `/health` test).
- `npm run lint`, `npm run typecheck`, `npm run build`: clean.
- Rule broken on purpose: replacing the missing-value check with `if (false)` made
  `should_throw_when_mongodb_uri_is_missing` and `should_throw_when_mongodb_uri_is_blank` fail; the check was restored.
- design-reviewer subagent: not available in this session; the diff was reviewed against `.claude/rules/infrastructure.md`.

## AI usage
- Tool and model: Claude Code (Claude Opus 5.5).
- Prompt: "empecemos con la conexión a MongoDB" (let's start with the MongoDB connection), issue #15.
- The AI produced this proposal, the tests, the config function, the module, the e2e setup and the docs updates.
- The team (Ivifer1) reviewed and approved the proposal before any code under `src/` was written.
- Lesson: sharing the in-memory URI through Vitest `provide`/`inject` avoids relying on environment inheritance between workers.
