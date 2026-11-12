# UC-002 Player signs in

| Field | Value |
| --- | --- |
| ID | UC-002 |
| Primary actor | Player (registered, without a session) |
| Goal | The player gets an access token to sync progress and submit scores |
| Status | Draft |
| Linked requirements | FR-002, NFR-002, NFR-003 |
| Entities | User, Session / Token |

## Preconditions
- The player registered (UC-001).

## Trigger
- The player sends `POST /api/v1/auth/login` with a username and a password.

## Main success scenario
1. Player sends a username and a password.
2. System checks that the username follows BR-001-1 and the password follows BR-001-2.
3. System finds the user with that username.
4. System checks that the password matches the stored hash (BR-002-1).
5. System responds `200` with the user (`id`, `username`, `role`), an access token and its lifetime in seconds
   (BR-001-6).

## Alternative flows
- **A1 (at step 2) Username or password breaks a rule:** 1. System responds `400` with one entry in `details` per
  invalid field. 2. Use case ends without a token.
- **A2 (at step 3) No user has that username:** 1. System responds `401` with the message `Invalid credentials`
  (BR-002-2). 2. Use case ends without a token.
- **A3 (at step 4) The password does not match:** 1. System responds `401` with the message `Invalid credentials`
  (BR-002-2). 2. Use case ends without a token.

## Postconditions
- Success: the response token identifies the user and carries their role.
- Failure: no token is issued; stored users are unchanged.

## Business rules
- BR-002-1: The password is compared with the stored hash using the cost stored inside that hash.
- BR-002-2: A wrong username and a wrong password get the same status, the same message and a similar response
  time, so the API does not reveal which usernames exist.

## Open questions
- Brute force: without a per-IP rate limit, anyone can try passwords without limit. The rate limit is a pending
  team decision (security review of #17, item 2).
