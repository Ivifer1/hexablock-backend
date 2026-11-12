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
```

| Variable | Required | Meaning |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Secret that signs the access tokens; the app does not start without it |
| `JWT_EXPIRES_IN` | no | Token lifetime in seconds (default `604800`, 7 days) |
| `PORT` | no | HTTP port (default `3000`) |

Every route lives under `/api/v1` except `GET /health`. The full contract is in `docs/specs/api-contract.md`.

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
