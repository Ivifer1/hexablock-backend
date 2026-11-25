# Change record: feat/bootstrap-first-admin

Status: APPROVED
<!-- Only a human changes this line to "Status: APPROVED". -->
Author(s): Ivifer Pita
Date: 2026-11-21

## Spec and traceability
- Issue: #33.
- Use case: UC-006 (approved).
- Requirements: FR-001, FR-009, NFR-002, NFR-003.
- Business rules: BR-006-1 through BR-006-4.

## Problem
The API contract requires the first administrator to be created by a setup script. Existing registration always
assigns `player`. The ordinary repository saves with a replacement upsert; using it for bootstrap could overwrite
state and cannot reserve the first-admin slot. The command can be built from `main` without the #32 routes.

## Proposed design
| Type | Kind | Layer | Responsibility |
| --- | --- | --- | --- |
| `User.createFirstAdministrator` | Named factory | Domain | Construct an admin in this flow without changing player registration or restore. |
| `BootstrapFirstAdministratorUseCase` | Use case | Application | Apply bootstrap-only rules and reuse existing validation, password hash and clock. |
| `IInitialAdministratorRepository` | Intent-named port | Application | Represent the bootstrap identity and an insert-only operation with explicit outcomes. |
| `MongoInitialAdministratorRepository` | Adapter | Persistence | Check for an existing admin and required uniqueness, then insert using the reserved bootstrap identity. |
| Bootstrap entry point | Command | Infrastructure | Parse the target and username, take private password input, compose dependencies, handle exit status and close MongoDB. |

## Clean Architecture
- The command composes the new use case with `ScryptPasswordHasher`, `SystemClock` and the Mongo adapter.
  Dependencies point infrastructure → adapters/application → domain. No JWT service or HTTP module is required.
- Reuse `Username`, `Password`, `UserMapper` and the existing users collection. Leave `IUserRepository.save`
  and `User.create` unchanged. Do not call `User.restore` to construct the new admin.
- Validate input before writes. Require an explicit `MONGODB_URI` for the intended database; do not fall back to the driver's default or
  silently load a local `.env`. Read one bounded password line from non-TTY stdin. Strip only its
  terminator, preserve password whitespace, and reject missing or extra lines. Do not echo or log any secret, driver error
  payload, URI or password hash.
- Open only the needed connection. Disable automatic collection/index creation in the bootstrap path. On the
  primary, require the existing unconditional unique `{ username: 1 }` index with the intended simple
  comparison semantics. Deployment/index setup and live execution are separate operations, not approved here.
- The admin precheck blocks bootstrap when an administrator already exists. The insert uses a single stable,
  reserved user ID outside the regular ID generator's output. On the supported unsharded collection, MongoDB's
  unique `_id` constraint is the atomic gate across concurrent command invocations with different usernames.
  The username index covers races with normal signup. Never replace/upsert or assume which index reports a
  conflict first. On a recognized collision, inspect stored state without modifying it. An external writer
  outside this command is outside this guarantee.
- Return a nonzero status on input, prerequisite, conflict or unconfirmed write outcomes. Report success only on
  a confirmed insert. After an unconfirmed result, an operator verifies state before deciding whether to rerun.

## SOLID
- **SRP:** CLI input/output, bootstrap orchestration and persistence are separate.
- **ISP / DIP:** The narrow port adds no write permissions to ordinary signup and keeps Mongo behavior out of the
  use case. The use case depends on the existing password hash and clock ports.

## Design patterns
| Pattern | Participants | Problem solved | Alternative rejected |
| --- | --- | --- | --- |
| Repository / Adapter | Bootstrap port → Mongo adapter | Expose insert-only behavior and storage outcomes without leaking Mongo. | Reuse `save`: it replaces as well as inserts. |
| Named factory | `User.createFirstAdministrator` | Distinguish operator provisioning from public registration. | Generic role argument or setter: widens who can construct privileged accounts. |

## Extensibility and infrastructure independence
- Game variants, controllers and guards do not change. No game-specific logic belongs in this flow.
- A different database would implement reserve-and-insert semantics behind the same port. The reserved ID is
  a persistence convention, not a domain rule requiring a Mongo ID type.

## Alternatives considered
- A read-before-write guard alone lets two invocations insert different admins. The reserved ID closes that gap.
- A unique role index would also constrain any future authorized admin-management feature. A multi-document
  transaction plus marker would expand storage requirements for this one-account setup.
- Promoting an existing account broadens the authorization scope and is not proposed.

## Test plan
| Spec scenario | Test | Level |
| --- | --- | --- |
| Successful bootstrap and existing login | `should_create_one_admin_when_bootstrap_runs_against_an_empty_users_collection` | CLI + isolated Mongo / login |
| Invalid input | `should_leave_users_unchanged_when_target_or_credentials_are_invalid` | CLI |
| Already initialized | `should_not_reset_credentials_when_an_administrator_already_exists` | Integration |
| Name conflict | `should_not_promote_or_replace_when_the_username_is_taken` | Integration |
| Reserved identity collision | `should_leave_existing_document_intact_when_the_reserved_id_is_taken` | Integration |
| Concurrent attempts | `should_insert_one_admin_when_two_bootstraps_race_with_different_names` | Integration |
| Constraint not ready | `should_fail_without_writing_when_the_username_index_is_not_unique` | Integration |
| Secret handling | `should_not_disclose_secrets_when_the_command_fails` | CLI |
| Existing API | `should_still_register_only_players_when_using_public_signup` | Existing auth regression |

## Open questions for the team
- The operator policy was approved with UC-006. This does not authorize a run against any deployed database.
- Confirm the supported deployment shape when authorizing any operational run; sharded users collections and
  concurrent out-of-band administrator changes are outside this proposal.

## Implementation notes
The standalone CLI composes a raw scoped driver connection with existing adapters. Loading the Mongo driver
via Mongoose does not register any model and therefore does not provision indexes. The Mongo client pins primary
reads, majority acknowledgment, disables retryable writes and suppresses driver command logs to protect stored
hash data even when debug logging is enabled in the environment. No deployment or live run was performed.

## Verification
- RED (missing command) observed before implementation.
- GREEN: 233 unit/architecture and 74 integration/e2e tests, plus typecheck, lint and build.
- Independent compiled CLI checks passed against in-memory MongoDB: explicit database, no overwrite,
  expected exit codes and no secret output even with ambient debug logging.
- Five isolated mutations were detected: missing shared identity, unsafe index acceptance, overwrite,
  claiming success when confirmation is lost, and unbounded-at-the-threshold input.
- No deployment, live database access or publication.

## AI usage
See the UC-006 entry in AI_USAGE.md for design, implementation and verification.
