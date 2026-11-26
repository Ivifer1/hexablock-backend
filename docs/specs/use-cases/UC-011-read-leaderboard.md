# UC-011 Read the ranking for a variant or level

| Field | Value |
| --- | --- |
| ID | UC-011 |
| Primary actor | Signed-in player, via the game client |
| Goal | See the highest personal bests in one ranking. |
| Status | Approved |
| Linked requirements | FR-006, FR-007, NFR-001, NFR-002 |
| Entities | User, GameId, Level, Score, Leaderboard |

## Preconditions

- The player has a valid session to obtain a successful response.
- The client knows which variant to query and, when that variant ranks by level, which level to query.

## Trigger

- The player opens or refreshes the ranking for a variant or level.

## Main success scenario

1. The client sends `GET /api/v1/leaderboard/{gameId}` with the bearer token. It sends `levelId` only for a level-based ranking and can send `limit`.
2. The API authenticates the session and validates the variant, level selection and limit.
3. The API reads the retained personal bests for that ranking. It sorts by score descending, then by the time the score was achieved ascending.
4. The API returns `200` with `gameId`, `levelId` when applicable, and `entries`. Each entry exposes `rank`, `username`, `score` and `achievedAt`.

## Alternative flows

- **A1 (step 2) — No limit supplied:** Return up to 10 entries.
- **A2 (step 3) — No scores for a valid ranking:** Return `200` with `entries: []`.
- **A3 (step 4) — Variant-wide ranking:** Omit `levelId` from the response.

## Exception flows

- **E1 (step 2) — Missing, invalid or expired session:** Return `401`. No ranking data is returned.
- **E2 (step 2) — Unknown variant:** Return `404`.
- **E3 (step 2) — Invalid query:** Return `400` for an invalid limit, a missing required level, a level supplied for a variant-wide ranking, or a level that does not belong to the requested variant.
- **E4 (step 3) — Ranking cannot be read:** Return the standard server error without partial ranking data.

## Postconditions

- Returned entries belong only to the requested ranking.
- Reading does not create or change scores, progress or level definitions.

## Business rules

- BR-011-1: A session is required for both ranking types. A variant-wide ranking is shared among players; it is not anonymously accessible.
- BR-011-2: A variant-wide ranking is scoped by `gameId`. A level ranking is scoped by `gameId` and `levelId`.
- BR-011-3: Each player appears at most once in a ranking, with the personal best retained by UC-010.
- BR-011-4: Higher scores rank first. For equal scores, the earlier achievement ranks first.
- BR-011-5: `limit` is an integer from 1 through 100, inclusive, and defaults to 10. Apply the limit after ordering.
- BR-011-6: Entries with the same score and identical recorded achievement timestamps share a rank. The next rank skips the positions occupied by the tie (for example, 1, 1, 3).

## Verification scenarios

- Both ranking types reject unauthenticated queries. With a valid session, an empty valid ranking returns `200`.
- Two players with equal scores but different achievement times appear in the expected order. A lower or equal retry does not alter the stored record or timestamp.
- With two players tied at the top on both score and recorded time, both are rank 1 and the next entry is rank 3.
- Scores from other variants or levels do not appear. A repeated attempt does not add another entry for the same player.
- Default limit is 10; 1 and 100 are accepted. Zero, 101 and fractional limits are rejected. Invalid scope and unknown variant follow the exception flows.
- A successful or failed read does not write to scores, progress or levels.

## Related specifications

- [API contract — Scores and leaderboard](../api-contract.md#scores-and-leaderboard).
- UC-010 (#56) supplies the retained score and achievement time. The ranking does not recompute or update them.
- Persistence and caching are outside this use case.
