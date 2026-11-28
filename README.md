# HexaBlock Suite — Backend

[![CI](https://github.com/Ivifer1/hexablock-backend/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Ivifer1/hexablock-backend/actions/workflows/ci.yml)
[![Tests: Vitest unit, integration and E2E](https://img.shields.io/badge/tests-Vitest%20unit%20%7C%20integration%20%7C%20E2E-blue)](#tests)
[![License: team approval pending](https://img.shields.io/badge/license-team%20approval%20pending-lightgrey)](#license)

REST API for HexaBlock Suite: JWT authentication, progress sync per user and `gameId`, leaderboards and level management.

Implemented routes and their request/response contracts are documented in the [API contract](docs/specs/api-contract.md).
The [spec dashboard](docs/specs/dashboard.md) distinguishes implementation, verification and specification approval.
See the [extensibility guide](docs/EXTENSIBILITY.md) for implemented extension points and their limits.
Integration into `main` does not imply deployment or production database provisioning.

## Architecture

Clean Architecture with four layers. Source code dependencies only point inwards:

```
src/infrastructure  →  src/adapters  →  src/application  →  src/domain
```

| Folder | Layer | Contains |
|---|---|---|
| `src/domain` | Entities | Users, progress per `gameId`, scores, generic level schema |
| `src/application` | Use Cases | Use cases and the ports they depend on |
| `src/adapters` | Interface Adapters | HTTP controllers, DTOs, mappers, port implementations |
| `src/infrastructure` | Frameworks | NestJS bootstrap, modules (composition root), database, configuration |

The dependency rule is enforced by oxlint (`no-restricted-imports` overrides in `.oxlintrc.json`): an inner layer that imports an outer layer, or `domain` / `application` importing NestJS, Express, Mongoose or the MongoDB driver, fails `npm run lint` and CI. `test/architecture/layer-boundaries.spec.ts` pins that configuration.

Persistence: MongoDB with Mongoose, only in `adapters` and `infrastructure` (see [ADR-0001](docs/adr/0001-mongodb-with-mongoose.md)).

Inner layers also avoid structural coupling in their names: ports and methods state intent (`IProgressRepository.save`), never the mechanism (`insertRow`, `signJwt`). Each layer folder has a README with its rules.

## Backend scope and level extensibility

This repository validates and stores level definitions; it does not run the mobile game engine or implement the client's level Builder.
The [level format](docs/specs/level-format.md) combines common metadata and board cells with a variant-owned section.
Section validators and topology implementations are registered in the composition root rather than selected by variant conditionals in the common workflow.

## Design Patterns

| Pattern | Implemented participants | Why it is used |
| --- | --- | --- |
| Strategy (GoF) | [ILevelSectionValidator](src/domain/level/level-section-validator.ts), [Fit](src/domain/level/fit/hexa-fit-section-validator.ts), [Sort](src/domain/level/sort/hexa-sort-section-validator.ts), [LevelValidator](src/domain/level/level-validator.ts) | Vary section rules behind one validation contract; infrastructure supplies registrations |
| Adapter (GoF) | [JwtTokenIssuer](src/adapters/security/jwt-token-issuer.ts) implements [ITokenIssuer](src/application/ports/token-issuer.ts) around Nest's JwtService | Keep JWT library calls outside application |
| Registry and Strategy | [GameCatalog](src/application/game-catalog.ts), [progress models](src/application/progress/progress-model.ts) | Select independent progress/ranking capabilities from one variant definition |
| Repository and ports/adapters | [IUserRepository](src/application/ports/user-repository.ts), [MongoUserRepository](src/adapters/persistence/mongo/mongo-user.repository.ts) | State business persistence intent inward, implement storage details outward |
| Value object and Data Mapper | [Score](src/domain/score/score.ts), [PersonalBestMapper](src/adapters/persistence/mongo/personal-best.mapper.ts) | Preserve validated business values across stored representations |

Registry, Repository, Value Object and Data Mapper are architectural/domain patterns, not additional GoF claims.
[Construction functions](src/infrastructure/levels/create-level-validator.ts) assemble strategies; they are not proof of GoF Factory Method or the client's per-variant Abstract Factory.

## SOLID

The following are small excerpts of existing code, not new implementation or standalone examples to execute.

| Principle | Concrete evidence | Code excerpt |
| --- | --- | --- |
| Single responsibility | [AuthController](src/adapters/http/auth/auth.controller.ts) maps HTTP; [RegisterUseCase](src/application/use-cases/register.use-case.ts) coordinates ports | `this.registerUser.execute(parseCredentials(body))` |
| Open/closed | [LevelValidator](src/domain/level/level-validator.ts) delegates to registered strategies; the [extension test](test/domain/level/level-section-registry.spec.ts) adds a fake extra game | `validator.registerSection(GameId.of('extra-game'), extra)` |
| Liskov substitution | [Fit](src/domain/level/fit/hexa-fit-section-validator.ts) and [Sort](src/domain/level/sort/hexa-sort-section-validator.ts) satisfy the shared [section contract](src/domain/level/level-section-validator.ts) for their matching sections; the common caller needs no concrete cast | `section.validate(level, topology)` |
| Interface segregation | [Catalog interfaces](src/application/game-catalog.ts) split progress from ranking; [GetLeaderboardUseCase](src/application/use-cases/get-leaderboard.use-case.ts) needs only the [read port](src/application/ports/leaderboard-query.ts), not score-write operations | `constructor(private readonly query: ILeaderboardQuery)` |
| Dependency inversion | [RegisterUseCase](src/application/use-cases/register.use-case.ts) receives repository/hasher/clock/token ports; [AuthModule](src/infrastructure/auth/auth.module.ts) supplies concrete dependencies | `new RegisterUseCase(users, hasher, clock, tokens)` |

Substitution here does not mean Fit validators accept Sort data. Each strategy must honor the common interface for its registered section; [Fit](test/domain/level/hexa-fit-section.spec.ts) and [Sort](test/domain/level/hexa-sort-section.spec.ts) tests exercise those section-specific rules through the common validator.
Open/closed extension permits composition/configuration changes; it does not promise that every future rule or payload shape is a registration-only change.

## AOP

JWT/role guards and the HTTP error filter centralize HTTP-level authentication, authorization and error translation.
No additional custom AOP decorators are planned for this backend. The project-level AOP requirement is assigned to the client implementation and must be demonstrated and documented there; this README does not claim that client work is complete.

## Getting Started

Prerequisites: Node.js 24, npm and an explicitly selected development MongoDB database.

```bash
npm ci
cp .env.example .env
```

Before starting the server, edit `.env`: set `MONGODB_URI` to the intended development database and replace `JWT_SECRET` with your own secret of at least 32 UTF-8 bytes. Never commit `.env`, passwords, connection credentials or tokens.

```bash
npm run start:dev
curl http://localhost:3000/health
# {"status":"ok"}
```

The HTTP port defaults to 3000. A local HTTP address does not guarantee an isolated database: the server uses the configured `MONGODB_URI`, which may point elsewhere.

### Optional authentication walkthrough

Use a disposable development database. Registration creates an actual player in that database; it is not a mock or a pre-seeded account.
There is no documented default player password. Do not use personal credentials or a password reused elsewhere.

1. Enable local Swagger as described below.
2. Send `POST /api/v1/auth/register` using a fictitious development username and a unique development-only password.
3. To sign in again, send the same values to `POST /api/v1/auth/login`.
4. Copy the returned `accessToken` into Swagger's **Authorize** dialog and try `GET /api/v1/auth/me`. Treat that token as a secret.

Both requests accept this shape. The angle-bracket values are placeholders to replace, not a working account or a payload to submit unchanged:

```json
{
  "username": "<fictitious-development-username>",
  "password": "<unique-development-only-password>"
}
```

Choose a username satisfying the constraints in the [API contract](docs/specs/api-contract.md).
Do not put actual credentials in shared examples, screenshots or copied terminal commands.

| Variable | Required | Meaning |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Secret that signs the access tokens, at least 32 bytes; the app does not start without it |
| `JWT_EXPIRES_IN` | no | Token lifetime in seconds (default `604800`, 7 days; at most `2592000`, 30 days) |
| `PORT` | no | HTTP port (default `3000`) |
| `SWAGGER_ENABLED` | no | Set to `true` to serve API documentation (disabled by default) |

Business routes live under `/api/v1`; the health check is `GET /health`. See the [full API contract](docs/specs/api-contract.md).

### Implemented routes

Paths below are relative to `/api/v1`, except `/health`.

| Access | Routes |
| --- | --- |
| Public | `GET /health`, `POST /auth/register`, `POST /auth/login` |
| Public level reads | `GET /levels?gameId=…`, `GET /levels/:id` |
| JWT | `GET /auth/me`, `GET /progress`, `GET /progress/:gameId`, `PUT /progress/:gameId`, `POST /scores`, `GET /leaderboard/:gameId` |
| JWT and current administrator role | `POST /levels`, `PUT /levels/:id`, `DELETE /levels/:id` |

Administrative level writes check the role currently stored for the user, not a potentially stale role claim in the token.
Public registration never grants administrator privileges.

### API documentation

Run `SWAGGER_ENABLED=true npm run start:dev`, then open [Swagger UI](http://localhost:3000/docs) or fetch the [OpenAPI JSON](http://localhost:3000/docs-json). If you changed `PORT`, use that port instead.

The reference is generated from the active controllers and lists only implemented routes. To try authenticated routes, use **Authorize** with a development JWT. The UI does not persist it across browser sessions. Enable documentation only on an instance intended to expose it: anyone with network access to that instance can read the reference.

### Provision the first administrator (UC-006)

Run this once as a database operator. Public registration always creates a player.
Use an explicitly named database in `MONGODB_URI` from your approved secret source;
this command does not load a local `.env` file. The target must have an unsharded
`users` collection with the existing unconditional unique `{ username: 1 }`
index. The command does not provision or modify indexes.

Build the CLI with `npm run build`. Send a single password line (up to 4 KiB,
including its line ending) from a private input stream, never from an argument
or an exported password variable. For example, in zsh or bash, with
`MONGODB_URI` already set to the intended target:

```sh
(
  set +x
  set +a
  unset admin_password || exit 1
  printf 'New administrator password: ' >&2
  IFS= read -rs admin_password || exit 1
  printf '\n' >&2
  printf '%s\n' "$admin_password" | npm run --silent bootstrap:admin -- first_admin
)
```

Only a confirmed insert succeeds (exit 0); malformed input returns 2 and a
prerequisite, conflict or storage failure returns 1. An existing account is
never promoted or overwritten. If the command cannot confirm the outcome,
check the target database before retrying. Sign in using the normal login
endpoint after successful setup.

### Progress storage (UC-008)

Progress uses one document per user and game. Before enabling progress writes,
provision a completed, visible, non-sparse and non-partial unique index on
(userId ascending, gameId ascending) with simple collation in the progress
collection. Keep that index in place while saves are enabled. The application
never creates or changes it. MongoDB must accept the exact index for the write
path's initial read; catalog listing alone is not enough.

`GET /progress`, `GET /progress/:gameId` and `PUT /progress/:gameId` all require JWT authentication.
Synchronization validates variant/level membership and combines progress according to the registered model.
A no-change synchronization preserves its timestamp and revision. Ordinary reads do not provision indexes or require write-readiness checks.

### Scores and leaderboard (UC-010 / UC-011)

`POST /scores` accepts a finished attempt and returns the retained personal best, not necessarily the submitted score.
An equal or lower result preserves the record and achievement time. The player identity comes from the JWT, never the request body.

`GET /leaderboard/:gameId` also requires JWT authentication. It reads the shared ranking, not just the caller's scores.
For level rankings, supply a `levelId` belonging to the game; for game-wide rankings, omit it.
The decimal `limit` is 1–100 and defaults to 10. Higher scores rank first, then earlier achievement times.
Exact score/time ties share competition positions, for example 1, 1, 3.
Entries expose only rank, current username, score and achievement time. A selected invalid record fails the complete read without partial entries.

Provision the score indexes outside request handling:

| Collection | Index | Purpose |
| --- | --- | --- |
| `personal_bests` | Unique `{ gameId: 1, levelId: 1, userId: 1 }`, simple collation | One personal best per ranking and player; required by score writes |
| `personal_bests` | Non-unique `{ gameId: 1, levelId: 1, score: -1, achievedAt: 1, userId: 1 }`, simple collation, name `leaderboard_order` | Supports ordered ranking reads |

Game-wide records store `levelId: null`. The unique score index must be completed, visible, non-sparse and non-partial; MongoDB must accept its exact hint before a write proceeds.
The schema disables automatic collection and index creation. Ranking reads do not create, repair or verify the ordered index.
Hinted disposable-database explain checks show that index can supply the order; they do not prove the unhinted planner always selects it.

Administrative level writes separately require the unique `{ gameId: 1, order: 1 }` index with simple collation.
This quick start does not provision production indexes or run the administrator command against a real database.

## Tests

```bash
npm test            # unit and architecture tests (Vitest)
npm run test:e2e    # end-to-end tests against the HTTP API and an in-memory MongoDB
npm run lint        # oxlint, including the layer dependency rule
npm run typecheck
npm run build
```

E2E tests start one `mongodb-memory-server` instance for the whole run (it downloads a MongoDB binary the first time), so no database needs to be installed to run them.

Tests follow the AAA pattern and are named `should_[expected_result]_when_[condition]`. CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit, e2e and build on every pull request.

## AI Usage

See [AI_USAGE.md](AI_USAGE.md).

## Contributing

- Branch from `main` and open a pull request; direct pushes to `main` are blocked.
- Integrate approved pull requests using merge commits, preserving their individual commits. Do not squash or rebase merge.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) in English:
  `type(scope): lowercase imperative summary`, for example `feat(auth): add login endpoint`.
  Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- commitlint checks every message: locally through a Git `commit-msg` hook (installed by `npm install`)
  and in CI for every commit of a pull request.

## License

Academic project. License decision pending team approval.
