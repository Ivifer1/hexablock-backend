# UC-003 Signed-in player reads their own account

| Field | Value |
| --- | --- |
| ID | UC-003 |
| Primary actor | Player (signed in) |
| Goal | The player confirms who they are signed in as, with their role |
| Status | Draft |
| Linked requirements | FR-002, NFR-002, NFR-003 |
| Entities | User, Session / Token |

## Preconditions
- The player has an access token from UC-001 or UC-002.

## Trigger
- The player sends `GET /api/v1/auth/me` with the header `Authorization: Bearer <accessToken>`.

## Main success scenario
1. Player sends the request with their access token.
2. System checks that the token is valid and not expired (BR-003-1).
3. System finds the user the token identifies.
4. System responds `200` with `id`, `username` and `role`.

## Alternative flows
- **A1 (at step 2) The header is missing, is not `Bearer <token>`, or the token is invalid or expired:**
  1. System responds `401` with the message `Authentication required` (BR-003-2). 2. Use case ends.
- **A2 (at step 3) The user the token identifies no longer exists:** 1. System responds `401` with the message
  `Authentication required`. 2. Use case ends.

## Postconditions
- Success: the response describes the user the token identifies; nothing is stored or changed.
- Failure: nothing is stored or changed.

## Business rules
- BR-003-1: A token is valid only if it was signed by this API with its secret and the HS256 algorithm, and its
  expiry time has not passed.
- BR-003-2: Every rejected token gets the same answer, whatever the reason (missing, malformed, wrong signature,
  expired, unknown user).
- BR-003-3: The same check protects every route marked 🔒 in the API contract.

## Open questions
- None.
