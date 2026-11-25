# HexaBlock Suite — Backend

<!-- Badges: CI, coverage, license -->

REST API for HexaBlock Suite: JWT authentication, progress sync per user and `gameId`, leaderboards and level management.

> Work in progress. Sections below are placeholders to be completed as the project evolves.

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

Diagram: TBD (see `/docs`).

## Generic Engine

TBD — generic level schema with a per-`gameId` section.

## Design Patterns

TBD

## SOLID

TBD

## AOP

TBD

## Getting Started

Prerequisites: Node.js 24, npm and a MongoDB server (local or hosted).

```bash
npm install
cp .env.example .env   # then set MONGODB_URI and JWT_SECRET
npm run start:dev   # http://localhost:3000 (set PORT to change it)
curl localhost:3000/health   # {"status":"ok"}
curl -X POST localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"ivifer","password":"correct-horse"}'
curl -X POST localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"ivifer","password":"correct-horse"}'
curl localhost:3000/api/v1/auth/me -H "Authorization: Bearer <accessToken>"
```

| Variable | Required | Meaning |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Secret that signs the access tokens, at least 32 bytes; the app does not start without it |
| `JWT_EXPIRES_IN` | no | Token lifetime in seconds (default `604800`, 7 days; at most `2592000`, 30 days) |
| `PORT` | no | HTTP port (default `3000`) |
| `SWAGGER_ENABLED` | no | Set to `true` to serve API documentation (disabled by default) |

Business routes live under `/api/v1`; the health check is `GET /health`. See the [full API contract](docs/specs/api-contract.md).

### API documentation

Run `SWAGGER_ENABLED=true npm run start:dev`, then open [Swagger UI](http://localhost:3000/docs) or fetch the [OpenAPI JSON](http://localhost:3000/docs-json). If you changed `PORT`, use that port instead.

The reference is generated from the active controllers and lists only the routes implemented in this backend. To try the authenticated route, use **Authorize** with a development JWT. The UI does not persist it across browser sessions. Enable documentation only on an instance intended to expose it: anyone with network access to that instance can read the reference.

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

## Tests

```bash
npm test            # unit and architecture tests (Vitest)
npm run test:e2e    # end-to-end tests against the HTTP API and an in-memory MongoDB
npm run lint        # oxlint, including the layer dependency rule
npm run typecheck
```

E2E tests start one `mongodb-memory-server` instance for the whole run (it downloads a MongoDB binary the first time), so no database needs to be installed to run them.

Tests follow the AAA pattern and are named `should_[expected_result]_when_[condition]`. CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit, e2e and build on every pull request.

## AI Usage

See [AI_USAGE.md](AI_USAGE.md).

## Contributing

- Branch from `main` and open a pull request; direct pushes to `main` are blocked.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) in English:
  `type(scope): lowercase imperative summary`, for example `feat(auth): add login endpoint`.
  Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- commitlint checks every message: locally through a Git `commit-msg` hook (installed by `npm install`)
  and in CI for every commit of a pull request.

## License

TBD
