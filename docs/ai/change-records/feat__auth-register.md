# Change record: feat/auth-register

Status: APPROVED
<!-- Only a human changes this line to "Status: APPROVED" (hooks block the agent from doing it). -->
Author(s): Ivifer1 with Claude Code (Claude Opus 5.5)
Date: 2026-11-11

## Spec and traceability
- Issue: #17 Add register endpoint
- Use case: UC-001 (`docs/specs/use-cases/UC-001-register.md`), business rules BR-001-1 to BR-001-6
- Requirements: FR-001, NFR-002 (consistent errors), NFR-003 (hashed passwords, no secrets in code), C-001
- API contract: `POST /auth/register` (`201`, `400` with `details`, `409 Username already taken`)
- Builds on #16 (`User`, `IUserRepository`, `MongoUserRepository`)

## Problem
Players cannot create an account. The contract says registration returns the user and an access token, so this change
also needs a way to hash passwords, to know the current time and to issue tokens. None of these exist yet, and the
API has no `/api/v1` prefix and no error body in the contract's shape.

## Proposed design

| Type | Kind | Layer | Responsibility (one sentence) |
| --- | --- | --- | --- |
| `Password` | value object | domain (`user/password.ts`) | A plain password that follows BR-001-2 (at least 8 characters); never stored. |
| `ErrorCode` | enum (changed) | domain | Adds `InvalidPassword` and `UsernameTaken`. |
| `IUseCase<TInput, TOutput>` | input port | application (`use-case.ts`) | One `execute(input)`; future AOP decorators (logging, caching) wrap it. |
| `IPasswordHasher` | output port | application (`ports/password-hasher.ts`) | `hash(password): Promise<PasswordHash>`. `verify` arrives with login (#18). |
| `IClock` | output port | application (`ports/clock.ts`) | `now(): Date`, so the use case never calls `new Date()`. |
| `ITokenIssuer` | output port | application (`ports/token-issuer.ts`) | `issueFor(user): Promise<AccessToken>`. Reused by login (#18). |
| `AccessToken` | application result type | application (`ports/token-issuer.ts`) | The token text and its lifetime in seconds. |
| `RegisterUseCase` | use case | application (`use-cases/register.use-case.ts`) | UC-001 steps 3–5: reject a taken username, hash, create, save, issue a token. |
| `ScryptPasswordHasher` | adapter | adapters (`security/scrypt-password-hasher.ts`) | Hashes with `scrypt` from `node:crypto` and a random salt per password. |
| `JwtTokenIssuer` | adapter | adapters (`security/jwt-token-issuer.ts`) | Signs a JWT (`sub`, `username`, `role`) with `@nestjs/jwt`. |
| `SystemClock` | adapter | adapters (`system/system-clock.ts`) | Returns the real current time. |
| `MongoUserRepository` | adapter (changed) | adapters | Translates MongoDB's duplicate-key error into `DomainError(UsernameTaken)` (E1). |
| `parseCredentials(body)` | request parser | adapters (`http/auth/credentials.request.ts`) | Builds `Username` and `Password` from the body and collects every invalid field (A1). |
| `RequestValidationError` | error | adapters (`http/request-validation.error.ts`) | Carries the `details` list of a `400`. |
| `AuthController` | controller | adapters (`http/auth/auth.controller.ts`) | `POST /auth/register`: parse, call the use case, map to the response. |
| `HttpErrorFilter` | exception filter | adapters (`http/http-error.filter.ts`) | Writes the contract's error body for `RequestValidationError` (`400`) and `DomainError` (`409` for `UsernameTaken`). |
| `readAuthConfig(env)` | function | infrastructure (`config/auth.config.ts`) | Reads `JWT_SECRET` (required) and `JWT_EXPIRES_IN` (seconds, default 604800). |
| `configureApp(app)` | function | infrastructure (`http/configure-app.ts`) | Sets the `/api/v1` prefix (except `/health`) and the error filter, for `main.ts` and the e2e tests alike. |
| `AuthModule` | NestJS module | infrastructure (`auth/auth.module.ts`) | Composition root: wires ports to adapters with `useFactory` and injection tokens. |

New dependency: `@nestjs/jwt@12.0.3` (official NestJS package; peer range accepts Nest 12; one month old, chosen over
12.0.4 published 5 days ago). Hashing needs no package: `scrypt` is built into Node.

Validation happens at the edge (adapters) but the rules live only once, in the value objects: `parseCredentials` calls
`Username.of` and `Password.of`, collects their `DomainError`s, and throws one `RequestValidationError` with a
`details` entry per invalid field. The use case receives `Username` and `Password`, already valid.

## Clean Architecture
- `adapters → application → domain`; `infrastructure → adapters`. All inwards.
- Ports declared in `application`: `IPasswordHasher`, `IClock`, `ITokenIssuer` (plus `IUserRepository` from #16).
  Adapters: `ScryptPasswordHasher`, `SystemClock`, `JwtTokenIssuer`, `MongoUserRepository`.
- `RegisterUseCase` imports nothing from NestJS, Mongoose, `node:crypto` or JWT.
- Wiring: `AuthModule` (imported by `AppModule`) registers `MongooseModule.forFeature` for users and builds every
  adapter and the use case with `useFactory`.

## SOLID
- **SRP:** the parser validates input, the use case runs UC-001, the controller maps HTTP, the filter writes errors.
- **OCP:** a new error code needs one more entry in the filter's table, not a new `if` in controllers.
- **ISP:** `IPasswordHasher` only has `hash` now; `verify` is added by #18 when login needs it.
- **DIP:** `RegisterUseCase` depends on four ports; NestJS injects the adapters.

## Design patterns
| Pattern | Participants (role → class) | Problem it solves here | Simpler alternative rejected and why |
| --- | --- | --- | --- |
| Adapter | Target → `IPasswordHasher` / `ITokenIssuer` / `IClock`; adapter → `ScryptPasswordHasher` / `JwtTokenIssuer` / `SystemClock` | The use case talks to crypto, JWT and time through its own interfaces. | Calling `scrypt`, `JwtService` or `new Date()` in the use case: couples the core to libraries and makes it untestable. |
| Command (input port) | `IUseCase` → `RegisterUseCase` | One shape for every use case, so AOP decorators (C-005) can wrap any of them later. | No interface: each decorator would be tied to one use case. |

## Extensibility and infrastructure independence
- A fifth variant does not touch registration.
- Changing scrypt for bcrypt or argon2 is a new `IPasswordHasher` adapter; changing JWT for another token is a new
  `ITokenIssuer` adapter. `RegisterUseCase` and the domain do not change.

## Alternatives considered
- **bcrypt instead of scrypt:** better known, but it is a native package (compiles on install) or a pure-JS port.
  `scrypt` is built into Node and recommended by OWASP, so no dependency.
- **`class-validator` DTOs for the `400`:** the NestJS default, but it is two new packages and repeats the username
  rule that `Username` already has. The parser reuses the value objects.
- **Hand-made JWT with `node:crypto`:** no dependency, but writing token signing by hand is a security risk.
- **Doing login (#18) first:** register would wait for the token issuer. Creating `ITokenIssuer` here lets #18 reuse it.
- **Full error format now (#20):** this change only covers the errors of UC-001 (`400` from the parser, `409`). #20
  extends the same filter to `401`, `403`, `404`, malformed JSON and `500` without leaks.

## Test plan
| Spec element | Test name | Level |
| --- | --- | --- |
| BR-001-2 | `should_throw_invalid_password_when_value_has_less_than_8_characters` | unit |
| BR-001-2 | `should_create_password_when_value_has_8_characters` | unit |
| Main flow, BR-001-4 | `should_save_player_with_hashed_password_when_username_is_free` | unit (fakes) |
| Main flow | `should_return_token_for_new_user_when_registration_succeeds` | unit (fakes) |
| A2 | `should_throw_username_taken_when_username_exists` | unit (fakes) |
| A2 | `should_not_save_when_username_exists` | unit (fakes) |
| Hasher | `should_verify_hash_when_password_matches` (round trip), `should_produce_different_hashes_when_same_password_is_hashed_twice` | unit |
| Token | `should_sign_token_with_user_id_username_and_role_when_issued` | unit |
| Config | `should_throw_when_jwt_secret_is_missing`, `should_default_expiry_to_7_days_when_not_set`, `should_throw_when_jwt_expiry_is_not_a_positive_integer` | unit |
| E1 | `should_throw_username_taken_when_username_is_taken` (replaces the generic reject test of #16, stronger) | integration |
| Main flow | `should_return_201_with_user_and_token_when_registration_succeeds` | e2e |
| BR-001-5 | `should_not_return_password_or_hash_when_registration_succeeds` | e2e |
| A1 | `should_return_400_with_details_for_each_invalid_field_when_body_is_invalid` | e2e |
| A1 | `should_return_400_when_body_fields_are_missing` | e2e |
| A2 | `should_return_409_when_username_is_taken` | e2e |
| Prefix | existing `/health` e2e still passes outside `/api/v1` | e2e |

## Open questions for the team
1. New dependency `@nestjs/jwt@12.0.3`: does the team agree? (harness rule: new dependency = ask the team first)
2. Maximum password length: none for now, as in the contract (see UC-001 open question).
3. `JWT_SECRET` in CI: the e2e setup file sets a fixed test value; production reads it from the environment.

## Implementation notes
Built as proposed, with these details and deviations:
- `ScryptPasswordHasher` stores `scrypt$<salt hex>$<key hex>` (16-byte random salt, 64-byte key). The planned
  round-trip test through `verify` was replaced by a test that recomputes the key with `node:crypto`, because `verify`
  is not part of the port until #18.
- Injection tokens: `REGISTER_USE_CASE` lives in `adapters/http/auth/auth.tokens.ts` (the controller needs it and
  adapters cannot import infrastructure); the port tokens live in `infrastructure/tokens.ts`.
- `auth.response.ts` (`AuthResponse`, `toAuthResponse`) was added to map the result to the contract's body; #18 reuses it.
- `HttpErrorFilter` receives `IClock` for the `timestamp`. A `DomainError` code without an entry in its table answers
  a generic `500` with no details.
- `MongoUserRepository.save` translates only the duplicate key on `username` (code 11000 + `keyPattern.username`);
  any other database error is rethrown untouched.
- A missing or non-string field answers `must be a string`; a field that breaks its rule answers the rule text.
- The e2e tests call `configureApp(app)`, the same function `main.ts` calls, so they cover the prefix and the filter.
- `.env.example` could not be edited by the AI (the harness denies access to env files): the team adds `JWT_SECRET`
  and `JWT_EXPIRES_IN` there by hand. README documents both.
- OpenAPI for this endpoint arrives with #21 (Swagger is not set up yet).

### Fixes after the independent security review (2026-11-11)
Verdict of the review: approve with notes. Ivifer1 approved fixing items 1, 3, 4, 5 and 6 in this PR.
1. scrypt cost raised to the OWASP minimum (N=2^17, r=8, p=1, `maxmem` 256 MiB) and stored inside the hash:
   `scrypt$<N>$<r>$<p>$<salt hex>$<key hex>`, so login (#18) reads the cost and the cost can be raised later
   without a migration. A hash now takes about 170 ms instead of 22 ms.
3. `JWT_SECRET` must have at least 32 bytes (RFC 7518, HS256); shorter secrets stop the app at startup.
4. `JWT_EXPIRES_IN` is capped at 2592000 seconds (30 days) and must be a safe integer. The cap is a new rule
   (BR-001-6 and the contract updated).
5. `HttpErrorFilter` also catches NestJS `HttpException`s (malformed JSON → 400, body over 100 kB → 413), so they
   follow the contract's error shape. It sends a fixed message and the standard reason phrase from
   `node:http` `STATUS_CODES`, never the framework's message, which could echo part of the input. 5xx answers
   the generic 500. Errors that are not `HttpException` keep NestJS's default handling until #20.
6. `Password` counts characters with `Intl.Segmenter` (graphemes): an emoji, even a composed one, is one character.
Not fixed here: item 2, a rate limit on `/auth/*`, needs a team decision (a hand-written guard or the new
dependency `@nestjs/throttler`) and goes to its own issue.

## Verification
- RED first: before `src/` changed, six suites failed with "Cannot find module" and the integration test
  `should_throw_username_taken_when_username_is_taken` failed (the repository threw the raw MongoDB error).
- `npm test`: 62 passed. `npm run test:e2e`: 15 passed. `npm run typecheck`, `npm run lint`, `npm run build`: clean.
- Rules broken on purpose, each restored afterwards:
  - Password minimum lowered to 7 → `should_throw_invalid_password_when_value_has_less_than_8_characters` failed.
  - Taken-username check removed from the use case → both `..._when_username_exists` unit tests failed.
  - Duplicate-key translation disabled → `should_throw_username_taken_when_username_is_taken` failed.
  - `409` changed to `400` in the filter → `should_return_409_when_username_is_taken` failed.
  - Password hash added to the response → `should_not_return_password_or_hash_when_registration_succeeds` failed.
  - Fixed salt → `should_produce_different_hashes_when_same_password_is_hashed_twice` failed.
  - `/health` put under the prefix → `should_keep_health_outside_the_api_prefix_when_app_is_configured` failed.
- Not verified: the server was not started against a real MongoDB; the e2e suite covers the same wiring in memory.
- design-reviewer subagent: not run; the diff was checked against `.claude/rules/`.
- Independent security review (separate agent, read-only, probed the running app): approve with notes.
- After the review fixes: RED first (8 new tests failed), then `npm test`: 70 passed, `npm run test:e2e`: 17 passed,
  typecheck, lint and build clean. Rules broken on purpose, each restored afterwards:
  - scrypt N lowered to 2^14 → `should_store_owasp_cost_parameters_when_hashed` failed.
  - Minimum secret length lowered to 1 → `should_throw_when_jwt_secret_is_shorter_than_32_bytes` failed.
  - Expiry cap removed → `should_throw_when_jwt_expiry_exceeds_30_days` failed.
  - Length counted in UTF-16 units → both emoji password tests failed.
  - `HttpException` not caught, or the framework message echoed → the malformed-JSON and 413 e2e tests failed.

## AI usage
- Tool and model: Claude Code (Claude Opus 5.5 for the spec and proposal, Claude Fable 5.2 for tests and code).
- Prompt: "sí, sigamos con el #17" (yes, let's continue with #17).
- The AI produced UC-001, this proposal, the tests, the use case, the ports, the adapters, the module and the docs.
- The team (Ivifer1) approved the proposal, including the new dependency, before any code under `src/` was written.
- Lesson: building request fields through the value objects keeps each rule in one place and still reports every
  invalid field in a single `400`.
