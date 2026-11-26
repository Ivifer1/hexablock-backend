# Change record: docs/leaderboard-57

Status: APPROVED
<!-- Only a human changes this line to "Status: APPROVED". -->
Author(s): Ivifer Pita
Date: 2026-11-26

## Spec and traceability

- Issue #57, [approved UC-011](../../specs/use-cases/UC-011-read-leaderboard.md), BR-011-1–6, FR-006/007 and NFR-001/002.
- UC-010 (#56) retains the personal best and its achievement time. This query does not create or update scores, progress or levels.

## Problem

A signed-in player needs the highest personal bests for one variant or level. Both routes of access use the same endpoint and ranking rules. Two records with the same score and stored time must share a position.

## Proposed design

| Type | Kind and layer | Responsibility |
| --- | --- | --- |
| `ILeaderboardQuery`, `LeaderboardCandidate` | Read port and projection, application | Return a bounded, ordered prefix for one `RankingScope`; expose only `Username`, `Score` and `AchievedAt`. |
| `GetLeaderboardUseCase` | Use case, application | Resolve scope, validate level membership, read entries and assign competition ranks. |
| `LeaderboardController` and request/response mappers | HTTP adapters | Authenticate, validate query strings, map the result and document it in Swagger. |
| `MongoLeaderboardQuery` | Persistence adapter | Read ordered #56 records, then look up the selected players' usernames. |
| `LeaderboardModule` | Composition root, infrastructure | Bind the query port, shared ranking catalog, level lookup and JWT guard. |

### HTTP and scope

`GET /api/v1/leaderboard/{gameId}` requires the existing JWT guard for both scopes. The ranking is shared, not filtered to the requester, and needs no role check. Resolve the ranking mode from the same registration used by #56. Progress and ranking remain independent capabilities. Reuse a shared scope resolver if #56 provides one; do not copy a variant list or depend on the score writer.

Accept `limit` as a single decimal integer in 1–100, default 10 only when omitted. A per-level ranking requires a level belonging to the requested variant; a variant-wide ranking forbids it. Reuse the narrow level lookup. Proposed query edge behavior: reject blank or repeated scalars and undocumented parameters; allow leading zeroes in decimal limits; parse syntax before scope validation. A malformed game identifier is a proposed `400`; a valid but unregistered identifier is `404`. Missing or wrong-game levels in a per-level request return `400`. Missing, invalid or expired sessions return `401`; failed reads return the standard `500` without partial results.

Return `200` with `gameId`, `levelId` only for per-level rankings, and `entries` (empty when there are no records). Each entry has `rank`, `username`, `score` and UTC `achievedAt`. Document bearer security, query constraints, both response shapes and the errors in Swagger. No change to POST /scores or the public level routes.

### Read, then rank

1. Match the exact #56 scope on the existing collection, including an explicit stored null level for variant-wide records if #56 retains that representation. Sort by descending score, ascending achievement time and ascending internal user ID. The internal ID stabilizes the displayed prefix when a tie falls at the limit; it never assigns a better rank.
2. Apply the requested limit before looking up usernames. Join only the selected records to users and project only the current username from the user record. Never return credentials, roles or internal IDs. Proposed failure policy: if a selected record cannot resolve a valid username or has invalid persisted data, return the generic server error rather than silently filling the list with lower results.
3. Assign ranks in the use case using score and stored time only: when either value changes, use the current one-based position; otherwise reuse the previous rank. Example: two players tied at 120 with the same time followed by a player at 90 produce 1, 1, 3. If the limit cuts the tie, return only the bounded prefix.
4. Retain #56's uniqueness index. Propose a separate ordered index on scope, score descending, achievement time ascending and user ID ascending. Verify the plan for both scopes against the eventual #56 schema and disposable data. Provision outside request handling; the query never creates or modifies collections or indexes.

## Clean Architecture

- HTTP and Mongo adapters depend on application ports/models and domain values, never the reverse. The module supplies concrete dependencies.
- Reuse the #56 score domain and the existing level lookup. No game-engine generics are needed.
- The verified #54 baseline already has JWT and string user IDs; local #55 exports the level lookup and local #56 defines the score domain. Neither local branch is an integrated dependency. Reconcile shared registration, storage and index provisioning before changing source.

## SOLID

- **SRP:** The use case assigns ranks, the query adapter reads and projects, and the HTTP mapper serializes.
- **OCP:** Adding a variant of an existing ranking mode changes its registration, not the ranking workflow.
- **ISP/DIP:** The use case depends on narrow read, catalog and level lookup contracts. It does not call the score writer or MongoDB.
- **LSP:** Fakes and Mongo must return the same bounded ordering and failure semantics.

## Design patterns

| Pattern | Participants | Reason |
| --- | --- | --- |
| Registry | Composition registration and ranking catalog | One variant definition, no switches or duplicated game lists. |
| Port and Adapter | `ILeaderboardQuery` and `MongoLeaderboardQuery` | Keeps database details outside ranking policy and avoids a separate user query for each result. |

## Extensibility and infrastructure independence

A fifth variant using an existing ranking mode adds a registration and, if necessary, a level binding. The use case, controller, query and index definition do not need variant-specific changes. Swapping storage changes the query adapter and composition only.

## Alternatives considered

Assigning ranks with a Mongo window function would tie the business rule to MongoDB. Application ranking over at most 100 ordered rows keeps the rule testable without loading the whole leaderboard. Joining usernames after limiting avoids storing duplicate or stale display names in score records. Defer caching: this read is bounded and no freshness or invalidation policy has been agreed.

## Test plan

| Scenario | Proposed tests | Level |
| --- | --- | --- |
| BR-011-4/6 | `should_rank_earlier_first_when_scores_match`, `should_skip_positions_when_score_and_time_tie` | Unit |
| BR-011-2/3/5 | `should_isolate_rankings_when_reading_scores`, `should_return_a_stable_prefix_when_limit_splits_a_tie` | Integration |
| A1–A3 and E1–E3 | `should_enforce_session_scope_and_limit_when_querying_rankings`, `should_return_empty_entries_when_a_valid_scope_has_no_scores` | E2E |
| Projection and E4 | `should_expose_only_public_entry_fields_when_reading_rankings`, `should_return_a_server_error_without_partial_entries_when_the_read_fails` | Integration/E2E |

Exercise limits 1/10/100 and invalid limits, both authenticated scopes, unknown game and mismatched level, Swagger, and unchanged persisted state. Observe RED on applicable scenarios before implementation. Check the query plan on isolated MongoDB, never a live database.

## Open questions for the team

- Confirm the proposed query parsing and precedence when multiple inputs are invalid.
- Confirm the current-username projection, fail-whole handling for a missing username and a stable prefix when the limit cuts an exact tie.
- Reconcile the integrated #55/#56 baseline before selecting the final field mapping and provisioning the read index.

## Implementation notes

Implemented locally on the integrated #56 baseline. Mongo candidates are ordered and limited before public username resolution. The application assigns competition ranks; a separate scope use case validates catalog and level membership without modifying POST /scores. HTTP uses the existing JWT guard and rejects undocumented, repeated or blank query scalars. No cache, dependencies or live database operations were added.

## Verification

Observed HTTP RED for the absent route (23 cases), then GREEN. Full checks: 262 unit/architecture, 233 integration/E2E, typecheck, lint (three pre-existing warnings), build. Independent verifier ran HTTP/OpenAPI (35 tests), no blockers. Mongo slice reviewed and acknowledged; HTTP native review pending. Unhinted planner choice and command-level no-write monitoring remain unverified; hinted plans for both scopes avoid blocking SORT.

## AI usage

_(pending dedicated project disclosure)_
