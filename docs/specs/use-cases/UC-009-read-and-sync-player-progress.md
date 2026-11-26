# UC-009 Read and sync player progress

| Field | Value |
| --- | --- |
| ID | UC-009 |
| Primary actor | Player, via the client |
| Goal | Read and sync the signed-in player's progress without losing previously saved improvements. |
| Status | Approved |
| Linked requirements | FR-003, FR-004, NFR-001, NFR-002, NFR-004 |
| Entities | User, GameId, Progress, Level |

## Preconditions

- The client can reach the API. Successful requests require a valid player session.
- Retaining the best progress for one player and game is covered by [UC-008](UC-008-retain-player-progress.md).

## Trigger

- The client needs the player's current progress or reconnects with progress saved on the device.

## Main success scenario

1. The client sends `PUT /api/v1/progress/{gameId}` with the player's bearer token and the progress snapshot for that game.
2. The API identifies the player from the token and validates the requested game and snapshot.
3. The API retains the best progress for that player and game, combining the incoming snapshot with any stored progress.
4. The API returns `200` with the merged progress in the documented format.

## Alternative flows

- **A1 (instead of step 1) — Read all progress:** The client sends `GET /api/v1/progress` with the bearer token. The API returns `200` with `{ "items": [...] }` containing only that player's saved progress. With no saved records, `items` is empty.
- **A2 (instead of step 1) — Read one game:** The client sends `GET /api/v1/progress/{gameId}` with the bearer token. For a known game with saved progress, the API returns `200` with that progress.
- **A3 (in A2) — Known game without saved progress:** The API returns `200` with an empty snapshot for the game's progress model (`bestScore: 0` or `null`, and `levels: {}`) and `updatedAt: null`. This read does not create a record.

## Exception flows

- **E1 (at step 2, A1 or A2) — Missing, invalid or expired token:** The API returns `401` using the existing error format. No progress is returned or changed.
- **E2 (at step 2 or A2) — Unknown game:** The API returns `404` using the existing error format. No progress is changed.
- **E3 (at step 2) — Invalid snapshot:** The API returns `400` using the existing validation error format. This includes a snapshot that does not match the game's progress model or includes a level ID that does not belong to the requested game. No progress is changed.
- **E4 (at step 3) — Save not confirmed:** The API does not report a successful sync. An uncertain result does not imply that the stored record was unchanged.

## Postconditions

- Read: no progress is changed.
- Successful sync: the returned progress is the retained snapshot for the signed-in player and requested game.
- Other players' progress and progress for other games remain unchanged.

## Business rules

- BR-009-1: The account to read or update is identified by the authenticated session.
- BR-009-2: Best-score games accept a nonnegative integer `bestScore` and no level entries. Level-based games accept `bestScore: null` and level entries keyed by ID.
- BR-009-3: Each submitted level records a boolean `completed`, a nonnegative integer `bestScore`, and integer `stars` from 0 to 3 for games with stars or 0 for other games.
- BR-009-4: Sync keeps the higher score and star count for each applicable field, keeps a completed level completed, and retains saved levels omitted from the request.
- BR-009-5: The client does not supply `gameId` or `updatedAt` in the snapshot body. The game is selected by the URL.
- BR-009-6: Sync does not submit ranking scores or change the leaderboard.
- BR-009-7: `updatedAt` is the UTC timestamp at which the server last created or changed the stored progress. If there is no stored record, `updatedAt` is `null`. A sync that leaves all progress fields unchanged preserves the stored timestamp.

## Scope boundary

- Replaying a level does not remove it from the catalog. Sync only updates progress and does not delete levels. Changes to the catalog's administrative deletion policy are outside UC-009. The existing submitted level membership rule still applies.

## Verification scenarios

- Require authentication on all three routes and verify isolation between two signed-in players.
- Read all saved progress, a known game without a record, and an unknown game; verify that reads create nothing.
- Sync both progress models. An older snapshot must not lower any saved best or clear a completed or omitted level.
- Replay a level: a lower score leaves the best score unchanged, a higher score replaces it, and stars can improve independently. The level remains available in the catalog.
- An empty read returns `updatedAt: null`. A first save or a saved change records the server timestamp. Repeating a sync without a change preserves it.
- Reject malformed snapshots, invalid score or star values, and level IDs not belonging to the game; verify that stored progress is unchanged.
- Document the three routes and their response and error formats in Swagger when implemented.

See the API contract and Swagger for the nullable empty-read timestamp and no-op sync semantics.

References: [#55](https://github.com/Ivifer1/hexablock-backend/issues/55), [API contract — Progress](../api-contract.md#progress).
