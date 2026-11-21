# Change record: feat/public-level-endpoints

Status: APPROVED
<!-- Only a human changes this line to "Status: APPROVED" (hooks block the agent from doing it). -->
Author(s): Ivifer1
Date: 2026-11-21
Base: `5ddb8c6`

## Spec and traceability

- Issue: [#31](https://github.com/Ivifer1/hexablock-backend/issues/31)
- Approved use case: [UC-004](../../specs/use-cases/UC-004-read-public-levels.md); BR-004-1 through BR-004-3
- Requirements: FR-008, FR-010, NFR-002, NFR-004
- Contracts: [API](../../specs/api-contract.md#levels) and [level format](../../specs/level-format.md)

## Problem

Players cannot load definitions before sign-in because neither public read route is wired. The persistence adapter
already provides game-scoped ordered reads and lookup by ID. The HTTP boundary must distinguish unsupported games
from empty catalogues and must not expose the storage representation.

## Proposed design

| Type or component | Layer | Responsibility |
| --- | --- | --- |
| `LevelValidator.assertSupportsLevels(GameId)` | Domain | Delegate to the existing section registry and reject unsupported games via its existing `UnknownGame` error. |
| `ListLevelsUseCase` | Application | Check capability before reading; return the repository's ordered collection, including an empty collection. |
| `GetLevelUseCase` | Application | Read one level by `LevelId`; translate an absent repository result into `LevelNotFound`. |
| `LevelsController` | HTTP adapter | Expose the two public GET routes, parse inputs at the boundary, and delegate each route to its use case. |
| `LevelResponseMapper` and section encoders | Adapters | Project common fields and one registered section into the documented JSON shape. |
| `LevelsModule` | Infrastructure | Wire the Mongoose model, the repository, the configured capability registry, section encoders and use cases. |

**HTTP behavior.** Missing or malformed `gameId` uses the existing request-validation envelope (400).
An unknown game or one without registered level support gets 404 without querying MongoDB. A supported game with
no stored levels returns `{ "items": [] }` with 200. In the lookup route, only `InvalidLevelId` raised while
parsing the path parameter is translated to `LevelNotFound`; a missing row produces the same response. Do not
globally turn `InvalidLevelId` into 404. Map `UnknownGame` and `LevelNotFound` in the existing error filter.
Unrelated errors still use the existing unexpected-error path.

**Response mapping.** Return only `schemaVersion`, `id`, `gameId`, `order`, `name`, `board`, and the
field named by the registered section key. Extract the existing pure Fit and Sort outbound payload conversions into
storage-neutral adapter functions. Both HTTP and the existing Mongo section mappers reuse them; each boundary owns
its envelope. Preserve optional Sort seed omission versus `seed: 0`. Do not expose `_id` or Mongo's
`section.key/payload`, and do not call the Mongo document mapper from HTTP.

**Composition.** Use the same configured `LevelValidator` instance in the repository factory and list use case.
Register a module-local clone of `LevelSchema` with `autoCreate: false` and `autoIndex: false`, so exposing
reads does not trigger collection or index creation at startup. Keep the original schema, deployment settings and
uniqueness rules unchanged. The admin-write work in #32 must deliberately ensure index readiness.

## Clean Architecture

- Infrastructure composes the adapters and use cases. The controller calls application use cases, which depend on
  the domain and existing `ILevelRepository`, not on NestJS or Mongoose.
- Both adapters can consume plain payload encoders; HTTP does not import Mongo or its storage schema.
- Input primitives and response JSON stay at the adapter boundary. The domain continues to use value objects.

## SOLID

- **SRP:** the controller handles HTTP, the use cases coordinate reads, and the response mapper controls exposure.
- **OCP:** the existing section registry decides level support; section encoders are registered by `GameId`
  using value equality. Adding a level variant does not change the controller or use cases.
- **DIP:** the use cases depend on the existing repository port, which remains implemented by the Mongo adapter.

## Design patterns

| Pattern | Participants | Why |
| --- | --- | --- |
| Repository | `ILevelRepository`, `MongoLevelRepository` | Reuse already-verified read operations without importing persistence into application. |
| Strategy | Variant section encoders, response mapper, composition registry | Reuse the variant-specific payload conversion without branching in the common mapper. |

## Extensibility and infrastructure independence

A new level variant supplies its section validator/encoder and composition registrations. A new topology still
uses the documented coordinate arrays and topology ID; no HTTP geometry-specific branch is needed. A different
database only needs another repository implementation and composition binding.

## Alternatives considered

- Inferring support from an empty query result is simpler but confuses a valid empty catalogue with an unsupported
  game. A separate catalogue of all games is broader than #31; reuse the section registry instead.
- Returning Mongo documents directly saves a mapper but couples clients to storage and exposes internal fields.
  Separate the envelopes while sharing the pure payload encoders.
- Registering the original schema directly is less configuration, but can perform database writes at startup.
  Restrict automatic creation and indexing to the relevant write-side composition in #32.

## Test plan

| Contract | Verification |
| --- | --- |
| Public reads and wire format | E2E without a token; fixtures for Fit and Sort; assert filtered ascending order, full response shape, no storage fields, and omitted vs zero seed. |
| List status boundaries | E2E for missing/malformed `gameId` (400), unknown and non-level variants (404), and supported empty game (200). |
| Single-level status | E2E for a found level (200), malformed ID (404), and missing ID (404). |
| Application boundaries | Unit tests prove unsupported games skip the repository and unexpected repository failures propagate rather than becoming 404. |
| Storage and startup regressions | E2E with isolated MongoDB verifies no automatic level collection/index creation at boot; existing #30 tests protect persisted shape and constraints. |

Observe RED before implementation. Then run the focused tests, `npm test`, `npm run test:e2e`,
`npm run typecheck`, `npm run lint`, and `npm run build`. E2E uses isolated MongoDB, never a deployed database.

## Open questions for the team

No unresolved HTTP behavior from UC-004. Review the proposed startup behavior and deferral of index readiness to
#32 before approving the design.

## Non-goals

No write endpoints, admin guards, new variants/topologies, dependencies, deployed database operations, or Swagger
bootstrap (#21). The two existing GET response contracts remain unchanged.

## Implementation notes

The human approved UC-004 and this proposal before source edits. Use cases read via the existing port,
the controller maps expected errors at the HTTP boundary, and the response mapper exposes only the documented
fields. Fit and Sort payload conversion is shared with Mongo without sharing either envelope.
The model uses the read-only schema clone; no deployed database, admin routes, or Swagger setup changed.

## Verification

- RED: 13 HTTP tests failed before routes were wired; focused unit tests initially could not resolve the new cases.
- GREEN: 233 unit/architecture and 60 integration/E2E tests passed. Typecheck, lint and build passed.
- Compatibility: the baseline passed 35 focused auth, error-envelope, and Mongo level tests; those same tests
  passed in the candidate full suite. Existing #30 uniqueness and persisted payload coverage passed.
- Independent static design check found no blockers. Its additional empty/non-scalar query and unchanged-data
  probes were run in the focused E2E test and passed.
- Five isolated mutations were detected: capability bypass, malformed-ID translation, startup creation,
  Sort seed zero, and ascending order. All mutations were made outside the working tree.
- Local UML B1, B2, B4 and B6 updated; the other 18 tabs are unchanged. No shared file or remote changed.

## AI usage

Recorded separately in `AI_USAGE.md`.
