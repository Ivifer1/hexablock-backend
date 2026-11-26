# Layer 3 — Interface Adapters

Translate between external representations and the application/domain, and implement the application's external-operation ports.

## Current responsibilities

| Folder | Examples | Responsibility |
| --- | --- | --- |
| `http/` | Auth, level, progress, score and leaderboard controllers; request/response mappers | Decode and validate HTTP input, call use cases and serialize public output |
| `http/auth/` | `JwtAuthGuard`, `RolesGuard`, `CurrentUser` | Verify sessions and current stored administrator roles at the HTTP boundary |
| `http/` | `HttpErrorFilter`, `RequestValidationError`, OpenAPI schemas, exact JSON number handling | Translate failures, document routes and preserve numeric validation at decoding boundaries |
| `persistence/mongo/` | User, level, progress and personal-best repositories; schemas and mappers | Implement storage contracts without exposing Mongo representations inward |
| `persistence/mongo/` | `MongoLeaderboardQuery` | Read an ordered limited prefix, then resolve current public usernames; reject a failed projection without partial results |
| `levels/` | Section payload/value readers | Decode external level-section data without moving transport representations into domain |
| `security/` | `JwtTokenIssuer`, `ScryptPasswordHasher` | Implement token and password-hashing ports |
| `system/` | `SystemClock` | Implement the clock port |

## Dependency and boundary rules

- Depend on application/domain and permitted framework packages, never infrastructure.
- Technical names such as `MongoProgressRepository` and `JwtTokenIssuer` belong here, not in the inner layers.
- Reconstruct validated domain values through mappers. Keep request DTOs, stored documents, status codes, Mongoose schemas and driver details at this boundary.
- JWT guards protect progress, scores and both leaderboard scopes; public level reads remain public. Administrative level writes additionally check the current stored role.
- Store progress and personal bests separately. Conditional writes, concurrency handling and confirmation checks are persistence details, not HTTP-controller responsibilities.
- Do not provision collections or indexes from progress/score request handling or leaderboard reads. Readiness checks for writes are not index creation.
- Never project password hashes, tokens, roles or internal user IDs into public leaderboard entries.

## Verification

Adapter tests live in [`test/adapters`](../../test/adapters); HTTP boundary tests also live at the root of `test/`.
Use disposable MongoDB for persistence/integration verification, not a live database. Test commands are in the [root README](../../README.md#tests).
