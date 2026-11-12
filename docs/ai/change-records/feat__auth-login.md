# Change record: feat/auth-login

Status: APPROVED
<!-- Only a human changes this line to "Status: APPROVED" (hooks block the agent from doing it). -->
Author(s): Ivifer1 with Claude Code (Claude Opus 5.5)
Date: 2026-11-11

## Spec and traceability
- Issue: #18 Add login endpoint issuing JWT
- Use case: UC-002 (`docs/specs/use-cases/UC-002-login.md`), BR-002-1, BR-002-2; reuses BR-001-1, BR-001-2, BR-001-6
- Requirements: FR-002, NFR-002, NFR-003, C-001
- API contract: `POST /auth/login` (`200` with the register response, `400`, `401 Invalid credentials`)
- Class diagram: tab B2 (`LoginUseCase`), B3 (`IPasswordHasher.verify`), B4 (`AuthController.login`), B5
  (`ScryptPasswordHasher.verify`). Builds on #17.

## Problem
Registered players cannot sign in again: there is no way to check a password against its stored hash and no login
endpoint. The contract asks for the same response as register and one `401` for any wrong credential.

## Proposed design

| Type | Kind | Layer | Responsibility (one sentence) |
| --- | --- | --- | --- |
| `ErrorCode.InvalidCredentials` | enum value (changed) | domain | Wrong username or wrong password. |
| `IPasswordHasher.verify(password, hash)` | port method (changed) | application | `Promise<boolean>`: does the password match the hash? |
| `LoginUseCase` | use case | application (`use-cases/login.use-case.ts`) | UC-002 steps 3–5 with `IUserRepository`, `IPasswordHasher`, `ITokenIssuer`; `IUseCase<Credentials, AuthResult>`. |
| `ScryptPasswordHasher.verify` | adapter method (changed) | adapters | Reads N, r, p, salt and key from the stored hash, recomputes and compares in constant time (`timingSafeEqual`). |
| `AuthController.login` | controller method (changed) | adapters | `POST /auth/login`, `200`; same parser and response mapper as register. |
| `HttpErrorFilter` table | (changed) | adapters | New row `InvalidCredentials` → `401 Unauthorized`, message `Invalid credentials`. |
| `LOGIN_USE_CASE` | injection token | adapters (`auth.tokens.ts`) | Hands the controller its use case. |
| `AuthModule` | module (changed) | infrastructure | Builds `LoginUseCase` with `useFactory`. |

Equal answers for both failures (BR-002-2): when the username does not exist, the use case still hashes the given
password once and discards it, so both failures cost about one scrypt run (~170 ms). Without it, an unknown
username would answer in ~1 ms and reveal that it does not exist.

`verify` rejects a stored hash with an unknown format or a cost out of range by throwing an error (500, logged on
the server) instead of answering `401`: a corrupt stored hash is a bug to see, not a wrong password.

## Clean Architecture
- `adapters → application → domain`; `infrastructure → adapters`. All inwards.
- No new port: `verify` is added to `IPasswordHasher` (it was planned in the diagram since the start; ISP held it
  back until a use case needed it).
- `LoginUseCase` imports no NestJS, Mongoose, crypto or JWT.

## SOLID
- **SRP:** `LoginUseCase` only runs UC-002; comparing hashes lives in the hasher adapter.
- **OCP:** the new error is one more row in the filter table; register is not touched.
- **LSP:** `LoginUseCase` and `RegisterUseCase` are interchangeable behind `IUseCase<Credentials, AuthResult>`.
- **DIP:** the use case depends on three ports.

## Design patterns
| Pattern | Participants | Problem it solves here | Simpler alternative rejected and why |
| --- | --- | --- | --- |
| Adapter (existing) | `ScryptPasswordHasher` behind `IPasswordHasher` | The use case compares passwords without knowing scrypt. | Comparing in the use case: couples the core to `node:crypto`. |

## Extensibility and infrastructure independence
- Changing the hashing algorithm: a new adapter can read the algorithm name at the start of the stored hash and
  keep verifying old scrypt hashes. `LoginUseCase` does not change.

## Alternatives considered
- **Comparing keys with `===`:** simpler, but its time depends on how many characters match; `timingSafeEqual` does not.
- **A fixed dummy hash for unknown usernames:** same goal as hashing the given password, but it needs a hash string
  in the code that must follow the current cost. Hashing the given password always uses the current cost.
- **Login skips the format rules and answers 401 for any input:** possible, but the contract says "same body as
  register" and lists `400`; reusing the parser keeps one validation for both endpoints.

## Test plan
| Spec element | Test name | Level |
| --- | --- | --- |
| BR-002-1 | `should_verify_when_password_matches_hash` | unit (adapter) |
| BR-002-1 | `should_not_verify_when_password_does_not_match` | unit (adapter) |
| BR-002-1 | `should_verify_hash_stored_with_another_cost` (cost read from the hash) | unit (adapter) |
| Corrupt data | `should_throw_when_stored_hash_has_unknown_format` | unit (adapter) |
| Main flow | `should_return_user_and_token_when_credentials_are_valid` | unit (fakes) |
| A2 | `should_throw_invalid_credentials_when_username_does_not_exist` | unit (fakes) |
| A3 | `should_throw_invalid_credentials_when_password_is_wrong` | unit (fakes) |
| BR-002-2 | `should_hash_once_when_username_does_not_exist` (equal cost) | unit (fakes) |
| Main flow | `should_return_200_with_user_and_token_when_login_succeeds` | e2e |
| A2, A3, BR-002-2 | `should_return_same_401_when_username_or_password_is_wrong` | e2e |
| A1 | `should_return_400_with_details_when_body_is_invalid` | e2e |
| Register unchanged | existing register e2e tests | e2e |

