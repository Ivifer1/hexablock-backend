# Change record: feat/auth-jwt-guard

Status: APPROVED
<!-- Only a human changes this line to "Status: APPROVED" (hooks block the agent from doing it). -->
Author(s): Ivifer1 with Claude Code (Claude Opus 5.5)
Date: 2026-11-12

## Spec and traceability
- Issue: #19 Protect routes with JWT guard
- Use case: UC-003 (`docs/specs/use-cases/UC-003-current-user.md`), BR-003-1 to BR-003-3
- Requirements: FR-002, NFR-002, NFR-003, C-001
- API contract: `Authorization: Bearer <accessToken>` on 🔒 routes; `401` for a missing, invalid or expired token;
  `GET /auth/me` → `200 { id, username, role }`
- Class diagram: B2 (`GetCurrentUserUseCase`), B4 (`JwtAuthGuard`, `AuthUser`, `AuthController.me`, `UserDto`),
  B5 (`JwtTokenIssuer.verify`)

## Problem
Tokens are issued (#17, #18) but nothing checks them, so no route can be private. The issue needs a reusable guard
that rejects missing, invalid and expired tokens with `401`, and the contract's first private route, `GET /auth/me`,
to prove it end to end.

## Proposed design

| Type | Kind | Layer | Responsibility (one sentence) |
| --- | --- | --- | --- |
| `ErrorCode.AuthenticationRequired` | enum value (changed) | domain | A request needs a valid session and has none. |
| `GetCurrentUserUseCase` | use case | application (`use-cases/get-current-user.use-case.ts`) | UC-003 step 3: `execute({ userId })` returns the `User`, or raises `AuthenticationRequired` if it no longer exists. |
| `JwtTokenIssuer.verify(token)` | adapter method (changed) | adapters | Checks signature (HS256 only) and expiry; returns `Optional<AuthUser>` (empty for any bad token). |
| `AuthUser` | adapter type | adapters (`http/auth/auth-user.ts`) | Who the token identifies: `id`, `role`. |
| `JwtAuthGuard` | NestJS guard | adapters (`http/auth/jwt-auth.guard.ts`) | Reads `Authorization: Bearer <token>`, verifies it, stores the `AuthUser` on the request, else raises `AuthenticationRequired`. |
| `@CurrentUser()` | parameter decorator | adapters (`http/auth/current-user.decorator.ts`) | Hands the stored `AuthUser` to a controller method. |
| `AuthController.me` | controller method (changed) | adapters | `GET /auth/me` behind `JwtAuthGuard`: calls the use case, maps to `UserResponse`. |
| `UserResponse`, `toUserResponse` | response type | adapters (`http/auth/auth.response.ts`) | `{ id, username, role }`; also used inside `AuthResponse.user`. |
| `HttpErrorFilter` table | (changed) | adapters | New row `AuthenticationRequired` → `401 Unauthorized`, message `Authentication required`. |
| `AuthModule` | module (changed) | infrastructure | Wires the use case, the guard and the token issuer. |

Every bad token (missing header, wrong scheme, malformed, wrong signature, other algorithm, expired, unknown user)
gets the same `401` (BR-003-2), so the answer reveals nothing about why.

## Differences from the class diagram (to decide before coding)
1. `JwtTokenIssuer.verify(token: string): AuthUser` (B5) becomes `verify(token: string): Promise<Optional<AuthUser>>`:
   checking a JWT is asynchronous in `@nestjs/jwt`, and a bad token is an expected case, not an exception.
   Signing and verifying stay in one class, so the token format (`sub`, `username`, `role`) lives in one place.
2. B4 box `UserDto` becomes `UserResponse` (same fields), as `AuthResponse` did in #18 (option A, no DTO classes
   until Swagger, #21). `AuthResponse.user` uses it.
3. `RolesGuard` (`403` for admin-only routes) is **not** in this change: no admin route exists yet. It arrives with
   the levels endpoints, where it is first needed. Its box stays without ✓.

## Clean Architecture
- `adapters → application → domain`; `infrastructure → adapters`. All inwards.
- JWT stays in adapters: the guard and `JwtTokenIssuer` know it; `GetCurrentUserUseCase` receives a `UserId`.
- No new port: verifying is an HTTP-edge concern; no use case needs to verify tokens.

## SOLID
- **SRP:** the guard only authenticates; the use case only loads the user; the controller only maps.
- **OCP:** any future private route adds `@UseGuards(JwtAuthGuard)` without editing the guard.
- **DIP:** the use case depends on `IUserRepository`.

## Design patterns
| Pattern | Participants | Problem it solves here | Simpler alternative rejected and why |
| --- | --- | --- | --- |
| Adapter (existing) | `JwtTokenIssuer` behind `ITokenIssuer`, plus `verify` used by the guard | Token format in one class. | Verifying inside the guard with its own copy of the payload rules: two places to change if the token changes. |
| Interceptor / guard (framework AOP) | `JwtAuthGuard` | Authentication is a cross-cutting concern kept out of controllers and use cases. | Checking the header in every controller method: duplicated and easy to forget. |

## Extensibility and infrastructure independence
- A new private route only adds the guard decorator. Replacing JWT changes `JwtTokenIssuer` and the guard only.

## Alternatives considered
- **`@nestjs/passport` + `passport-jwt`:** the NestJS tutorial way, but two new dependencies for one guard.
- **A use-case decorator `RequiresSession` (AOP around use cases):** closer to "use case aspects", but the session
  comes from HTTP headers, so the guard is the natural edge; it can be revisited with the AOP work.

## Test plan
| Spec element | Test name | Level |
| --- | --- | --- |
| BR-003-1 | `should_return_user_when_token_is_valid` | unit (adapter verify) |
| BR-003-1 | `should_return_empty_when_token_is_expired` | unit |
| BR-003-1 | `should_return_empty_when_token_has_wrong_signature` | unit |
| BR-003-1 | `should_return_empty_when_token_uses_another_algorithm` | unit |
| Step 3 | `should_return_user_when_it_exists` | unit (fakes) |
| A2 | `should_throw_authentication_required_when_user_no_longer_exists` | unit (fakes) |
| Main flow | `should_return_200_with_current_user_when_token_is_valid` | e2e |
| A1, BR-003-2 | `should_return_same_401_when_token_is_missing_malformed_or_expired` | e2e |
| A2 | `should_return_401_when_user_of_token_no_longer_exists` | e2e |
| Regression | register and login e2e tests | e2e |

## Open questions for the team
1. Approve the three diagram differences above.

## Implementation notes
Built as proposed (the three diagram differences were approved with the proposal):
- `JwtTokenIssuer.verify` passes `algorithms: ['HS256']` and also signs with HS256 explicitly. It returns an empty
  `Optional` for any failure: malformed text, wrong signature, other algorithm, `alg: none`, expired, or a payload
  without a string `sub` and `role`.
- `JwtAuthGuard` accepts only `Authorization: Bearer <token>` (one token, no extra spaces) and stores the `AuthUser`
  on the request; `@CurrentUser()` reads it. Every rejection throws `DomainError(AuthenticationRequired)`, which the
  error filter answers as `401 Authentication required`.
- `AuthModule` provides one `JwtTokenIssuer` instance and exposes it as the `ITokenIssuer` port with `useExisting`,
  so the guard and the use cases share it. It exports `JwtAuthGuard` and `JwtTokenIssuer` for future modules.
- `UserResponse`/`toUserResponse` are shared by `GET /auth/me` and the `user` field of register/login responses.
- `RolesGuard` (403) is not included: no admin route exists yet; it comes with the levels endpoints.

### Fixes after the independent security review (2026-11-12)
Verdict: approve with notes. Verified by the reviewer: more than 20 bypass attempts (alg none, HS512/HS384, RS256,
tampered role, wrong secret, expired, future nbf, header variants, token in query or cookie, deleted user) all got the
same 401 body; `/auth/me` returns the stored role, not the token's. Ivifer1 approved fixing three items:
1. A signed token with a blank `sub` ("   ") gave 500: `verify` now rejects a subject that is blank after trimming.
2. A signed token without `exp` never expired: `verify` now requires a numeric `exp` (BR-003-1).
3. `AuthUser` moved from `adapters/http/auth` to `application/ports/token-issuer.ts`, next to `ITokenIssuer`, so the
   security adapter no longer imports from the HTTP adapter. Diagram: `AuthUser` moves from tab B4 to tab B3.
Recorded for later: the role inside a token stays as issued until it expires (up to 30 days), so the future
`RolesGuard` should read the role from the repository, not from the token. Not fixed here: the error body echoes the
query string in `path` (pre-existing, goes to #20).

## Verification
- RED first: 9 `verify` unit tests and the use case suite failed, and the 3 e2e tests failed (404).
- `npm test`: 98 passed. `npm run test:e2e`: 24 passed. `npm run typecheck`, `npm run lint`, `npm run build`: clean.
- Rules broken on purpose, each restored afterwards:
  - Any algorithm accepted → `should_return_empty_when_token_uses_another_algorithm` failed.
  - Payload not checked → `should_return_empty_when_token_has_no_subject` failed.
  - Signature not verified (decode only) → the expired, wrong-signature and other-algorithm tests failed.
  - Deleted user accepted → `should_throw_authentication_required_when_user_no_longer_exists` failed.
  - Route not guarded → the 3 e2e tests failed.
  - Any `Authorization` scheme accepted → `should_return_same_401_when_token_is_missing_malformed_or_expired` failed.
- Register and login e2e tests still pass unchanged.
- After the review fixes: RED first (2 new tests), then `npm test`: 100 passed, `npm run test:e2e`: 24 passed;
  breaking each new rule on purpose (blank subject, no expiry) made its test fail.

## AI usage
- Tool and model: Claude Code (Claude Opus 5.5).
- Prompt: "sí, ese orden, arranca con el #19" (yes, that order, start with #19).
- The AI produced UC-003, this proposal, the tests, the guard, `verify`, the use case, the endpoint and the wiring.
- The team (Ivifer1) approved the proposal, including the three diagram differences, before any code.
- Lesson: keeping signing and verifying in one adapter keeps the token format in one place.
