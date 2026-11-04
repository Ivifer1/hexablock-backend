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
| FR-006 | Anyone can read the global leaderboard for a `gameId`. | 5.2 |
| FR-007 | For level-based variants, the leaderboard can be read per `gameId` and level. | 5.2 |
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
| C-005 | At least one AOP aspect without libraries (decorators/proxies over use cases). | 3.5 |
| C-006 | Technology: NestJS + TypeScript. | header |
| C-007 | GitHub with protected branches, PRs, Conventional Commits in English. | 2, 6.2 |
| C-008 | README in English with the required sections; `AI_USAGE.md` at the root. | 6, 7 |
| C-009 | Class and layer diagrams in `/docs` (image + editable source). | 4 |

## Open questions (team decides, records an ADR or BR)
- Who may create/update levels: an admin role, a seed script, or any authenticated user?
- Progress sync conflicts: last write wins, or keep the maximum (stars, scores) per level?
- Leaderboard: top N, pagination, one entry per user or every score?
- Database (PostgreSQL, SQLite…) and the in-memory option for integration tests.
