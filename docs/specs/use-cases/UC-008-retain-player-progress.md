# UC-008 Retain player progress

| Field | Value |
| --- | --- |
| ID | UC-008 |
| Primary actor | Player (through the application boundary) |
| Goal | Retain the best progress for one player and game |
| Status | Approved |
| Linked requirements | FR-003, FR-004, NFR-004 |
| Entities | User, GameId, Progress |

## Preconditions
- A caller supplies a valid snapshot for an identified player and game. Authentication, game and level membership validation, and the public endpoints belong to #55.

## Trigger
- The application supplies progress to retain or asks for previously stored progress.

## Main success scenario
1. The system receives the snapshot and identifies its player and game.
2. The system retains one record for that pair, combining both snapshots if one was already stored.
3. The system returns the progress confirmed by this save.

## Alternative flows
- **A1 (step 2) First save:** Store the incoming progress as the only record for the pair.
- **A2 (step 2) Overlapping saves:** Concurrent successful saves leave a single record containing their combined best values.
- **A3 (read):** Return the records only for the requested player and, for a keyed read, game. A missing record returns absence and does not create anything.

## Exception flows
- **E1 (step 2) Rejected or uncertain write:** Do not report success. Do not assume a write with an uncertain outcome had no effect.
- **E2 (step 2) Storage cannot guarantee uniqueness:** Do not attempt a write when the required index is missing, unsuitable, or cannot be checked.

## Postconditions
- Success: at most one record per player and game, retaining the best progress already saved.
- Failure: other player/game records are not changed. No success is reported for an unconfirmed write.

## Business rules
- BR-008-1: The key is the pair of player identity and game identity. The two parts isolate records independently.
- BR-008-2: Score-based progress holds a nonnegative integer score and no level entries. Level-based progress holds no overall score and tracks completed (boolean), stars (0–3), and a nonnegative integer best score per level.
- BR-008-3: Keep the maximum score and stars; completion is the logical OR. Keep levels not supplied by an incoming snapshot. Level identity is compared by value.
- BR-008-4: Distinct player/game pairs or incompatible progress models must not be combined.

## Open questions
- #55 must specify timestamp behavior for no-op syncs and how to handle progress already stored for a deleted level. These questions do not block the persistence contract.
