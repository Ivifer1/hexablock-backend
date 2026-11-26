# Change record: feat/progress-api

Status: APPROVED
<!-- Only a human changes this line to "Status: APPROVED". -->
Author(s): Ivifer Pita
Date: 2026-11-25

## Spec and traceability

- Issue #55; approved UC-009, BR-009-1 through BR-009-7; FR-003, FR-004, NFR-001, NFR-002, NFR-004 and C-001 through C-004.
- Basis: API contract §Progress, brief §5.2, and UC-008 persistence from #54 (reviewed local tree at `a14b8b8`).
- Scope: authenticated reads and sync of a player's own progress. No level deletion changes, client edits, score submission, leaderboard, deployment or live database operations. Do not publish #55 before #54 is integrated and its exact tree is verified.

## Problem

The repository retains the best progress for each player and variant, but the client has no HTTP operations to read or sync it. The existing merge can advance the timestamp and the repository can replace a record even if all progress values are unchanged. UC-009 requires a server-owned timestamp that does not change on a no-op.

## Proposed design

Use one authenticated controller for all games. Select a progress policy by `GameId`, validate submitted levels, and reuse the approved domain merge and revision-guarded repository from #54.

| Type | Kind | Layer | Responsibility |
| --- | --- | --- | --- |
| `ListPlayerProgressUseCase`, `GetGameProgressUseCase`, `SyncPlayerProgressUseCase` | Use cases | Application | List saved records; read one variant; or validate and retain a new snapshot. |
| `IProgressModel`, `BestScoreProgressModel`, `LevelProgressModel` | Policy strategies | Application | Validate each shape and supply empty defaults; configure the level star limit with `Count`. |
| `IGameProgressCatalog`, `GameProgressCatalog` | Port and registry | Application | Resolve a policy using `GameId` equality from registrations supplied at composition time. |
| `ProgressInput`, `ProgressView` | Input and result types | Application | Carry values without a client-supplied timestamp; represent a missing record without inventing a date. |
| `Progress`, `LevelProgress` | Existing domain types | Domain | Preserve max/OR merging; compare progress by value, independently of its timestamp or level order. |
| `IProgressRepository`, `MongoProgressRepository` | Existing port and adapter | Application / adapters | Retain existing reads; accept validated input without a timestamp and confirm progress values and timestamp together. |
| `ProgressController` and request/response mappers | HTTP adapter | Adapters | Reuse JWT authentication, map HTTP data and observable errors, and call the use cases. |
| `ProgressModule` | Existing composition module | Infrastructure | Wire the controller, use cases, policies, clock and repositories without new infrastructure dependencies. |

### HTTP contract

Reuse `JwtAuthGuard` and `@CurrentUser()`. Only the token identifies the player; no role check or user selector is introduced.

| Operation | Successful response |
| --- | --- |
| `GET /api/v1/progress` | `200 { "items": [...] }` with the player's saved records, or an empty list. No list order guarantee is added. |
| `GET /api/v1/progress/{gameId}` | `200` with saved progress. A known game without a record returns `levels: {}`, `bestScore: 0` for score games or `null` for level games, and `updatedAt: null`. A read never creates a record. |
| `PUT /api/v1/progress/{gameId}` | `200` with the confirmed merged progress. The URL supplies the game; the body supplies only progress fields, not identity or timestamp. |

Both progress shapes share the same routes and response fields. Score games have empty `levels` and a nonnegative integer `bestScore`. Level games have `bestScore: null` and an ID-keyed map of `completed`, `stars` and `bestScore`. Register Lines and Merge with the score policy, Fit with a 0–3 star range and Sort with a zero-star policy. Real game names stay in registrations, not use cases or DTO branches.

The HTTP mapper reads only own level keys and performs no coercion. If level IDs were submitted, the application performs one per-game read through the existing level repository and validates membership before saving. Do not revalidate omitted saved entries or change catalog deletion. This is validation against the catalog observed at read time, not a transaction across the two repositories.

Missing, invalid or expired JWTs return `401`. Unknown games return `404` with a progress-specific error mapping; leave the existing level error unchanged. Invalid bodies or level membership return `400` with the existing field details. Keep existing malformed JSON, oversized body and unexpected error handling (`400`, `413`, `500`). Unconfirmed writes must not report success or promise another write attempt.

Update the API contract and generated Swagger together when implementing the routes. Document bearer security, both request shapes, dynamic level keys, nullable `updatedAt` on empty reads, and applicable error formats. Keep unrelated routes and the Swagger switch unchanged.

### Saved timestamps and concurrent updates

Keep the existing primary read with a confirmed usable unique index, revision predicate, confirmed acknowledgements and bounded retries from #54. Do not change collection fields or provisioning.

1. No stored record: create it with the server clock near the insert. Return it only after confirmation.
2. Existing record: combine the incoming values and that stored snapshot using the existing max/OR logic. If the result contains the same progress values, return the stored snapshot without writing, advancing the timestamp or incrementing the revision.
3. Improved record: request a server timestamp at that write attempt and replace under the existing revision predicate. Return the result only after confirmation. On a revision miss, reread and recompute before deciding whether a new write is needed.

Compare progress inside the guarded save, not after a separate controller read. One device's repeated or older snapshot must not erase improvements from another device or advance the timestamp on its own. A fresh read could observe concurrent later changes; a no-op does not promise to predict them.

## Clean Architecture

