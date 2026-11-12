# Change record: feat/http-error-format

Status: APPROVED
<!-- Only a human changes this line to "Status: APPROVED" (hooks block the agent from doing it). -->
Author(s): Ivifer1 with Claude Code (Claude Opus 5.5)
Date: 2026-11-12

## Spec and traceability
- Issue: #20 Add consistent HTTP error format
- Requirements: NFR-002 (consistent responses and errors, correct status codes), NFR-003 (no leaked internals)
- API contract: section Errors (one body shape; codes 400, 401, 403, 404, 409)
- Use cases: none (cross-cutting). Builds on #17–#19, where `HttpErrorFilter` was created and extended.
- Class diagram: tab B4 (`HttpErrorFilter`, `ErrorResponseDto`, `FieldErrorDto`)

## Problem
Most of #20 already exists: one filter (`@Catch()`) writes the contract's body for every error, and e2e tests cover
400, 401, 409, 413 and 500. Three gaps remain:
1. `path` is `request.originalUrl`, so the query string is echoed back (a token sent as `?access_token=...` would be
   returned in the error body). Found by the #19 security review.
2. The codes 403 and 404 from the contract have no test. There is no route that answers 403 yet (it arrives with
   the admin level endpoints) and no domain "not found" error yet.
3. The body shape is an inline object; the diagram shows `ErrorResponseDto` and `FieldErrorDto` classes that do not
   exist in the code.

## Proposed design

| Type | Kind | Layer | Responsibility (one sentence) |
| --- | --- | --- | --- |
| `ErrorResponse`, `FieldError` | response types | adapters (`http/error-response.ts`) | The contract's error body, named so the filter, the tests and Swagger (#21) share one definition. |
| `HttpErrorFilter` | filter (changed) | adapters | Writes `path` without the query string and builds an `ErrorResponse`. |
| `RequestValidationError` | error (changed) | adapters | Uses `FieldError` from `error-response.ts`. |

No new behaviour for clients except `path` losing the query string.

Tests:
- **Unit tests of the filter** (new): one test per mapping, with a fixed clock and a fake HTTP context: 400 (request
  validation and framework), 401 (both codes), 403 (a framework `ForbiddenException`), 404 (framework
  `NotFoundException`), 409, 413, 500 (unknown domain code and plain `Error`), and `path` without query string.
- **E2E** (new): an unknown route answers 404 in the contract shape, and its `path` has no query string.
- 403 is covered by the unit test now; its e2e test arrives with the first admin route (levels, issue E of S4-S5),
  because today no endpoint can return 403.

## Differences from the class diagram (to decide before coding)
1. B4 `ErrorResponseDto` becomes `ErrorResponse` and its `details?: FieldErrorDto[]` becomes `details?: FieldError[]`,
   following option A (#18): code types now, DTO classes only if Swagger (#21) needs them. Both get ✓.

## Clean Architecture
- All changes stay in `adapters/http`. Domain and application are untouched.

## SOLID
- **SRP:** the filter maps errors to HTTP; `error-response.ts` only defines the body.
- **OCP:** a new domain error is still one row in the filter's table.

## Design patterns
No new pattern. The filter is the framework's exception-handling hook (an aspect at the HTTP edge).

## Alternatives considered
- **Keep `originalUrl`:** simplest, but it echoes input, against the filter's own rule.
- **Add a temporary route to test 403 end to end:** proves nothing real and would have to be removed later.

## Test plan
| Element | Test name | Level |
| --- | --- | --- |
| 400 | `should_answer_400_with_details_when_request_validation_fails` | unit |
| 400 | `should_answer_400_with_fixed_message_when_framework_rejects_request` | unit |
| 401 | `should_answer_401_when_credentials_are_invalid`, `should_answer_401_when_authentication_is_required` | unit |
| 403 | `should_answer_403_when_access_is_forbidden` | unit |
| 404 | `should_answer_404_when_resource_is_not_found` | unit |
| 409 | `should_answer_409_when_username_is_taken` | unit |
| 413 | `should_answer_413_when_body_is_too_large` | unit |
| 500 | `should_answer_500_without_details_when_domain_code_has_no_mapping`, `should_answer_500_without_details_when_error_is_unexpected` | unit |
| path | `should_write_path_without_query_string_when_url_has_one` | unit |
| 404 + path | `should_return_404_in_contract_shape_without_query_when_route_does_not_exist` | e2e |
| Regression | every existing e2e test | e2e |

## Open questions for the team
1. Approve the diagram difference above.

## Implementation notes
Built as proposed (the diagram difference was approved with the proposal):
- `error-response.ts` defines `ErrorResponse` and `FieldError`; `RequestValidationError` re-exports `FieldError`
  so existing imports keep working.
- `HttpErrorFilter` builds a typed `ErrorResponse` and writes `path` as `originalUrl` without the query string.
- The filter's unit tests use a fixed clock and a fake HTTP context; they pin the mapping of every status code.
  Most of them passed from the start: they document behaviour built in #17–#19, now fixed by a test per code.
- 403 is tested at unit level; its e2e test comes with the first admin route (levels).

## Verification
- RED first: `should_write_path_without_query_string_when_url_has_one` (unit) and the 404 e2e test failed.
- `npm test`: 111 passed. `npm run test:e2e`: 25 passed. `npm run typecheck`, `npm run lint`, `npm run build`: clean.
- Rule broken on purpose: writing `originalUrl` again made the path unit test fail; restored.

## AI usage
- Tool and model: Claude Code (Claude Opus 5.5).
- Prompt: "cerremos el #20" (let's close #20).
- The AI produced this proposal, the filter's unit tests, the 404 e2e test, `error-response.ts` and the path fix.
- The team (Ivifer1) approved the proposal, including the diagram rename, before any code.
- Lesson: characterization tests turn behaviour that already works into a contract that cannot silently change.
