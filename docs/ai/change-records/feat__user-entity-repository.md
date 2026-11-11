# Change record: feat/user-entity-repository

Status: APPROVED
<!-- Only a human changes this line to "Status: APPROVED" (hooks block the agent from doing it). -->
Author(s): Ivifer1 with Claude Code (Claude Opus 5.5)
Date: 2026-11-11

## Spec and traceability
- Issue: #16 Add user entity and repository
- Requirements: FR-001, FR-002 (users that register and sign in), NFR-003 (passwords stored only as hashes),
  NFR-004 (integration tests on an in-memory database), C-001 (dependency rule)
- API contract: `docs/specs/api-contract.md`, section Auth (username rules, roles `player` and `admin`)
- Design source: class diagram tabs B1 (`User`, `UserId`, `Username`, `PasswordHash`, `Role`, `Optional`),
  B3 (`IUserRepository`) and B5 (`MongoUserRepository`, `UserDocument`, `UserMapper`)
- Use cases: none yet. UC-001 (register) arrives with #17 and is the first consumer of this change.

## Problem
Registration (#17) and login (#18) need a `User` that protects its own rules and a way to store and find users.
Nothing exists yet: there is no user type in the domain, no repository port, and no MongoDB collection for users.
The domain must stay free of primitives (team rule: only `boolean` is allowed) and free of Mongoose.

## Proposed design

| Type | Kind | Layer | Responsibility (one sentence) |
| --- | --- | --- | --- |
| `Optional<T>` | value object (generic) | domain (`shared/optional.ts`) | Models a value that may be absent, so no `null`/`undefined` crosses the domain. |
| `DomainError` | class | domain (`shared/domain-error.ts`) | Error raised when an invariant breaks; carries an `ErrorCode`, the HTTP text is built later by the error filter (#20). |
| `ErrorCode` | enum | domain (`shared/error-code.ts`) | Stable codes: `InvalidUserId`, `InvalidUsername`, `InvalidPasswordHash`. |
| `UserId` | value object | domain (`user/user-id.ts`) | Opaque user identity; rejects a blank value. |
| `Username` | value object | domain (`user/username.ts`) | Enforces the contract rule: 3–20 characters, lowercase letters, digits and `_`. |
| `PasswordHash` | value object | domain (`user/password-hash.ts`) | Holds an already hashed password; rejects a blank value. Never holds the plain password. |
| `Role` | enum | domain (`user/role.ts`) | `Player` and `Admin`. |
| `User` | aggregate root | domain (`user/user.ts`) | A registered player; `create(...)` always starts as `Player`, `restore(...)` rebuilds a stored user, `isAdmin()`. |
| `IUserRepository` | output port | application (`ports/user-repository.ts`) | `nextId()`, `findById(id)`, `findByUsername(username)`, `save(user)`. |
| `UserDocument` / `UserSchema` | Mongoose schema | adapters (`persistence/mongo/user.schema.ts`) | Stored shape; unique index on `username`. |
| `UserMapper` | mapper | adapters (`persistence/mongo/user.mapper.ts`) | `toDomain(doc)` and `toDocument(user)`. |
| `MongoUserRepository` | adapter | adapters (`persistence/mongo/mongo-user.repository.ts`) | Implements `IUserRepository` with a Mongoose model. |

How each value object exposes its value: a static factory `of(raw: string)` validates and builds it, and `toString()`
returns the raw value. The raw `string` only exists in those two edges (input and output of the value object), which
the mapper and the DTOs need; inside the domain, every signature uses the value object. `equals(other)` compares two
values of the same type.

Two changes from the diagram, both needed to keep the domain pure:
- `User.create(id, username, passwordHash, createdAt)` receives the id and the date. The domain rules forbid
  `new Date()` and random ids inside entities, so the use case (#17) asks the repository for `nextId()` and the clock
  for the date.
- `User.restore(...)` is added so the mapper can rebuild a stored user (including an `Admin`) without going through
  the "new users are players" rule of `create`.

## Clean Architecture
- New dependencies: `adapters → application → domain` and `adapters → mongoose / @nestjs/mongoose`. Nothing new in
  `infrastructure`. All point inwards.
- Port declared in `application`: `IUserRepository`. Adapter in `adapters`: `MongoUserRepository`.
- Wiring: none in this change. Nothing consumes the port yet; #17 adds the injection token and the module that
  provides `MongoUserRepository` (wiring it now would be unused code).
- The existing oxlint rules already forbid Mongoose in `domain` and `application`; they stay untouched.

## SOLID
- **SRP:** each value object guards one rule; `UserMapper` only translates; `MongoUserRepository` only reads and writes.
- **ISP:** `IUserRepository` has only the four operations that #17–#19 need, not a generic CRUD interface.
- **DIP:** use cases will depend on `IUserRepository` (application), never on `MongoUserRepository` or Mongoose.
- **LSP:** any implementation of `IUserRepository` (Mongo, or the in-memory fake used by unit tests in #17) must pass
  the same expectations; the integration tests pin them for Mongo.

## Design patterns
| Pattern | Participants (role → class) | Problem it solves here | Simpler alternative rejected and why |
| --- | --- | --- | --- |
| Repository | Repository → `IUserRepository`; concrete repository → `MongoUserRepository` | Use cases store and find users without knowing MongoDB. | Calling the Mongoose model from use cases: couples the core to the database and breaks C-001. |
| Adapter | Target → `IUserRepository`; adaptee → Mongoose `Model<UserDocument>`; adapter → `MongoUserRepository` | Translates the Mongoose API into the port the core speaks. | — (it is the same class seen from the GoF side; listed because the diagram marks it «Adapter»). |
| Data Mapper | `UserMapper` | Keeps the domain `User` and the stored `UserDocument` independent. | Mongoose decorators on `User`: forbidden by the domain rules (no persistence annotations). |
| Factory method | `User.create`, `User.restore`, `Username.of`… | Objects can only be built through the method that checks the rules. | Public constructors: anyone could build an invalid user. |

## Extensibility and infrastructure independence
- A fifth variant does not touch users at all.
- A new user rule (for example a longer username) changes only `Username`.
- Swapping MongoDB for another database: a new class implementing `IUserRepository` plus its mapper. Files that would
  NOT change: everything in `domain/` and `application/`.

## Alternatives considered
- **The database assigns the id on `save`:** `User` would need an "id not assigned yet" state (an `Optional<UserId>`
  everywhere). `nextId()` in the port keeps the id mandatory from the start. Cost: one more method in the port.
- **Value objects expose `.value` instead of `toString()`:** shorter, but a public primitive field breaks the team
  rule that the primitive is private.
- **Integration tests in a third Vitest config (`*.int-spec.ts` + `test:int` script):** cleaner separation, but it
  means editing CI. Proposed instead: the e2e config also picks up `*.int-spec.ts` files, so `npm run test:e2e` runs
  integration and e2e tests with the same in-memory MongoDB and CI does not change. This answers open question 1 of
  the previous change record (#15).

## Test plan
| Spec element | Test name | Level |
| --- | --- | --- |
| Username 3–20 chars, lowercase, digits, `_` | `should_create_username_when_value_follows_the_rules` | unit |
| Username too short | `should_throw_invalid_username_when_value_has_less_than_3_characters` | unit |
| Username too long | `should_throw_invalid_username_when_value_has_more_than_20_characters` | unit |
| Username with forbidden characters | `should_throw_invalid_username_when_value_has_uppercase_or_symbols` | unit |
| UserId not blank | `should_throw_invalid_user_id_when_value_is_blank` | unit |
| PasswordHash not blank | `should_throw_invalid_password_hash_when_value_is_blank` | unit |
| Value object equality | `should_be_equal_when_both_usernames_have_the_same_value` | unit |
| New users are players | `should_create_player_when_user_is_created` | unit |
| Admin check | `should_report_admin_when_user_is_restored_as_admin` | unit |
| Optional present / empty | `should_return_value_when_optional_is_present`, `should_return_fallback_when_optional_is_empty` | unit |
| Reading an empty Optional fails | `should_throw_when_getting_value_of_empty_optional` | unit |
| Save and find by id | `should_find_saved_user_when_searching_by_id` | integration |
| Save and find by username | `should_find_saved_user_when_searching_by_username` | integration |
| Unknown user | `should_return_empty_when_username_does_not_exist` | integration |
| Usernames are unique in storage | `should_reject_second_user_when_username_is_taken` | integration |
| Saving twice updates, does not duplicate | `should_update_user_when_saved_again` | integration |
| Ids are unique | `should_return_different_ids_when_next_id_is_called_twice` | integration |
| Domain stays free of Mongoose | existing `layer-boundaries.spec.ts` | architecture |

## Open questions for the team
1. Is `toString()` acceptable to the professor as the only exit of the raw value of a value object? It is the minimum
   possible: something must hand a `string` to MongoDB and to the JSON response.
2. When two people register the same username at the same time, MongoDB's unique index rejects the second one. The
   translation of that error into `409 Username already taken` belongs to #17 (with the use case and its typed error);
   this change only guarantees that the index exists.

## Implementation notes
Built as proposed, with these details:
- Domain files: `src/domain/shared/` (`optional.ts`, `domain-error.ts`, `error-code.ts`) and `src/domain/user/`
  (`user.ts`, `user-id.ts`, `username.ts`, `password-hash.ts`, `role.ts`). Port: `src/application/ports/user-repository.ts`.
  Adapter: `src/adapters/persistence/mongo/` (`user.schema.ts`, `user.mapper.ts`, `mongo-user.repository.ts`).
- `User` copies `createdAt` on the way in and on the way out, so a caller that mutates its `Date` cannot change the
  user (immutability). This is a copy, not a clock read; the domain still never asks for the current time.
- `UserId` holds the MongoDB `ObjectId` as a 24-character hex string, stored in `_id` as a string. `nextId()` creates
  it with `new Types.ObjectId()`, so ids are unique without a round trip to the database.
- `save` is `replaceOne(..., { upsert: true })`: it creates or replaces by id. A duplicate username with a different id
  hits the unique index and rejects (MongoDB error E11000); #17 translates it into `409`.
- `UserMapper.toDomain` rebuilds through the value objects, so corrupt stored data fails loudly instead of creating an
  invalid `User`. An unknown stored role throws.
- `Optional.get()` on an empty value throws a plain `Error`: it is a programming mistake, not a broken business rule,
  so it has no `ErrorCode`.
- `vitest.config.e2e.ts` now includes `**/*.int-spec.ts`; CI is unchanged.
- No wiring in `infrastructure` (as proposed): #17 adds the injection token and the provider.

## Verification
- RED first: before `src/` changed, the new unit and integration suites failed with "Cannot find module".
- `npm test`: 43 passed (19 new). `npm run test:e2e`: 9 passed (7 new integration + 2 existing e2e).
- `npm run typecheck`, `npm run lint`, `npm run build`: clean.
- Rules broken on purpose, each one restored afterwards:
  - Username minimum lowered to 2 → `should_throw_invalid_username_when_value_has_less_than_3_characters` failed.
  - `User.create` builds an `Admin` → `should_create_player_when_user_is_created` failed.
  - Unique index removed → `should_reject_second_user_when_username_is_taken` failed.
  - `upsert: false` → 4 integration tests failed (save no longer stores new users).
- design-reviewer subagent: not run; the diff was checked against `.claude/rules/` (domain, application, adapters,
  testing) and the existing architecture test.

## AI usage
- Tool and model: Claude Code (Claude Opus 5.5).
- Prompt: "sigamos con lo que nos falta" (let's continue with what is left), which led to issue #16.
- The AI produced this proposal from the class diagram (tabs B1, B3, B5), the tests, the domain types, the port, the
  Mongo adapter and the Vitest config change.
- The team (Ivifer1) reviewed and approved the proposal before any code under `src/` was written.
- Lesson: `nextId()` in the repository port keeps the id mandatory in `User` and keeps the domain free of random
  ids, at the cost of one extra method in the port.