- HTTP adapters depend inward on use cases and value types, not Mongo documents.
- Use cases depend on the progress catalog, progress repository and level-read capability through application declarations.
- The Mongo adapter depends on application ports (including the existing clock abstraction) and domain types. Domain has no NestJS, HTTP, storage or clock-service dependencies.
- Compose existing auth and level services in `ProgressModule`; expose only necessary injection tokens. `TCell`, `TMove` and `TState` do not apply to persisted scores and levels.

## SOLID

- **SRP:** mappers own the wire shape, use cases coordinate, the domain merges, and the Mongo adapter handles revision conflicts.
- **OCP/LSP:** score and level policies provide the same input, validation and default contract; a variant using a known policy adds a registration only.
- **ISP/DIP:** sync depends on progress, policy and level-read capabilities; application code has no dependency on concrete storage or authentication libraries.

## Design patterns

| Pattern | Participants | Why |
| --- | --- | --- |
| Strategy and registry | Progress policy implementations and `GameProgressCatalog` | Select the shape by capability without variant name switches in the controller or use cases. |
| Repository and Adapter | Application ports, Mongo repositories, HTTP controller and mappers | Isolate technical details and retain the existing domain merge instead of duplicating it in a Mongo update pipeline. |

## Extensibility and infrastructure independence

A new variant that uses an existing progress model adds a composition registration and, if needed, existing-path level registrations. It does not require edits to the controller, use cases, aggregate merge, repository or schema. A database replacement must preserve the same narrow save and read guarantees.

## Alternatives considered

- The level section validator registry cannot resolve score-only games. Keep one progress registration source rather than using the level validator for a different concern.
- One existing list call per submitted game is simpler than new per-ID calls or projections. It loads complete definitions; introduce a membership projection only if measured cost warrants it.
- A timestamp set before a separate read cannot identify a no-op reliably under contention. Keep that decision within the guarded save rather than duplicating rules outside it.

## Test plan

| Spec element | Example verification | Level |
| --- | --- | --- |
| E1 / BR-009-1 | `should_require_authentication_when_any_progress_route_is_called` | E2E: missing, invalid and expired token |
| A1–A3 | `should_return_model_defaults_without_writing_when_progress_is_absent`; `should_return_only_the_signed_in_players_records_when_two_players_have_progress` | E2E: cover both models, list, known empty game and unknown game |
| E2–E3 / BR-009-2, 3, 5 | `should_reject_progress_when_the_game_or_snapshot_is_invalid` | Unit / E2E: wrong shape, identity or timestamp fields, invalid values and levels outside the game; no mutation |
| BR-009-4, 6 | `should_keep_the_best_fields_when_an_older_snapshot_is_replayed` | E2E: both models, stars independent of score, completed and omitted levels retained, catalog unchanged |
| BR-009-7 | `should_preserve_timestamp_and_revision_when_sync_does_not_improve_progress` | MongoDB integration: fake clock, first save, improved save, repeated save |
| E4 / BR-009-7 | `should_recompute_progress_when_a_competing_save_changes_the_revision`; `should_not_report_success_when_the_save_is_unconfirmed` | MongoDB integration and safe HTTP error check |
| NFR-001, NFR-002 | `should_describe_authenticated_progress_shapes_and_errors_when_openapi_is_enabled` | OpenAPI E2E with exact route inventory |

Run focused RED first, then focused checks, lint, types, unit/architecture tests, integration/E2E and build. Authenticate with isolated test accounts and use in-memory MongoDB. Independently verify authentication and concurrent writes after implementation.

## API details approved with this design

- A malformed or unregistered game ID resolves to `404 Game not found`. Malformed JSON still uses the existing parser error.
- Reject undocumented body fields, including identity, game and timestamp, with the existing `400` validation envelope.
- Scores are nonnegative JavaScript safe integers at the HTTP boundary. Shared `Count` is unchanged.

## Diagram impact

After verified implementation, review B1–B6 for the affected domain types, use cases, ports, HTTP adapter, Mongo save path and module wiring. Do not modify diagrams in this proposal.

## Implementation notes

T1: The port accepts undated progress values, and the Mongo adapter reuses the configured server clock. Value comparison occurs against the current primary read before consuming the clock or attempting a revision replacement; retries recompute after a revision miss. HTTP operations are not implemented in this slice.

T2: Three guarded HTTP operations now share the policy registry. The level repository is consulted only when the submitted snapshot includes levels; submitted IDs outside the game fail before progress is saved. The API contract and generated OpenAPI document the same behavior.

## Verification

T1: five timestamp checks failed as expected before implementation. After implementation and the independently proposed retry-no-op probe, 18 focused MongoDB integration checks, 238 unit/architecture tests, 131 integration/E2E tests, types and build passed. Lint exited zero with the same three warnings as the base. The independent verifier reviewed the guarded write and supplied the additional probe; sandbox restrictions prevented that verifier from running it. The orchestrator executed it in isolated local MongoDB.

T2: 29 HTTP and OpenAPI cases were RED before the routes and schemas existed, then passed. The compiled comparison kept eight existing public HTTP outcomes and all prior OpenAPI content unchanged. Independent design/functional inspection found no blockers; its own executions were blocked by the sandbox. The two resulting boundary probes are included with the public-API tests. Final: 41 focused HTTP/Swagger tests, 238 unit/architecture and 161 integration/E2E. Typecheck, lint (same three pre-existing warnings), and build passed.

## AI usage

Recorded in the root AI_USAGE.md. Ivifer1 approved the use case, design and API details before changes. Local verification and differential comparison used isolated test MongoDB only.
