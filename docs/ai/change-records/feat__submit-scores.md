# Change record: feat/submit-scores

Status: APPROVED
<!-- Only a human changes this line to "Status: APPROVED". -->
Author(s): Ivifer Pita
Date: 2026-11-25

## Spec and traceability

- Issue #56, approved [UC-010](../../specs/use-cases/UC-010-submit-personal-best-score.md), BR-010-1 through BR-010-6.
- Requirements: FR-005, NFR-001, NFR-002 and NFR-004; approved score submission rule.
- Scope: submit one attempt and return the retained best for that player and ranking. No ranking reads (#57), game replay, progress synchronization, catalog changes, deployment or live data.

## Problem

The client needs to submit a finished attempt and receive the current personal best. If requests overlap, only a request that actually creates or improves the record may report `personalBest: true`. A slower write must not replace a better result.

## Proposed design

Use one route, one use case and one collection for all variants. Resolve whether the ranking is per game or per level from registered variant metadata. The retention rule is the same for every ranking: strictly higher wins.

| Type | Kind | Layer | Responsibility |
| --- | --- | --- | --- |
| `Score`, `RankingScope`, `AchievedAt` | Value objects | Domain | Model a valid score, the game with an optional level, and an immutable server time; reuse `UserId`, `GameId`, `LevelId` and `Optional`. |
| `PersonalBest` | Entity | Domain | Bind one player and ranking to their highest retained score and its achievement time. |
| `IGameRankingCatalog` | Input-side lookup port | Application | Resolve the ranking mode from a registered game; keep game names out of use-case logic. |
| `IPersonalBestRepository` | Output port | Application | Atomically retain an attempt and return the confirmed record and whether this operation changed it. |
| `SubmitScoreUseCase`, input and result | Use case and models | Application | Resolve the ranking, validate level membership and save for the signed-in player; use only `Pick<ILevelRepository, 'findById'>`. |
| `ScoresController` and request/response mappers | HTTP adapters | Adapters | Reuse JWT, parse the closed request, map the result and existing error shapes, and publish Swagger metadata. |
| `MongoPersonalBestRepository`, mapper and document | Persistence adapter | Adapters | Map records and guarantee one record per player/ranking through checked insert and guarded update. |
| `ScoresModule` | Composition root | Infrastructure | Bind existing ports, the clock and the Mongo adapter. |

### HTTP contract

Bearer auth identifies the player through `JwtAuthGuard` and `@CurrentUser()`. The body only accepts `gameId`, `score` and optional `levelId`; identity and time are never accepted from the client.

| Ranking | Request | Example `201` response |
| --- | --- | --- |
| By game | `{ "gameId": "hexa-lines", "score": 0 }` | `{ "gameId": "hexa-lines", "score": 0, "personalBest": true }`, if first submission. |
| By level | `{ "gameId": "hexa-fit", "levelId": "fit-001", "score": 80 }` | `{ "gameId": "hexa-fit", "levelId": "fit-001", "score": 120, "personalBest": false }`, if the retained score is 120. |

- Require a level belonging to the requested game for Fit and Sort; omit it in requests and responses for variant-wide rankings. Use one existing level lookup when a level is required; treat missing and wrong-game levels as invalid membership.
- Validate values without coercion. Propose exact nonnegative safe integers at the HTTP boundary, rejection of null for level ID and score, and rejection of undocumented fields. The game calculates the attempt; the server checks eligibility and values, not the history of the moves.
- Keep `401` for invalid or missing sessions, `404 Game not found` for an unregistered well-formed game, and the existing `400` validation envelope for malformed fields or invalid membership. Malformed JSON, oversized bodies and unexpected failures retain the existing `400/413/500` handling.
- Add Swagger for this POST only: bearer security, closed request/response schemas, both ranking shapes, numeric bound and applicable errors. Keep the API contract synchronized with the implementation; do not add leaderboard reads.

### Storage and concurrent attempts

1. Require a usable unique `{ gameId: 1, levelId: 1, userId: 1 }` index with simple collation. The adapter stores `levelId: null` explicitly for a variant-wide ranking. Do not create the collection or index automatically. Before writing, establish both the index definition and its usability by a primary read using the exact index hint.
2. Insert a first result, including zero, and return `true` only on acknowledgement. Retry only a confirmed duplicate on the requested key, not a different duplicate or an uncertain write.
3. If the existing score is equal or higher, return it without changing its achievement time or writing. For a higher score, condition the update on the key, document identity and exact prior score. Store score and timestamp together. Sample the server clock on an attempted insert or improvement, not on a no-op. The score only increases, so the old score is sufficient as the compare-and-set guard.
4. After a confirmed mismatch, reread and recompute with a bounded retry budget. An unconfirmed write or exhausted contention is a failure, not a success. The returned flag describes this submission's confirmed operation, not a later reread after another request may have improved the record.

### Baseline boundary

The #56 worktree starts at `2943491`. The JWT guard and level lookup already exist. The existing auth module does not export the clock and the levels module does not export the repository token. The local #55 candidate exports these and contains a variant registry and exact JSON-number validation; it has not been integrated. Before changing source, reconcile the baseline and plan one shared registration and number boundary rather than duplicating variant definitions or silently importing an unintegrated branch. Do not couple scores to progress use cases or storage.

### Shared variant registration decision

Register each game once in backend composition. Its definition records progress behavior and ranking scope separately; never infer one from the other. The progress use cases read the progress capability. The score and leaderboard use cases read only ranking scope through their narrow contract. Keep these use cases and their repositories separate from one another and from the client engine.

Once #55 has an integrated baseline, move exact JSON-number validation into one shared HTTP component that supports both progress fields and the submitted score. Preserve existing HTTP results. This decision does not authorize importing #55's unintegrated work or adding a second game registry while it is unresolved.

## Clean Architecture and SOLID

- HTTP adapter → application use case and ports → domain. The Mongo adapter implements the writer port using the existing clock port. Composition owns concrete bindings and variant data.
- **SRP:** separate HTTP decoding, ranking eligibility, retention rules and Mongo concurrency. **OCP:** adding a game with one of the existing ranking modes changes registration, not the use case or collection. **ISP/DIP:** expose level lookup and best-score write intent, not storage or another feature's read API. **LSP:** a fake and a real writer must agree on retention and change attribution.
- No board, move or state generic applies; the API receives a result, not game state.

## Design patterns and alternatives

| Pattern | Participants | Trade-off |
| --- | --- | --- |
| Registry | Ranking catalog and composition registrations | Avoid variant switches without introducing a Strategy class for each identical retention rule. |
| Repository and Adapter | Writer port and Mongo implementation | A read and unconditional write is simpler but unsafe under overlap. The guarded write costs an extra round trip when a record must be inspected. |
| Conditional update | Exact old score and document identity | An update pipeline could save a round trip but would repeat score comparison in database expressions and complicate confirming which request improved the record. |

Do not create one collection per variant. A fifth variant using an existing mode registers metadata (and levels if applicable); the controller, use case, schemas and key remain unchanged. A new storage adapter implements the same result and atomicity guarantees.

## Test plan

| Spec | Expected proof |
| --- | --- |
| First and improved score | First zero accepted; higher score changes both value and date. |
| Equal/lower score | Returns the retained best and `false` without writing or changing the date. |
| Isolation and overlap | Per-player/game/level records stay independent; concurrent attempts keep the highest score and report truthful flags. |
| Index and acknowledgement | Missing or unusable index prevents writes; only confirmed key collision/miss can retry; uncertain outcome is never returned as success. |
| HTTP and Swagger | 201 shape on both scopes; authentication, score validation and membership errors; generated POST docs; existing routes unchanged. |

Use a fake clock, deterministic overlap probes and in-memory MongoDB. Observe targeted REDs before implementing. Run focused tests, full unit/architecture and integration/E2E, typecheck, lint and build. Compare compiled HTTP and OpenAPI if shared parsing or wiring changes.

## Open questions for the team

- Review edge conventions: reject undocumented fields and explicit nulls; malformed game ID field is `400`, well-formed unregistered ID is `404`. The exact safe-integer limit is an API interoperability boundary, not a limit on gameplay rules.
- Validate level membership at submission time. No cross-collection transaction or retrospective cleanup of old records is proposed.
- Confirm the shared-code baseline before implementing. Approval of this design is not authorization to merge #54, #55 or copy their working trees.

## Implementation notes

T2a implements the independent domain. The integration worktree carries that slice on the merged progress baseline (60f1eaf).

T2b implements the guarded writer in the separate `personal_bests` collection. It requires the approved unique index, verifies a primary read with its exact hint, and records the score and server time in the same confirmed update. Reads and writes outside the score repository are unchanged. The application and HTTP wiring remain pending.

## Verification

T2a: 8 focused and 241 unit/architecture tests; two isolated mutations detected. Typecheck, lint and build passed. No MongoDB or HTTP suite executed for this slice.

T2b: 18 focused repository cases and 181 integration/E2E tests excluding the intentionally red score endpoint file; 257 unit/architecture tests, typecheck, lint and build pass. The independent verifier found no structural blocker and supplied two deterministic overlap and acknowledgement probes executed locally. No production data or index was touched.

## AI usage

_(pending implementation-stage recording in the dedicated disclosure records)_
