# UC-010 Submit a score and receive the current personal best

| Field | Value |
| --- | --- |
| ID | UC-010 |
| Primary actor | Player, via the game client |
| Goal | Submit the score from a finished game and receive the retained personal best for its ranking. |
| Status | Approved |
| Linked requirements | FR-005, NFR-001, NFR-002, NFR-004 |
| Entities | User, GameId, Level, Score, Leaderboard |

## Preconditions

- The client can reach the API and has the score calculated by the game for the finished attempt.
- A successful submission requires a valid player session.

## Trigger

- The signed-in player finishes a game and the client submits the result.

## Main success scenario

1. The client sends `POST /api/v1/scores` with the bearer token, the variant's `gameId`, and the score from this attempt. For a level-based variant, the client also sends `levelId`.
2. The API identifies the player from the session and validates the variant, optional level, and score.
3. The API retains the higher score for that player and ranking. If the result creates or improves the record, the API records when that score was first achieved.
4. The API returns `201` with the ranking identifiers, `score` equal to the retained record, and `personalBest: true`.

## Alternative flows

- **A1 (at step 3) — No previous score:** Keep the submitted result as the first record, including when it is zero, and return it with `personalBest: true`.
- **A2 (at step 3) — Equal or lower score:** Keep the previous score and the time it was first achieved. Return `201` with the retained score and `personalBest: false`.
- **A3 (at step 4) — Variant-wide ranking:** The result identifies the variant by `gameId`; it does not include a level identifier.

## Exception flows

- **E1 (at step 2) — Missing, invalid or expired session:** Return `401`. Do not change any record.
- **E2 (at step 2) — Unknown variant:** Return `404`. Do not change any record.
- **E3 (at step 2) — Invalid submission:** Return `400` for an invalid score, a missing required level, a level supplied for a variant-wide ranking, or a level that does not belong to the variant. Do not change any record.
- **E4 (at step 3) — Save not confirmed:** Do not report a successful submission. An uncertain result does not establish that no write occurred.

## Postconditions

- One personal best is retained per player and ranking.
- A submission does not change another player's record or a record in a different ranking.
- This operation does not change the level catalog or synchronized player progress.

## Business rules

- BR-010-1: The session, not the submission body, identifies the player.
- BR-010-2: A submitted score is a nonnegative integer from one attempt. Scores from separate attempts are not added.
- BR-010-3: Variant-wide rankings use the variant. Level-based rankings use the variant and one level belonging to it.
- BR-010-4: A strictly higher score improves the record. An equal or lower score never replaces it or changes when that record was first achieved.
- BR-010-5: Request `score` is the attempt result. Response `score` is the retained personal best. The client already has the attempt result and can display it separately.
- BR-010-6: `personalBest` is true only when that submission creates or improves the record, including when submissions overlap.

## Verification scenarios

- First submission creates a record and returns its score; a higher score advances it.
- With a personal best of 120, a new attempt of 80 returns `score: 120` and `personalBest: false`. An equal result keeps the same timestamp.
- Overlapping submissions retain the highest score and leave only one record for the player and ranking.
- Cover both ranking types, two players, two levels, invalid membership and invalid score; verify unaffected records.
- Distinguish the documented #56 response from leaderboard reads, which belong to #57.

References: [#56](https://github.com/Ivifer1/hexablock-backend/issues/56), [API contract — Scores and leaderboard](../api-contract.md#scores-and-leaderboard).
