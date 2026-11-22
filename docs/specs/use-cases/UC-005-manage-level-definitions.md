# UC-005 Manage level definitions as an administrator

| Field | Value |
| --- | --- |
| ID | UC-005 |
| Primary actor | Administrator |
| Goal | Create, replace, or delete a level definition without releasing a new client. |
| Status | Approved |
| Linked requirements | FR-009, FR-010, NFR-002, NFR-003, NFR-004 |
| Entities | User, GameId, Level |

## Preconditions

- The API is available. Level writes are enabled only after the required uniqueness constraints are ready.

## Trigger

- An administrator submits a new level, a full replacement, or a request to remove a level.

## Main success scenario

1. The administrator submits a valid token and sends `POST /api/v1/levels` with a definition in the documented level format.
2. The API authenticates the request and authorizes it using the current stored role, not a role from the token.
3. The API validates and creates the level without overwriting another definition.
4. The API returns `201` with the stored level in the public level format.

## Alternative flows

- **A1 (at steps 1–4) — Replace:** Send `PUT /api/v1/levels/{id}` with the full definition and matching body/path IDs. The API replaces an existing level only and returns `200` with that level. It never inserts through PUT.
- **A2 (at steps 1–4) — Delete:** Send `DELETE /api/v1/levels/{id}`. The API deletes the existing level and returns `204` without a response body.
- **A3 (at step 2) — Missing or invalid credential, or account deleted:** The API returns `401`; it does not write.
- **A4 (at step 2) — Current stored role is not admin:** The API returns `403`; it does not write.
- **A5 (at step 3) — Invalid level format, unsupported body game, or malformed/mismatching PUT IDs:** The API returns `400`; it does not write.
- **A6 (at step 3) — POST ID already exists:** The API returns `409`, preserving the existing level.
- **A7 (in A1 or A2) — Level does not exist:** The API returns `404`; it does not write. A malformed DELETE ID uses the same response.
- **A8 (at step 3 or in A1) — Order already occupied within the game:** The API returns `409`; it preserves both the submitted target and the level occupying the order.
- **A9 (at step 3, after valid input) — Write readiness cannot be verified:** The API returns a generic `500` without performing a write. Public reads are unaffected.

## Postconditions

- Success: only the requested level changes. The API preserves uniqueness of IDs and of order within a game.
- Failure: neither the requested level nor a conflicting level is changed.

## Business rules

- BR-005-1: Only users with the current stored administrator role may write levels.
- BR-005-2: Validate the common format and the registered variant section without adding per-game logic to the routes or use cases.
- BR-005-3: Creation never overwrites, replacement never inserts, and deletion returns no body.
- BR-005-4: Level IDs are globally unique. Order is unique within a game; another game may use the same order.

## Open questions

- The user confirmed `409` for occupied order in POST and PUT. The boundary conventions and write-readiness flow in this draft are submitted for joint approval with the design.

References: [#32](https://github.com/Ivifer1/hexablock-backend/issues/32), [API contract — levels](../api-contract.md#levels), [level format](../level-format.md).
