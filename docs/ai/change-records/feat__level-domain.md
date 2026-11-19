# Change record: feat/level-domain

Status: APPROVED
<!-- Only a human changes this line to "Status: APPROVED" (hooks block the agent from doing it). -->
Author(s): Ivifer1 with Claude Code (Claude Fable 5.2)
Date: 2026-11-12

## Spec and traceability
- Issue: #28 Add level domain model and common validation
- Spec: `docs/specs/level-format.md` (common part, board, validation rules 1–8 of the common part)
- Requirements: FR-010 (one generic level schema), C-001, C-002 (generic over `gameId`), C-004 (Strategy)
- Use cases: none yet. The level endpoints (#31, #32) will be the first consumers.
- Class diagram: tab B1 (`Level`, `BoardDefinition`, `LevelValidator`, `ILevelSectionValidator`, value objects)

## Problem
The backend cannot represent or check a level. Hexa Fit and Hexa Sort levels share a common part that must be
validated once, by code that never names a variant, and the board must be checked against its cell geometry, which
the professor may change (squares, triangles…).

## Scope and confirmed decisions

- 2026-11-18: retain value objects and make common code reusable across variants and cell geometries.
- Keep the published level format unchanged: only `hex-axial` is a production topology in this issue.
- Defer `square` until coordination with the client owner. Remind the user when resuming topology work.
- Prove geometry independence with a fake topology used only in tests; do not add a production geometry without a consumer.
- The user manually set `Status: APPROVED` on 2026-11-18 before tests and source implementation began.

## Proposed design

| Type | Kind | Layer | Responsibility (one sentence) |
| --- | --- | --- | --- |
| `GameId` | value object | domain (`game/game-id.ts`) | Variant id: lowercase letters, digits and `-`. |
| `SchemaVersion` | value object | domain (`level/`) | Format version; only `1` is accepted. |
| `LevelId` | value object | domain (`level/`) | `^[a-z0-9-]+$`. |
| `LevelNumber` | value object | domain (`level/`) | Integer ≥ 1 (`order`). |
| `LocalizedName` | value object | domain (`level/`) | Non-empty `es` and `en`. |
| `TopologyId`, `SectionKey`, `Count` | value objects | domain | Typed ids and a non-negative integer. |
| `RawCoord` | value object | domain (`level/`) | A coordinate as integers; `equals`, `size()`, `translated(by)`. |
| `BoardDefinition` | value object | domain (`level/`) | Topology id + cells; rejects an empty board and duplicate cells. |
| `ILevelSection` | interface | domain (`level/`) | `sectionKey(): SectionKey`; implemented by immutable typed variant sections in #29. No raw transport payload in the common level. |
| `Level` | entity | domain (`level/`) | Common part + one `ILevelSection`; it never names concrete variants. |
| `IBoardTopology` | interface (Strategy) | domain (`level/topology/`) | `id()`, `coordinateSize()`, `neighbors(coord)`. |
| `HexAxialTopology` | strategy | domain (`level/topology/`) | Neighbours on `[q, r]`. The only production topology in this issue. |
| `ILevelSectionValidator` | interface (Strategy) | domain (`level/`) | `sectionKey()`, `validate(level)`; implemented per variant in #29. |
| `LevelValidator` | domain service | domain (`level/`) | Registers topologies and section validators; applies the common rules. |
| `ErrorCode` | enum (changed) | domain | `InvalidGameId`, `InvalidSchemaVersion`, `InvalidLevelId`, `InvalidLevelOrder`, `InvalidLevelName`, `InvalidCoordinate`, `InvalidBoard`, `UnknownGame`, `WrongLevelSection`, `UnknownTopology`, `BoardNotConnected`, `InvalidTopologyId`, `InvalidSectionKey`, `InvalidCount`. |

Who checks each common rule of `level-format.md`:
- Rules 1, 2 (format), 4 (≥ 1), 5: the value objects, when they are built.
- Rule 7 (non-empty, no duplicates): `BoardDefinition`. Coordinate size: `LevelValidator`, asking the topology.
- Rules 3, 6, 8: `LevelValidator` (registered `gameId` with the right section, known topology, connected board).
- "Unique id" (rule 2) and "unique order within `gameId`" (rule 4) need stored levels: they belong to the
  repository and use cases (#30, #32).

Connectivity (rule 8): breadth-first search from the first cell, moving only through `topology.neighbors(cell)`
that are cells of the board; the board is connected when every cell was reached.

`LevelValidator` fails on the first broken rule with a `DomainError`, like the rest of the domain.

## Differences from the class diagram (to decide before coding)
1. **Topology.** Replace the count-only registry in B1 with a registry of `IBoardTopology` implementations.
   Add `IBoardTopology` and `HexAxialTopology`. `registerTopology(topology)` registers a geometry without
   changing `LevelValidator`. Keep `square` out of production and out of the shared format for now.
2. **Section.** Replace `Level.section: unknown` with `section: ILevelSection` and its `sectionKey(): SectionKey`.
   Concrete typed sections belong to #29; raw JSON parsing stays at the adapter boundary. Each concrete section
   validator can inspect its own section type; the common validator only checks the registered key and delegates.
   "No other variant section" is checked at the HTTP edge (#32), which rejects unknown top-level fields.
3. **Value equality.** Store registry entries in typed lists and search with `GameId.equals` / `TopologyId.equals`.
   Do not use object identity as the meaning of an id. Board duplicates, membership and visits use `RawCoord.equals`.
   This avoids a new collection abstraction and keeps `toString()` at the adapter boundary.
4. Rename `LevelValidator.register` to `registerSection`; keep section and topology registration distinct.

No shared JSON contract change is proposed in this revision. Existing names, fields and variant sections remain valid.

## Clean Architecture
- Everything is in `domain`: plain TypeScript, no imports from outside.

## SOLID
- **SRP:** value objects guard one rule each; topologies know geometry; the validator orchestrates.
- **OCP:** a new cell shape is one `IBoardTopology` class and one registration; a new variant is one
  `ILevelSectionValidator` and one registration. `LevelValidator` and `Level` do not change.
- **LSP:** connectivity tests run against the real hexagonal topology and an alternative fake using a different dimension or neighbour count.
- **DIP:** `LevelValidator` depends on the two interfaces, never on a concrete topology or variant.

## Design patterns
| Pattern | Participants | Problem it solves here | Simpler alternative rejected and why |
| --- | --- | --- | --- |
| Strategy | `IBoardTopology` → `HexAxialTopology` (alternative fake in tests); context `LevelValidator` | The board check never assumes 6 directions. | `if (topology === 'hex-axial')` inside the validator: every new shape edits it. |
| Strategy | `ILevelSectionValidator` (implementations in #29); context `LevelValidator` | The common validator never names a variant. | `switch (gameId)`: forbidden by the brief. |
| Registry | `LevelValidator.registerTopology` / `registerSection` | Strategies are chosen by id at run time. | Hard-coded maps: adding one edits the validator. |

## Extensibility and infrastructure independence
- Future geometry: one new `IBoardTopology` + registration + agreed documentation of the shared topology id.
- Changing the board outline changes its cell list; it does not change the connectivity algorithm.
- Client drawing, rotations and game rules retain their separate topology responsibilities; this backend interface covers common board validation only.
- A fifth level variant: one `ILevelSectionValidator` + registration.

## Alternatives considered
- **Collect every broken rule instead of failing on the first:** friendlier `400 details`, but a different error
  model from the rest of the domain. Can be revisited in #32.
- **Topology only in the client:** then the backend could store boards split in islands, which no client can play.

## Test plan
| Rule | Test name | Level |
| --- | --- | --- |
| 1 | `should_throw_invalid_schema_version_when_version_is_not_1` | unit |
| 2 | `should_throw_invalid_level_id_when_value_has_uppercase_or_symbols` | unit |
| 4 | `should_throw_invalid_level_order_when_value_is_below_1_or_not_integer` | unit |
| 5 | `should_throw_invalid_level_name_when_a_language_is_blank` | unit |
| 7 | `should_throw_invalid_board_when_cells_are_empty`, `..._when_a_cell_is_repeated` | unit |
| 7 | `should_throw_invalid_board_when_coordinate_size_does_not_match_topology` | unit |
| 3 | `should_throw_unknown_game_when_game_id_has_no_validator` | unit |
| 3 | `should_throw_wrong_level_section_when_section_key_is_not_the_variants` | unit |
| 6 | `should_throw_unknown_topology_when_topology_is_not_registered` | unit |
| 8 | `should_throw_board_not_connected_when_cells_form_two_islands` (hex and alternative fake topology) | unit |
| 8 | `should_accept_board_when_cells_are_connected` (hex and alternative fake topology) | unit |
| Geometry | `should_return_6_neighbours_when_topology_is_hex_axial` | unit |
| Generic | `should_call_registered_section_validator_when_common_rules_pass` (fake variant) | unit |
| OCP | `should_validate_new_topology_when_only_registered` (fake topology with different dimensions or neighbours) | unit |
| Value equality | `should_find_topology_when_registered_id_is_an_equal_distinct_instance`, `should_find_section_validator_when_game_id_is_an_equal_distinct_instance` | unit |

All validator tests use a fake variant (`fake-game`), so the common validator is proven not to know real variants.

## Open questions for the team
1. Deferred reminder: coordinate any future `square` production support and topology id with the client owner.

## Reuse and immutability boundaries

- Reuse `DomainError`, `ErrorCode` and `Optional`; do not introduce parallel error or absence models.
- `RawCoord` wraps a defensive copy of integer coordinates. It does not assume two dimensions.
- `IBoardTopology` exposes `id(): TopologyId`, `coordinateSize(): Count`, and
  `neighbors(coord: RawCoord): readonly RawCoord[]`. Each geometry defines its own neighbours.
- `BoardDefinition` copies its cells and exposes readonly collections. Typed variant sections must also be immutable.
- Breadth-first search is shared: visit existing board cells through the registered topology until no new cell remains.
- Do not duplicate the client's engine, rendering, rotations or game rules in this backend interface.
- Persisted uniqueness, repositories, HTTP parsing/endpoints and real Fit/Sort validators stay in #29–#32.
- New domain error codes are not exposed over HTTP in #28; their HTTP mappings must be supplied with the endpoints.

## Revision history

- 2026-11-18: reconciled the user's decision to defer `square`, preserve value objects and prioritize reuse.
  Replaced the proposed opaque section with a typed interface for review; documented content-based registry lookup.
  No source implementation, dependency, contract or approval status was changed.

## Implementation notes

- Implemented value objects, `Level` / `LevelProperties`, `BoardDefinition`, typed `ILevelSection`,
  `IBoardTopology` / `HexAxialTopology`, and `LevelValidator` entirely inside the domain layer.
- Reused `DomainError` and extended `ErrorCode` without changing existing members or HTTP mappings.
- Registrations use typed lists and content equality. Re-registering an equal id replaces the previous entry,
  preserving the intended map-like registration behavior without object-identity keys.
- Board cells and coordinate arrays are defensive frozen copies. Variant section implementations are required
  to be immutable. `LevelProperties` is a typed construction input, not a transport model.
- The connectivity queue contains only existing board cells and also tracks visits. The algorithm depends on
  the selected topology, not on a concrete geometry, coordinate dimension or number of neighbours.
- The fake topology uses one coordinate and two neighbours; production only provides `hex-axial`.
- No package, endpoint, persistence schema, published level contract or authentication behavior changed.
- New domain error codes will need HTTP mappings when level endpoints are added; they are not exposed here.
- Local diagrams and private defense notes are updated separately and must never enter repository commits.

Risk: none. All level behavior is new and not wired into existing flows; the only shared source change appends
error-code members, preserving every existing member and the current partial HTTP mapping.

## Verification

- Before implementation: `npm test -- test/domain/level/level-domain.spec.ts` exited 1 because `game-id.js`
  did not exist; no test was collected. This was an import-level RED, not an assertion-level RED.
- After implementation, the same focused command: 64 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: 175 tests passed across 14 files, including architecture and existing authentication behavior.
- `npm run test:e2e`: 25 tests passed across 7 files with MongoDB in memory.
- `npm run build`: passed.
- Isolated deliberate rule-breaking probes: 14/14 detected after a clean 64-test baseline passed in the
  scratch copy. Probes covered version, level/game id, order, name, integer coordinates, empty/duplicate cells,
  dimensions, section key, connectivity, registry value equality, and both defensive copies.
  The scratch directory was removed; the working-tree source was never mutated by these probes.
- No existing executable command, endpoint or error-code value changed, so a new-input CLI differential
  comparison is not applicable. Existing unit/e2e behavior was verified by the unchanged regression suites.
- Local diagram XML: 22 pages retained, unique cell ids and valid parent/source/target references checked.
  The web diagram keeps its interaction script unchanged. A static rendered preview was inspected; the user confirmed shared-diagram synchronization. Remote state was not independently inspected.
- Native assessment and preflight both failed before transaction creation: `immutable_review_transport_unsupported`.
  The runtime reported `next_action: stop`, `mutation_outcome: not_started`, and `retry_safe: false`.
  Review mode remains enabled; no approval receipt is claimed. No retry, mode toggle, push or remote operation was performed. Local commits were subsequently authorized by the user.
- Native risk remains high/unassessable until a supported session can assess it. PR delivery slicing remains pending; local commits follow the user-requested historical order.

## Local commits

The user explicitly requested local commits in the historical order: tests, implementation, then documentation.
The first test snapshot is intentionally RED until the implementation commits are applied.

- `c5336c0` — specify the common validation tests and retain the approved proposal.
- `3b3fd71` — add typed level/board models and value objects.
- `9ab884d` — add registered topology/section strategies and common validation.
- Final documentation commit — record verification and AI usage; no source changes.

Existing verification covers these unchanged source bytes. Native review remains unavailable; no receipt is
claimed, and commits do not imply a push, PR or merge. Decide PR slicing before remote delivery.

## AI usage

- The assistant reconciled the design after user decisions, implemented the domain and behavior tests,
  ran checks and isolated deliberate rule-breaking probes, and synchronized local documentation and diagrams.
- A read-only architect mapping and a read-only test-plan mapping informed the parent implementation.
- The user manually approved the proposal before source changes; production `square` support remains deferred.
