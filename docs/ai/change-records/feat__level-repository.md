# Change record: feat/level-repository

Status: APPROVED
<!-- Only a human changes this line to "Status: APPROVED". -->
Author(s): Ivifer1
Date: 2026-11-20
Base: `fac401c` (merged level section validators)

## Spec and traceability

- Issue: [#30](https://github.com/Ivifer1/hexablock-backend/issues/30).
- Requirements: FR-010, C-001, C-002 and C-004; [level format](../../specs/level-format.md), [API contract](../../specs/api-contract.md) (Levels), and [ADR-0001](../../adr/0001-mongodb-with-mongoose.md).
- Acceptance: integration tests against in-memory MongoDB; no Mongoose imports in domain or application.
- No HTTP behavior, OpenAPI schema, or public JSON shape changes. The public and admin endpoints remain #31 and #32.

## Problem

The backend validates levels in memory but cannot store or retrieve them. A level id must be unique across all games, and an order must be unique within its game. Both constraints must hold even when two requests reach the database at the same time.

## Proposed design

| Type | Layer | Responsibility |
| --- | --- | --- |
| `ILevelRepository` | Application port | Define typed create, replace, find, list, and delete operations. |
| `MongoLevelRepository` | Persistence adapter | Run database operations and translate only known level uniqueness conflicts. |
| `LevelDocument` and `LevelSchema` | Persistence adapter | Store one document per level in one collection, with common fields and one nested section. |
| `LevelMapper` | Persistence adapter | Translate common fields and select the registered section mapper without naming variants. |
| Fit and Sort section mappers | Persistence adapters | Translate their own section and reconstruct its typed value objects. |
| Level value object conversions | Domain | Provide explicit, read-only conversions for boundary mappers where no conversion exists today. |

### Repository operations

| Operation | Result and semantics |
| --- | --- |
| `list(gameId: GameId): Promise<readonly Level[]>` | Return only that game's levels in ascending order; return an empty list when no levels match. |
| `findById(id: LevelId): Promise<Optional<Level>>` | Return an empty Optional when the level does not exist. |
| `create(level: Level): Promise<void>` | Insert only; an existing id or an occupied order in the same game is a conflict, never an overwrite. |
| `replace(level: Level): Promise<boolean>` | Replace the entire stored level by its id without upsert. Use the matched count, not the modified count: an identical replacement succeeds, and a missing id returns false. An order held by another level in that game is a conflict. |
| `delete(id: LevelId): Promise<boolean>` | Report whether an entry was removed. Only isolated integration tests perform deletions in #30; there is no exposed endpoint. |

Split the UML's proposed `save` into `create` and `replace` to preserve separately observable POST and PUT behavior. Reuse the user repository's mapper and duplicate-classification pattern, not its upsert semantics. Propose `LevelIdTaken` and `LevelOrderTaken` for the known Mongo key patterns; forward unrelated persistence failures. Do not promise which error wins if a single write violates both indexes. Do not introduce HTTP mappings for these new codes in #30. The response for an occupied order should be settled against the API contract in #32.

### Storage and mapping

- Store the string level id as MongoDB `_id`. Add a unique compound index on `{ gameId: 1, order: 1 }`; the same pair also supports listing one game by order. [MongoDB unique indexes](https://www.mongodb.com/docs/manual/core/index-unique/).
- Use required, explicitly typed common fields. Store the variable section as one nested value with a section key and payload at the adapter boundary. The payload is untrusted on read: its registered mapper checks its shape before constructing typed objects. Do not use a cast to turn raw storage into `ILevelSection`.
- Register section mapping strategies by `GameId` in composition, with the expected section key checked at the seam. Neither the common mapper nor schema has a Fit/Sort switch. Reject unsupported or mismatched sections; do not silently skip corrupt documents.
- Rebuild via existing domain factories; apply the composed `LevelValidator` on rehydration to check cross-field invariants. Writes accept a typed level and validate it before persistence, using the same configured validator; keep Mongoose validation from substituting for domain rules.
- Keep private primitive payloads. Propose using the established `toString()` boundary convention, adding `toNumber()` for numeric value objects and explicit immutable snapshots for coordinates and bilingual names. Only boundary mappers consume these conversions; domain and application business logic keep working with value objects. Coordinates return a defensive snapshot, not the stored array.
- Assemble the adapters with the existing MongoDB infrastructure; reuse Mongoose and the in-memory runner. Do not wire HTTP endpoints, add packages or touch a deployed database in this task.

## Clean Architecture

`infrastructure → adapters → application → domain`. The port uses domain types and `Optional`, not storage documents. The mapper owns storage conversion and the Mongo adapter translates known persistence conflicts. Geometry stays behind the topology strategy already selected by `LevelValidator`.

## SOLID

- **SRP:** repository I/O, storage conversion and domain validation have separate owners.
- **OCP:** a new variant adds its section mapper and registration without editing the common mapper, schema, or repository.
- **DIP:** application depends on `ILevelRepository`; it does not know Mongoose.

## Design patterns

| Pattern | Participants | Why |
| --- | --- | --- |
| Repository + Adapter | `ILevelRepository`, `MongoLevelRepository` | Keep storage details outside the application. |
| Data Mapper + Strategy | `LevelMapper`, per-variant section mappers | Keep common fields mapped once and avoid a central variant switch. |

## Extensibility and alternatives

A future variant adds a section mapper and a registration; MongoDB needs no variant-specific collection or schema change. Replacing MongoDB requires another implementation of the same port. One `save` with upsert is shorter but can overwrite on create or insert on replace; checking first and then writing still races. A direct cast into value objects or an untyped serialization method would hide invalid stored values and leak private state.

## Test plan

| Behavior | Planned test |
| --- | --- |
| Fit and Sort round trips | `should_rebuild_typed_level_when_stored_section_round_trips`; cover coordinates, multilingual names, stars and absent seed versus seed zero. |
| Lookup and sort | `should_return_empty_when_level_id_is_missing`; `should_list_only_the_requested_game_when_levels_are_stored_out_of_order`. |
| Unique id | `should_preserve_original_level_when_creating_a_duplicate_id`. |
| Unique order | `should_reject_duplicate_order_when_the_game_matches`; `should_allow_same_order_when_games_differ`; verify one winner with overlapping writes. |
| Replacement | `should_replace_existing_level_when_id_matches`; `should_not_insert_when_replacing_an_unknown_level`; `should_preserve_level_when_replacement_collides_with_another_order`. |
| Deletion | `should_report_removal_when_the_level_exists`; `should_report_no_removal_when_the_level_does_not_exist`. |
| Invalid stored data | `should_reject_rehydration_when_stored_section_does_not_match_the_game`; no silent fallback. |
| Boundary and extension | Existing layer test and a test-only section mapper registered without production variant changes. Check coordinate snapshot does not expose mutable state. |

Use `mongodb-memory-server`, an isolated database per suite, and await model/index initialization before writes. Pass the focused integration test, unit/architecture and e2e suites, lint, types and build.

## Decisions and follow-up

- The human-approved design allows boundary-only conversions and separates `create` from `replace`. MongoDB field names and BSON types remain outside the domain and application.
- Clarify the HTTP response for a duplicate order in #32. No HTTP behavior changed here. The composition factory takes an initialized model; verify indexes before enabling production writes during endpoint wiring.

## Diagram impact

B1: any approved value-object conversion signatures. B3: the port replaces `save` with `create` and `replace`. B5: the Mongo adapter and mapper match the port and section strategies. B6 only if production composition wiring is added. The private local diagrams reflect B1, B3 and B5. The factory is not wired into the running Nest application, so B6 and the shared diagram are unchanged.

## Implementation notes

The repository, schema, typed mappers and infrastructure factory are implemented. The factory is exercised in integration tests; no deployed database was accessed.

## Verification

Observed RED in an isolated scaffold: 2 mapper tests and 13 of 15 repository tests failed. Focused GREEN: 2 mapper and 15 repository tests passed. Full suites: 231 unit/architecture and 40 e2e/integration tests passed; types, lint and build passed. Eight isolated rule-breaking probes were detected. Independent review executed four isolated probes with competing insert/replace operations and corruption handling. Two regression scenarios were added; final results: 231 unit/architecture and 42 e2e/integration tests passed, including 17 repository tests. Types, lint and build passed.

## AI usage

Codex drafted the change record after inspecting #30, the approved level model, the user repository, and the UML, with a read-only architect handoff. Codex then implemented the approved design, verified behavior in isolated MongoDB, and synchronized the local diagrams.
