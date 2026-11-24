# Change record: feat/admin-level-endpoints

Status: APPROVED
<!-- Only a human changes this line to "Status: APPROVED" (hooks block the agent from doing it). -->
Author(s): Ivifer1
Date: 2026-11-21
Base: `f5b5e13`

## Spec and traceability

- Issue: [#32](https://github.com/Ivifer1/hexablock-backend/issues/32)
- Use case for joint review: [UC-005](../../specs/use-cases/UC-005-manage-level-definitions.md); BR-005-1 through BR-005-4
- Requirements: FR-009, FR-010, NFR-002, NFR-003, NFR-004
- Contracts: [API](../../specs/api-contract.md#levels) and [level format](../../specs/level-format.md)

## Problem

The repository already creates, replaces, and deletes levels, but the API exposes only reads. The write routes
need request validation, authorization against the current persisted role, consistent error responses, and a
guarantee that the database enforces order uniqueness before any write is attempted.

## Proposed design

| Type or component | Layer | Responsibility |
| --- | --- | --- |
| `AdminLevelsController` | HTTP adapter | Add POST, PUT, and DELETE under the existing levels prefix. Apply both authentication and role guards only to these routes. |
| `RolesGuard` | HTTP adapter | Reload the authenticated subject with the existing current-user use case; allow only the current stored `Role.Admin`. |
| `LevelRequestMapper` | Adapters | Decode unknown input to typed level value objects, select the registered variant section, and translate expected validation errors into the existing request format. |
| `CreateLevelUseCase`, `ReplaceLevelUseCase`, `DeleteLevelUseCase` | Application | Validate each command as needed, require write readiness after input is valid, use the existing repository operation, and translate a missing write target into `LevelNotFound`. |
| `ILevelWriteReadiness` and Mongo adapter | Application port / persistence adapter | Require the actual unfiltered unique compound index `{ gameId: 1, order: 1 }` before a write, without issuing database DDL. |
| `LevelsModule` / `AuthModule` | Infrastructure | Wire the write-side providers and export the existing authenticated-account lookup; preserve the #31 public controller and read configuration. |

### Authentication and authorization

Run `JwtAuthGuard` first, then `RolesGuard`. Use only the authenticated user ID from the JWT to reload the account
through `GetCurrentUserUseCase`. Missing/invalid credentials and deleted accounts produce the existing 401;
a present account without the stored admin role produces 403. Changing the stored role takes effect without
reissuing the token. Do not accept a JWT role claim as authorization. Do not expose the user repository
directly to HTTP or change public GET access.

### Request and response boundaries

Decode the documented common fields and the single section selected by the existing level registry. Extract
storage-neutral Fit/Sort section decoding from the existing mappers instead of duplicating variant rules.
Keep Mongo's document envelope and corrupt-document handling separate. Use the existing level validator for
format rules and reuse `LevelResponseMapper` for POST/PUT responses. The common controller and use cases
do not branch on Fit/Sort.

Translate only input-shape and known domain validation failures at the write boundary to the existing 400 envelope.
An unsupported `gameId` in a submitted definition is a format error; do not change the public list's 404.
A malformed PUT path ID or a path/body mismatch produces 400. An invalid or missing target in DELETE produces 404.
Invalid body data must not reach the repository. Unrelated errors keep the existing generic 500 response.

### Write semantics and readiness

POST uses `create` and returns 201. PUT uses `replace` without upsert, requires matching IDs, and returns 200 or 404.
DELETE uses `delete` and returns an empty 204 or 404. Do not add uniqueness pre-queries: MongoDB already arbitrates
concurrent writes. Both duplicate-ID and occupied-order failures map to 409 with distinct messages.
If one request violates both constraints, do not promise which conflict is reported first.

Retain `autoCreate: false` and `autoIndex: false`. Before each authorized, valid write, read index metadata through
the repository boundary. Verify exact field order and direction, uniqueness, and no partial filter, sparse option,
or collation that changes the required comparison semantics. Do not rely on the index name. Missing, incorrect,
or unreadable index metadata fails closed with the generic infrastructure response (500), without a write; public
GETs remain available. Test provisioning only against isolated MongoDB. No automatic index creation, index removal,
migration, or deployed database action is included. Operators must not change required indexes while writes are enabled.

## Clean Architecture and SOLID

- HTTP owns auth translation and DTOs; application owns command flows, using repository and readiness ports.
- MongoDB and NestJS remain outside domain and application; only composition knows the implementations.
- SRP: authentication, current-role authorization, parsing and persistence readiness have separate purposes.
- OCP: adding a level variant supplies a registered section codec/validator instead of editing the write routes.
- DIP: storage or index inspection can be replaced without touching the use cases.

## Design patterns

| Pattern | Participants | Why |
| --- | --- | --- |
| Repository | `ILevelRepository`, `MongoLevelRepository` | Reuse atomic write operations and duplicate-key translation. |
| Strategy | Registered level section decoders and validators | Validate the selected variant without game-specific controller branches. |

## Alternatives considered

- Trusting the JWT role avoids a lookup but delays demotion until token expiry. Reuse the existing account lookup.
- Checking for duplicate rows before writing gives a friendly early result but cannot enforce uniqueness under
  concurrent writes. Translate the database's protected outcome.
- Building indexes automatically is convenient on a fresh database but introduces boot-time database writes and
  couples public availability to provisioning. Inspect the existing index only before writes.

## Test plan

| Contract | Verification |
| --- | --- |
| Current permissions | E2E with missing/invalid token, stored player, deleted account, demoted admin, and newly promoted account. Assert rejected requests leave stored levels unchanged. |
| Successful writes | E2E with Fit and Sort fixtures, 201 wire format, full replacement without upsert, 204 with no body, and preservation of public GETs. |
| Validation and conflicts | E2E for invalid body/section, unsupported game, malformed/mismatched IDs, missing target, duplicate ID and occupied order on POST and PUT. Same order across different games remains valid. |
| Safe readiness | E2E in isolated MongoDB: missing/wrong unique index prevents writes without disabling GET. Provision matching indexes only in the isolated fixtures. |
| Regression | Run the existing #30 repository and #31 public-read tests along with the full suite. |

Observe RED before implementation. Run the focused tests, `npm test`, `npm run test:e2e`, `npm run typecheck`,
`npm run lint`, and `npm run build`. Use only temporary databases in tests.

## Open questions for the team

The user confirmed 409 for occupied order on POST and PUT. The draft specifies the remaining boundary conventions
and read-only index readiness for review in this proposal; no separate decision is required if both documents are approved.

## Non-goals

No first-admin provisioning (#33), Swagger bootstrap (#21), changes to #31 contracts, new dependencies, new games or
topologies, live database operations, rollout or release.

## Implementation notes

The user approved UC-005 and the design before source edits. Admin routes use JWT authentication followed by a
current-role lookup. The shared neutral section codecs serve HTTP and persistence without sharing their envelopes.
The readiness port checks metadata on the primary immediately before each command, not at boot. The existing
public reads and Mongo write operations keep their contracts. No DDL or deployed storage operations were run.

## Verification

- RED: all 26 new E2E cases failed against the base with valid account fixtures and no admin routes.
- GREEN: 233 unit/architecture and 86 integration/E2E tests. Typecheck, lint, and build passed.
- The baseline passed 51 focused auth, HTTP errors, public level reads, and repository tests; the same checks
  passed in the complete candidate suite.
- Independent static review found no blockers; its validation-before-readiness scenario was added and passed.
- Isolated mutations confirmed coverage for stale JWT role, non-unique and partial indexes, occupied-order
  409, and readiness bypass before POST. The final E2E suite passed again after the extra assertion.
- Local B1–B6 updated and structurally checked; other 16 pages unchanged. No shared file or GitHub state changed.

## AI usage

Recorded in `AI_USAGE.md`.
