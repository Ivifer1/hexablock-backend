# Change record: feat/progress-persistence

Status: APPROVED
<!-- Only a human changes this line to "Status: APPROVED". -->
Author(s): Ivifer Pita
Date: 2026-11-25

## Spec and traceability
- Issue #54; UC-008, FR-003, FR-004, NFR-004; BR-008-1 through BR-008-4.
- Basis: the project brief §5.2, the Progress section of the API contract, and main 2943491.
- Scope: domain and repository only. No new HTTP routes, authentication changes, catalog, scoring endpoints, deployment, or changes to a real database.

## Problem
Store one progress record per player and game without losing improvements when two devices save concurrently. The existing API contract requires maximum/OR/retention semantics; a read followed by an unconditional write does not guarantee them.

## Proposed design

| Type | Kind | Layer | Responsibility |
| --- | --- | --- | --- |
| Progress | Aggregate | Domain | Immutable player/game progress with two named construction paths and one pure merge. |
| LevelProgress | Value object | Domain | Completion and best values for one level. Reuse LevelId and Count; validate bounded stars. |
| IProgressRepository | Port | Application | Find by pair, list only for one player, and save the best snapshot. |
| MongoProgressRepository and ProgressMapper | Adapter and mapper | Adapters | Map a single document and implement the concurrency-safe save. |
| ProgressModule | Module | Infrastructure | Register the collection and bind the port; no controllers or public routes. |

- Reuse UserId, GameId, LevelId, Count and Optional. Compare IDs using value semantics. An optional score represents absence; domain objects must not contain raw nulls or a publicly mutable map. Reject duplicate level identities, invalid bounds and mixed shapes. Keep date metadata without introducing a no-op or public updatedAt policy.
- The port exposes find(userId, gameId): Promise<Optional<Progress>>, listForUser(userId): Promise<readonly Progress[]>, and saveBest(snapshot): Promise<Progress>.
- Mongo uses text IDs, not ObjectId coercion (the first-admin identifier is textual), and one document with embedded level entries per player/game. A storage-only revision guards conditional writes.
- On save: verify the exact unique, non-sparse, non-partial (userId, gameId) index with binary collation on the primary. Read the record, merge in the domain, then insert or write only if the observed revision matches. Re-read and recompute on a revision conflict or a confirmed first-insert collision on this exact index, with bounded attempts. If exhausted, fail without claiming success. Propagate unrelated and ambiguous failures; no application retry after an uncertain acknowledgement.
- Follow the level persistence convention: disable automatic collection and index creation; no DDL on the write path. Declare and document the required index; isolated tests provision it explicitly. No live database work in this issue.

## Clean Architecture
- Infrastructure wires the adapter to IProgressRepository. The adapter depends on the port and domain; it owns MongoDB, persistence mapping, concurrency mechanics and index checks. Domain and application do not import NestJS or Mongoose.
- No engine generics are needed: the model is independent of board geometry and variant names.

## SOLID
- SRP: Progress decides how values combine; MongoProgressRepository handles write safety.
- OCP: a new game using either progress model does not change the merge or repository.
- DIP and ISP: consumers depend on the small progress port, not the database or its revision field.

## Design patterns
| Pattern | Participants | Problem solved | Alternative rejected |
| --- | --- | --- | --- |
| Repository and Adapter | IProgressRepository → MongoProgressRepository; ProgressMapper | Keeps MongoDB and its storage shape out of the application. | A Mongoose model exposed as the application boundary. |

## Extensibility and infrastructure independence
A new game using an existing model only needs registration in the #55 policy when it exists; no change to the repository, mapper or merge. The adapter can be swapped without changing domain/application code. An actual new progress model would require a domain and storage-contract change, not a game-name branch.

## Alternatives considered
- Unconditional read-merge-write: shorter, but permits losing progress on a concurrent save.
- Mongo update pipeline containing all merge rules: atomic, but moves business rules into persistence.
- Conditional revision writes: preserve a single domain merge, without requiring transactions for a one-document operation; handle conflicts explicitly.

## Test plan
| Spec element | Test name | Level |
| --- | --- | --- |
| BR-008-1 | should_isolate_progress_when_player_or_game_differs | Integration |
| BR-008-2 | should_reject_progress_when_the_snapshot_violates_its_model | Unit |
| Both shapes and missing record | should_round_trip_progress_when_each_shape_is_saved | Integration |
| BR-008-3/4 | should_keep_best_fields_when_progress_is_merged | Unit |
| A2 first and existing saves | should_preserve_all_improvements_when_saves_overlap | Integration, deterministic interleaving |
| E2 | should_reject_writes_when_the_required_index_is_unavailable | Integration |

## Open questions for the team
No open decision blocks #54. #55 owns registered-game and level membership checks, per-game star policy, empty HTTP responses, and timestamp behavior. No public contract is changed here.

## Diagram impact
- B1 already proposes Progress and LevelProgress; retain value identity for level keys.
- B3/B5 currently propose a plain save method; align to saveBest and the internal revision check. B5 must show textual user IDs and the compound index.
- B6 should show the provider-only module; leave the read and sync use cases unimplemented until #55. Update and mark implemented only after code verification.

## Implementation notes
UC-008 and the design were approved by the human maintainer. The two progress shapes, pure merge, and Mongo repository are implemented. The repository accepts a completed, visible index and verifies its usability on the primary through a named query hint before each write attempt. Keep the index stable while saves are enabled. The merge retains the later supplied date as metadata, without generating timestamps or defining what a no-op HTTP sync does.

## Verification
RED: the domain and repository tests failed for missing modules. A deterministic standalone MongoDB index-build test also failed semantically before the index usability guard. GREEN: 238 unit/architecture and 125 integration/e2e tests (12 focused Mongo), typecheck, lint and build. Isolated mutations caught broken completion merge, missing revisions, missing uniqueness and missing index hints. Independent verification approved the focused correction. No live database was used.

## AI usage
Assisted with architecture mapping, tests, implementation, and an independent check. The independent review identified that the index catalog can report unfinished builds. A paused local build reproduced the issue; a named hint made saves fail closed before writes.
