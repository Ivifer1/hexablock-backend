# Requirements catalog — backend

Status: Draft — extracted with AI from the brief ("Enunciado Proyecto Semestral HexaBlock Suite v1.0", 2026-10-23).
**The team must review it** before using it as source of truth. IDs are stable and never reused.
The client repo has its own catalog; cross-repo references use `client:FR-###`.

## Functional requirements
| ID | Requirement | Brief § |
| --- | --- | --- |
| FR-001 | A user can register with credentials. | 5.2 |
| FR-002 | A registered user can sign in and receives a JWT. | 5.2 |
| FR-003 | An authenticated user can sync their progress; there is exactly one progress entry per user and `gameId`. | 5.2 |
| FR-004 | An authenticated user can read their progress, filtered by `gameId`. | 5.2 |
| FR-005 | An authenticated user can submit a score for a `gameId` (and level, for level-based variants). | 5.2 |
| FR-006 | Signed-in players can read the shared game-wide leaderboard for a `gameId`. | 5.2 |
| FR-007 | Signed-in players can read a level-based leaderboard per `gameId` and level. | 5.2 |
| FR-008 | Clients can get the level definitions of Hexa Fit and Hexa Sort. | 5.2 |
| FR-009 | Level definitions can be created and updated so new levels ship without an app update. | 5.2 |
| FR-010 | The level format is generic: one schema with a common part and a `gameId`-specific section. | 5.2 |

## Non-functional requirements
| ID | Requirement | Brief § |
| --- | --- | --- |
| NFR-001 | The API is documented with Swagger / OpenAPI. | 5.2 |
| NFR-002 | Responses and errors are consistent, with correct HTTP status codes. | 5.2 |
| NFR-003 | Security follows OWASP basics: hashed passwords, validated JWT, no secrets in code, no leaked internals. | 10 |
| NFR-004 | Unit, integration (in-memory database) and e2e tests run in CI on every pull request. | 3.6 |

## Constraints
| ID | Constraint | Brief § |
| --- | --- | --- |
| C-001 | Clean Architecture with 4 layers and the dependency rule pointing inwards. | 3.4 |
| C-002 | Use cases are generic over `gameId`; no duplicated use case per variant. | 3.4 |
| C-003 | SOLID applied and documented with one real example per principle. | 3.2 |
| C-004 | GoF patterns justified and documented. | 3.3 |
| C-005 | At least one AOP aspect at project level without libraries (decorators/proxies over use cases); the planned implementation is in the client, not additional backend aspects. | 3.5 |
| C-006 | Technology: NestJS + TypeScript. | header |
| C-007 | GitHub with protected branches, PRs, Conventional Commits in English. | 2, 6.2 |
| C-008 | README in English with the required sections; `AI_USAGE.md` at the root. | 6, 7 |
| C-009 | Class and layer diagrams in `/docs` (image + editable source). | 4 |

## Recorded decisions and implementation

These facts reconcile previously open questions; they do not change the catalog's formal `Draft` status or approve other draft specifications.

| Topic | Recorded behavior | Reference |
| --- | --- | --- |
| Level writes | JWT and the current stored administrator role are required; public registration creates players | [UC-005](use-cases/UC-005-manage-level-definitions.md), [UC-006](use-cases/UC-006-first-administrator.md) |
| Progress conflicts | Retain maxima for counts and combine completion flags without losing completed progress; an unchanged sync preserves date/revision | [UC-008](use-cases/UC-008-retain-player-progress.md), [UC-009](use-cases/UC-009-read-and-sync-player-progress.md) |
| Scores | One personal best per player and ranking scope; only a higher attempt replaces it and its achievement time | [UC-010](use-cases/UC-010-submit-personal-best-score.md) |
| Leaderboards | Both scopes require a session; return an ordered prefix with limit 1–100 (default 10); exact score/time ties share ranks | [UC-011](use-cases/UC-011-read-leaderboard.md) |
| Persistence | MongoDB with Mongoose; disposable integration/E2E MongoDB via `mongodb-memory-server` | [ADR-0001](../adr/0001-mongodb-with-mongoose.md), [ADR status note](../adr/README.md#implementation-and-formal-status) |
| AOP allocation | No additional custom backend aspects are planned; client AOP must be implemented and demonstrated separately | [Backend scope](../../README.md#aop) |

## Remaining confirmations

- The catalog as a whole and UC-001–UC-003 retain their recorded formal approval states; implementation is not approval.
- ADR-0001 still says `Proposed`; the team must reconcile that formal status with the implemented persistence choice.
- The team has not selected a license. The shared README note records that decision as pending.
- Client AOP completion and final repository diagram exports are not established by this backend documentation update.
