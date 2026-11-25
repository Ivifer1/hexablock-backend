# UC-006 Provision the first administrator

| Field | Value |
| --- | --- |
| ID | UC-006 |
| Primary actor | Operator with authorized access to the target database |
| Goal | Provision the first administrator without using the public registration API |
| Status | Approved |
| Linked requirements | FR-001 (registration stays player-only), FR-009 (admin level writes), NFR-002, NFR-003 |
| Entities | User |

## Preconditions
- The operator supplies the authorized target database explicitly. The script never defaults to a database.
- The supported deployment has an unsharded users collection and the expected unique username constraint.

## Trigger
- The operator runs the dedicated bootstrap command and supplies a username and a password through private input.

## Main success scenario
1. The script validates the arguments, credentials and storage prerequisites.
2. It confirms no administrator is present and attempts a single insert for the first administrator.
3. It confirms creation without printing credentials or issuing a JWT. The new account can sign in through the
   existing login endpoint.

## Alternative flows
- **A1 Invalid input or missing target:** Reject the request without writing anything.
- **A2 Administrator already present:** Report that nothing changed. Rerunning the command does not reset
  credentials, even for the same username.
- **A3 Username already taken:** Reject the request. Do not promote, overwrite or delete the account.
- **A4 Concurrent bootstrap:** At most one invocation can create the first administrator. Report a safe conflict
  for a losing invocation. This guarantee covers this command, not direct writes by other administrative tools.

## Exception flows
- **E1 Missing, unsuitable or unreadable username index:** Fail closed. Do not create or modify indexes.
- **E2 Database or I/O failure:** Report a sanitized failure and close the connection. If an insert result cannot
  be confirmed, report the outcome as uncertain; do not retry the write blindly or claim the database is unchanged.

## Postconditions
- Confirmed success: the new account has role `admin` and only a password hash is stored.
- Rejected input or conflict: the command does not change any user or index.
- Public signup still creates only players. This command does not create an HTTP route or need the #32 routes.

## Business rules
- BR-006-1: Provision only the first administrator via an operator command; no role may be selected through signup.
- BR-006-2: Reuse normal username and password rules; never echo, log, store or pass the plaintext password as a
  command-line argument or password environment variable.
- BR-006-3: Insert only. Do not promote users, overwrite credentials, or create another admin through this command.
- BR-006-4: A single reserved bootstrap identity and the existing username constraint protect concurrent inserts
  on the supported collection.

## Open questions
- The approved policy is account creation (no promotion), private stdin and closed failure without the safe index.
  Confirm the target deployment prerequisites separately before an operational run.
