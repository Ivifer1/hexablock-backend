# Change record: feat/level-section-validators

Status: APPROVED
<!-- Only a human changes this line to "Status: APPROVED". -->
Author(s): Ivifer1
Date: 2026-11-19

## Spec and traceability

- Issue: [#29](https://github.com/Ivifer1/hexablock-backend/issues/29).
- Spec: [level format](../../specs/level-format.md), Hexa Fit and Hexa Sort rules 1–4.
- Requirements: FR-010, C-001, C-002 and C-004. No endpoint use case changes.
- Baseline: #28 already registers validators by value-equal `GameId` and rejects unknown games.

## Problem

The shared validator checks the board but has no concrete Fit or Sort strategy. Fit must check piece geometry using the same topology as the board; Sort has no geometry-specific rules.

## Proposed design

| Type | Kind / layer | Responsibility |
| --- | --- | --- |
| `HexaFitSection`, `HexaSortSection` | Immutable models / domain | Implement `ILevelSection` and hold typed values and defensive copies of collections. |
| `HexaFitSectionValidator` | Strategy / domain | Validate the Fit section, piece geometry, total area and star thresholds. |
| `HexaSortSectionValidator` | Strategy / domain | Validate the Sort goal, semantic color ids, stack heights and optional seed. |
| `ILevelSectionValidator`, `LevelValidator` | Strategy contract and domain service | Pass the already-resolved `IBoardTopology` as a required second argument to `validate(level, topology)`. |
| Shared cell-connectivity predicate | Function / domain | Extract the existing traversal unchanged in intent and reuse it for boards and Fit pieces. |
| Levels composition factory | Factory / infrastructure | Register Fit, Sort and the existing hex-axial topology in one place; no HTTP or Nest module wiring yet. |

- Keep coordinate dimension checks before traversal. Check the piece origin with `RawCoord.isOrigin()` (all coordinates zero), not a two-component literal in the algorithm. Compare cells and ids by value. The Fit area check does not attempt to solve the puzzle.
- Keep numeric and text data in value objects and optional seed in `Optional<Seed>`. Reuse `RawCoord`, `Count`, `Optional` and `DomainError`. Each strategy rejects an incompatible section type even if it reports the expected key. Preserve existing common validation order and errors.
- The issue names `GameCatalog` as the registry, but it exists only in the current UML, not the backend source. Use `LevelValidator.registerSection` as the sole registry for this change. This deviation was accepted as part of the human-approved proposal.

## Clean Architecture

Infrastructure composes domain strategies. The domain uses its own strategy interfaces and value objects; it does not depend on NestJS, MongoDB, JSON parsing, or a transport port. No new generic type parameters or external ports are needed.

## SOLID and design patterns

- **SRP:** the common validator orchestrates common checks; each strategy owns its variant rules; the shared traversal only answers whether cells are connected.
- **OCP and DIP:** `LevelValidator` depends on `ILevelSectionValidator` and `IBoardTopology`. A new validator can be introduced with one strategy and one registration, with no changes to other strategies or the common validator.
- **Strategy:** keeps variant rules out of a `gameId` switch. The required topology argument is unused by Sort, but avoids a second lookup or an optional dependency for Fit.

## Extensibility and infrastructure independence

The extension test covers the dispatch seam with one test strategy and one registration. A real variant may also need its own typed section and boundary mapping. JSON, persisted format, repository, endpoints and production `square` support are out of scope.

## Alternatives considered

- **Create `GameCatalog` now:** matches the issue wording but would either duplicate the current registry or entail moving it without another current consumer. Reconsider when a use case needs shared game metadata.
- **Resolve topology inside Fit:** avoids changing the strategy signature, but adds a lookup and risks validating a piece with a different topology than its board.

## Test plan

Use unit tests named `should_<result>_when_<condition>`, with invalid cases failing before implementation.

| Rule | Behavior to prove |
| --- | --- |
| Fit 1 | Reject empty piece lists and repeated piece ids. |
| Fit 2 | Reject empty, duplicate, originless, wrong-dimension or disconnected piece cells; exercise a fake non-hex topology. |
| Fit 3 | Reject unequal board and piece area. |
| Fit 4 | Accept a required `stars` list with zero, one, or two thresholds. Reject invalid or repeated star values, nonpositive limits, and limits that make three stars easier than two. Cover best-first order. |
| Sort 1 | Reject nonpositive or noninteger goals. |
| Sort 2 | Reject fewer than two semantic color ids or any repeated id, including when two distinct ids remain. |
| Sort 3 | Reject noninteger heights, reversed ranges and bounds outside 1–9. |
| Sort 4 | Accept absent or integer seed; reject a noninteger seed. |
| Common / OCP | Preserve `UnknownGame` and board validation regressions; register one test-only strategy without changing production dispatch. |
| Examples | Validate typed fixtures derived from the two existing JSON examples; no production JSON parser. |

## Confirmed rules

- Sort: require at least two distinct color ids and reject duplicates. Do not silently deduplicate the tray's input.
- Fit: `stars` is required; it may contain zero, one, or two thresholds. With an empty list, completing a level awards one star. With one threshold, its award is available if both limits are met; otherwise, award one star on completion.

## Diagram impact

The local B1 and backend web diagrams now mark the Fit/Sort validators and typed sections as implemented, and show the resolved topology argument. `GameCatalog` remains a separate proposal for progress and scores. The shared diagrams.net document was not changed.

## Implementation notes

Ivifer1 approved the proposal before source changes. Implemented typed sections, both validators and the infrastructure factory. The factory is ready for endpoint wiring in later issues; no HTTP contract changed.

## Verification

Behavioral RED: 25 failures with the new checks disabled in an isolated copy. Focused GREEN: 113 level tests passed before the follow-up. The design review identified sparse section collections and missing coverage for a third threshold. Four sparse collection tests reproduced the gap before the fix. Empty pieces are already rejected by the area check because a valid board is never empty.

Final checks: 229 unit/architecture and 25 e2e/integration tests passed; typecheck, lint and build passed. Ten isolated rule-breaking probes were detected. Both design-review findings passed targeted recheck.

## AI usage

Codex (GPT-6.2) inspected the #28 baseline and #29, obtained an architect handoff, and drafted this proposal. Codex also implemented the approved design with a test-engineer handoff and verified the behavioral RED and GREEN.
