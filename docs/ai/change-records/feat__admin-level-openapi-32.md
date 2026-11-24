# Change record: feat/admin-level-openapi-32

Status: APPROVED
<!-- Only a human records design approval. -->
Author(s): Ivifer Pita
Date: 2026-11-23

## Spec and traceability

- Issue #32. UC-005 already specifies the administrative write behavior; UC-007 requires the generated reference to describe the implemented routes.
- Baseline: Swagger in `fdd9f12`; existing reviewed administrative routes in `ac1f6f0`.
- Preserve both reviewed commits, their original branches, and the open draft chain. No publication is part of this proposal.

## Problem

Swagger discovers the three administrative routes when the candidates are combined, but controller signatures alone do not describe required bodies, the existing guard policy, or the error responses. The existing inventory test expects six operations and fails on the combined code.

## Proposed design

| Component | Layer | Change |
|---|---|---|
| `AdminLevelsController` | HTTP adapter | Add OpenAPI metadata for the three methods only; reuse the existing bearer scheme, generic Level schema, examples and shared errors. |
| `test/openapi.e2e-spec.ts` | HTTP contract tests | Assert by method and path, so the public GET operations that share the paths remain public. |
| UC-007 reference and change record | Documentation | Update the obsolete six-operation baseline wording after the authenticated writes are documented; do not rewrite UC-005 rules. |

| Method | Success | Existing errors |
|---|---|---|
| POST `/api/v1/levels` | `201`, stored level | `400`, `401`, `403`, `409` for duplicate ID or occupied game/order, `413`, `500` |
| PUT `/api/v1/levels/{id}` | `200`, replacement level | `400` including malformed/mismatched ID, `401`, `403`, `404`, `409` for occupied order, `413`, `500` |
| DELETE `/api/v1/levels/{id}` | `204`, no body | `401`, `403`, `404` for malformed/missing ID, `500` |

Require a JSON Level body for POST and PUT, and the string path ID for PUT and DELETE. The shared HTTP parser returns `413` for POST and PUT when JSON exceeds 100 KiB, as confirmed by isolated HTTP probes. Describe bearer authentication and the existing persisted-admin requirement, without indicating that the token's role claim controls authorization. No request body for DELETE.

## Design boundaries

An annotation describes the contract; it must not change JWT authentication, role lookup, request parsing, status handling, index readiness, persistence, public GET behavior, dependencies or state. No new port, class, design pattern, module or UML relationship. Reuse the shared HTTP components without moving them into the application or domain. Do not broaden the generic schema to encode particular variants.

## Verification

- Integration preview: only `docs/specs/dashboard.md` conflicted; preserve both approved use-case rows. Original sources and branch refs were not modified.
- Targeted preview: 33 passed and one failed. The failure was the exact Swagger inventory assertion (nine discovered operations instead of the six in the existing test).
- RED: all three new OpenAPI contract cases failed before annotations (missing bearer, responses, and POST/PUT JSON inputs). Both HTTP parser checks already passed on the baseline.
- GREEN: 39 focused tests; 233 unit/architecture and 99 integration/e2e tests. Type check, lint, formatting and both builds passed. The compiled comparison preserved the six existing OpenAPI operations, shared schemas and seven HTTP observations with isolated MongoDB.
- Independent design review found no blockers. Native assessment covered the full uncommitted integration, including the previously reviewed role guard; no native review was started for that broader candidate.
- The follow-up adds OpenAPI annotations to the existing admin HTTP adapter only. The route implementations and authorization and persistence behavior are unchanged.

## Approval decision

Approve this documentation-only integration delta. It does not approve a push, a merge into main, or any multiplayer work.
