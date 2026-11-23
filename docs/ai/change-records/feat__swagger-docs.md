# Change record: feat/swagger-docs

Status: APPROVED
<!-- Only a human changes this line to "Status: APPROVED". -->
Author(s): Ivifer Pita
Date: 2026-11-23

## Spec and traceability

- Issue: #21, Set up Swagger documentation.
- Use case: UC-007 (Approved).
- Requirements: NFR-001, NFR-002.
- Business rules: BR-007-1 through BR-007-3.

## Problem

The backend has an API contract in Markdown, but a consumer cannot inspect it through the running application. The generated reference must describe the routes that exist on this branch, not treat planned endpoints in the full contract as delivered.

## Proposed design

| Type or module | Layer | Responsibility |
| --- | --- | --- |
| Swagger setup helper | Infrastructure, HTTP composition | Generate the reference with `@nestjs/swagger` after the existing HTTP prefix is configured. Mount UI at `/docs` and JSON at `/docs-json` before application initialization, only for exact `SWAGGER_ENABLED=true`. Do not mount YAML or persist bearer tokens in the browser. |
| Existing health, auth and level controllers | HTTP adapter | Declare method-level documentation for inputs, responses and security. Do not change handler signatures, request parsing, guards, mappers or response behavior. |
| Small shared OpenAPI schema definitions | HTTP adapter | Describe reusable request/response and error shapes that cannot be inferred from erased types. Use existing parsers, mappers and error tests as the source for those shapes. |

GET `/health` remains outside `/api/v1`. Only GET `/api/v1/auth/me` declares bearer JWT security on the #21 baseline. POST registration returns `201`; POST login returns `200`. Document shared error envelopes, including optional field details for validation versus malformed JSON, registration conflict, invalid credentials, applicable body-size errors and the public level errors. GET `/levels` requires `gameId` and returns `{ items: [...] }`; GET `/levels/{id}` returns `404` for malformed or unknown IDs. Check the full status matrix against the HTTP tests and filter. Describe password length in user-perceived characters; do not substitute a different validation rule in the document.

Keep the level schema generic: common fields and a registered variant-specific section. Show Fit and Sort as examples without requiring both sections or closing the schema to a fixed game enum. Use fictitious examples only; do not publish tokens, secrets or internal error details.

## Clean Architecture

Infrastructure owns mounting, configuration and startup wiring. Only infrastructure and HTTP adapters depend on Swagger; nothing points outwards from the application or domain. No new domain type, application port or storage component is needed.

## SOLID

- **SRP:** Controllers keep their existing request/response behavior; endpoint metadata describes it, shared schemas avoid repeating structural details, and the setup helper owns configuration.
- **OCP:** Adding a registered variant does not require editing a Swagger DTO to name that variant. Document variant rules by reference to the level format and provide representative examples.

## Design patterns

No new GoF pattern. The existing HTTP adapters already provide the correct boundary; add documentation metadata to them rather than creating parallel controllers or a new domain abstraction.

## Extensibility and infrastructure independence

A new route adds metadata with its controller and a contract assertion in the same change. A new level variant does not modify the existing domain use cases, generic level contract or Swagger setup. Document the flag and links in the README. No new UML class or structural relationship is proposed; compare the actual result to the diagram before closing.

## Alternatives considered

- **Hand-maintained OpenAPI file:** no NestJS metadata dependency, but duplicates route definitions and increases drift. The agreed API contract calls for generation from code.
- **Always exposed:** easier for reviewers to find, but the reference and interactive UI are reachable anywhere the application is reachable. Explicit opt-in makes that a deployment decision; it does not replace authenticated API guards or network access control.
- **Package:** propose `@nestjs/swagger` 12.1.2. Its [release manifest](https://raw.githubusercontent.com/nestjs/swagger/12.1.2/package.json) declares NestJS 12 peer versions. No validator or CLI reflection plugin is proposed. Confirm installation and runtime compatibility after approval.

## Test plan

| Spec element | Test name | Level |
| --- | --- | --- |
| BR-007-1 | `should_serve_ui_and_openapi_json_when_documentation_is_enabled`; `should_return_not_found_for_both_routes_when_documentation_is_disabled` | HTTP e2e |
| BR-007-2 | `should_list_only_the_implemented_operations_when_client_requests_openapi_json` | HTTP e2e |
| BR-007-3 | `should_describe_the_actual_http_contract_when_client_requests_openapi_json` | HTTP e2e |
| Existing behavior | Verify shared HTTP setup and real health, auth and level responses are unchanged; compare representative requests against baseline and run existing suites. | HTTP differential and regression |

Use Vitest/Supertest with isolated test configuration; prove RED before writing the setup or metadata. Inspect the real startup ordering and verify the compiled application serves the UI assets locally without requiring a live database.

## Open questions for the team

- Approve explicit opt-in on the proposed routes versus an always-on reference.
- Approve the proposed NestJS runtime dependency. #32 writes, the #33 CLI, scores, progress and ranking remain out of scope.

## Implementation notes

Implementation status: IMPLEMENTED. The top-level APPROVED marker records the human design approval and is preserved.

- `configure-openapi.ts` mounts Swagger UI and its JSON document; `configure-app.ts` checks the flag after configuring the HTTP prefix and error filter.
- The three existing controllers declare operations using shared schemas from `openapi.schemas.ts`. Public level examples mirror the existing Fit and Sort fixtures; no variant DTO or business logic was added.
- The README and environment example document opt-in. The API contract distinguishes the docs routes from the prefixed REST routes. No domain/application code, persistence code, UML classes or structural relationships changed.
- The rollback boundary is this Swagger work unit: remove the Swagger setup, metadata and dependency together with the flag, tests and documentation.

## Verification

- RED: focused HTTP tests failed on three existing 404s before implementation; disabled and compatibility cases were already green.
- GREEN: 7 focused UC-007 HTTP tests initially; after the independent regression probe was added, the full suites total 233 unit/architecture and 68 integration/e2e. Typecheck, lint, build and diff check passed.
- Compiled server comparison: 13 existing HTTP observations matched baseline `773c518` in isolated databases. Both probes exited successfully without stderr; timestamps, synthetic IDs and JWTs were normalized. The compiled candidate served UI, JSON and local Swagger CSS.
- Independent verifier: 99 compiled-runtime assertions passed across four flag values. Added a regression test for static assets remaining unavailable when disabled.
- The Swagger dependency tree includes Scarf's installation analytics hook. The project opts out via `scarfSettings.enabled=false`; a network-blocked replay observed opt-out before any HTTPS request.
- Receipt-driven native review pending.

## AI usage

Record the design and implementation assistance in the project's dedicated AI usage log as required by the brief.
