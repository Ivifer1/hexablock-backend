# UC-001 Player registers and is signed in

| Field | Value |
| --- | --- |
| ID | UC-001 |
| Primary actor | Player (not registered) |
| Goal | The player owns an account and is signed in, ready to sync progress and submit scores |
| Status | Draft |
| Linked requirements | FR-001, NFR-002, NFR-003 |
| Entities | User, Session / Token |

## Preconditions
- The player has no session.

## Trigger
- The player sends `POST /api/v1/auth/register` with a username and a password.

## Main success scenario
1. Player sends a username and a password.
2. System checks that the username follows the rules (BR-001-1) and the password follows the rules (BR-001-2).
3. System checks that no user has that username (BR-001-3).
4. System stores the user with the role `player` and the password hashed (BR-001-4, BR-001-5).
5. System responds `201` with the user (`id`, `username`, `role`), an access token and its lifetime in seconds.

## Alternative flows
- **A1 (at step 2) Username or password breaks a rule:** 1. System responds `400` with one entry in `details` per
  invalid field. 2. Use case ends with no user stored.
- **A2 (at step 3) Username already taken:** 1. System responds `409` with the message `Username already taken`.
  2. Use case ends with the stored users unchanged.

## Exception flows
- **E1 (at step 4) Another registration with the same username is stored first:** System responds `409` with the
  message `Username already taken`; only the first user remains stored.

## Postconditions
- Success: exactly one user with that username exists, with role `player`, and the response token identifies them.
- Failure: the stored users are unchanged.

## Business rules
- BR-001-1: A username has 3 to 20 characters, and each character is a lowercase letter, a digit or `_`.
- BR-001-2: A password has at least 8 characters.
- BR-001-3: Usernames are unique.
- BR-001-4: A new user always has the role `player`; registration never creates an `admin`.
- BR-001-5: The password is stored only as a hash; the response never contains the password or the hash.
- BR-001-6: The access token lasts 604800 seconds (7 days) unless configuration sets another value.

## Open questions
- The contract sets no maximum password length. A maximum (for example 128) would limit the cost of hashing a huge
  input. Options: no maximum (contract as is), or add one to the contract.
