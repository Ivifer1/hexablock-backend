# UC-004 Read public level definitions

| Field | Value |
| --- | --- |
| ID | UC-004 |
| Primary actor | Player, via the client |
| Goal | Load levels for a variant or fetch one level without signing in. |
| Status | Approved |
| Linked requirements | FR-008, FR-010, NFR-002, NFR-004 |
| Entities | GameId, Level |

## Preconditions

- The client can reach the API. No session or token is required.

## Trigger

- The client needs to display a variant's level list or load a particular level.

## Main success scenario

1. The client sends `GET /api/v1/levels?gameId=<gameId>`.
2. The API returns `200` with `{ "items": [...] }`, containing only levels for that game.
3. The client receives the list ordered by ascending `order`.

## Alternative flows

- **A1 (instead of step 1) — Read a specific level:** The client sends `GET /api/v1/levels/{id}`. If a level with that ID exists, the API returns `200` with that level.
- **A2 (at step 2) — Missing or malformed `gameId`:** The API returns `400` using the existing error envelope.
- **A3 (at step 2) — Unknown game or game without level support:** The API returns `404` using the existing error envelope.
- **A4 (in A1) — Malformed or unknown level ID:** The API returns `404` using the existing error envelope.
- **A5 (at step 2) — Supported game without stored levels:** The API returns `200` with `{ "items": [] }`.

## Postconditions

- Success: the client receives level definitions in the documented format.
- Failure: the client receives an HTTP error; no level is changed in either outcome.

## Business rules

- BR-004-1: Both reads are public.
- BR-004-2: List responses contain no levels from another game and preserve ascending `order`.
- BR-004-3: Returned levels follow the common-plus-variant format in [Level format](../level-format.md).

## Open questions

- None identified in this draft.

## Verification scenarios

- Public list without token; filter by game and order.
- Public lookup without a token returns a found level; both an unknown ID and a malformed ID return `404`.
- Missing or malformed `gameId` produces `400`.
- An unknown game or a known game without level support produces `404`.
- A supported game without stored levels produces `200` with `{ "items": [] }`.

References: [#31](https://github.com/Ivifer1/hexablock-backend/issues/31), [API contract — levels](../api-contract.md#levels).