## Open questions for the team
1. Resolved (Ivifer1, 2026-11-11, option A): tab B4 is updated to the code now (`parseCredentials(body)`,
   `AuthResponse`, `register(body: unknown)` / `login(body: unknown)`). If Swagger (#21) needs DTO classes, they
   are added then to the code and the diagram together.
2. Brute force on login needs the per-IP rate limit (pending team decision from the #17 review).

## Implementation notes
Built as proposed, plus one test-infrastructure fix:
- `ScryptPasswordHasher.verify` parses `scrypt$N$r$p$salt$key` with one regular expression and rejects the hash
  (error "Stored password hash is invalid", answered as a generic 500) when the format is unknown, N is not a power
  of two or above 2^17, r or p are outside 1–16, or a hex field has an odd length. The key is recomputed with the
  stored cost and compared with `timingSafeEqual`.
- `LoginUseCase` calls `hasher.hash(password)` and discards the result when the username does not exist (BR-002-2).
- `FakePasswordHasher` gained `verify` and call counters for the unit tests.
- **Test infrastructure:** e2e test files shared one MongoDB database and run in parallel, so the register file's
  `beforeEach` cleanup deleted the login file's user (the login suite was skipped instead of failing). The worker
  setup (`test/support/mongo-memory.setup.ts`) now gives each test file its own database on the shared in-memory
  server. This bug was latent since #15 and showed up with the second e2e file that touches users.

### Fixes after the independent security review (2026-11-12)
Verdict: approve with notes. Verified by the reviewer: same 401 body and headers for an unknown username and a
wrong password, and indistinguishable timing (medians 165.4 ms vs 165.6 ms over 20 samples each). Ivifer1 approved
fixing items 1, 2 and 3 in this PR:
1. `HttpErrorFilter` now catches every error (`@Catch()`). Unexpected errors (database down, corrupt stored hash,
   bugs) answer the contract's 500 body with `path` and `timestamp`; their stack only goes to the server log
   (NestJS `Logger`). Before, they used NestJS's default body without `error`, `path` or `timestamp`. This takes part
   of #20 forward.
2. A stored cost that cannot run is rejected as corrupt data: `128 * N * r` must stay below `maxmem` (N=2^17 with
   r=16 was accepted and then failed inside scrypt).
3. A tampered stored hash can no longer make logins slow or weak: N must be between 2^14 and 2^17, p at most 4,
   and salt and key must have exactly 16 and 64 bytes.
Not fixed here (team decision): per-IP rate limit; one client reached about 21 login attempts per second.

## Verification
- RED first: 7 hasher unit tests failed, the login use case suite failed with "Cannot find module", and the 3
  login e2e tests failed with 404.
- `npm test`: 81 passed (82 after the extra case below). `npm run test:e2e`: 20 passed, three runs in a row.
  `npm run typecheck`, `npm run lint`, `npm run build`: clean.
- Rules broken on purpose, each restored afterwards:
  - No dummy hash for an unknown username → `should_hash_once_when_username_does_not_exist` failed.
  - Password not checked → `should_throw_invalid_credentials_when_password_is_wrong` failed.
  - `verify` always true → `should_not_verify_when_password_does_not_match` failed.
  - Stored cost ignored → `should_verify_hash_stored_with_another_cost` failed.
  - Cost upper bound removed → no test failed at first (the existing case was rejected by the power-of-two rule);
    the case `scrypt$1048576$8$1$00$00` was added and then failed as expected.
  - Different 401 message → `should_return_same_401_when_username_or_password_is_wrong` failed.
  - `@HttpCode(200)` removed → `should_return_200_with_user_and_token_when_login_succeeds` failed.
- The register e2e tests still pass unchanged (shared parser, filter and module).
- After the review fixes: RED first (5 new hash cases and the 500 e2e test failed), then `npm test`: 87 passed,
  `npm run test:e2e`: 21 passed, typecheck, lint and build clean. Rules broken on purpose, each restored afterwards:
  no minimum cost, no memory rule, p up to 16, any key length, any salt length, unexpected errors not caught: each
  made its own test fail.

## AI usage
- Tool and model: Claude Code (Claude Opus 5.5).
- Prompt: "sí" (yes) to continue with #18 after the register merge; B4 decision "a".
- The AI produced UC-002, this proposal, the tests, the use case, `verify`, the controller method, the wiring and
  the e2e database isolation.
- The team (Ivifer1) approved the proposal before any code and chose option A for diagram tab B4.
- Lesson: breaking a rule on purpose found a test that did not cover the cost upper bound; mutation checks catch
  gaps that a green suite hides.
