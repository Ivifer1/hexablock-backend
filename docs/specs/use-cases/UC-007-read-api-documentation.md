# UC-007 Read the documentation for the running API

| Field | Value |
| --- | --- |
| ID | UC-007 |
| Primary actor | API consumer or project reviewer |
| Goal | Inspect the routes that the running backend exposes, including their request and response contracts. |
| Status | Approved |
| Linked requirements | NFR-001, NFR-002 |
| Entities | None |

## Preconditions

- The actor can reach the backend.
- The operator has enabled API documentation for the main success scenario.

## Trigger

- The actor needs to check how to call the backend or interpret a response.

## Main success scenario

1. The actor requests `GET /docs`.
2. The backend returns `200` with an interactive API reference.
3. The actor inspects an operation in the reference.
4. The reference shows its method, path, authentication requirement, inputs, success response and applicable error codes and schemas.

## Alternative flows

- **A1 (at step 1) Machine-readable reference:** The actor requests `GET /docs-json`. The backend returns `200` with the same API contract in OpenAPI JSON.
- **A2 (at step 1 or A1) Documentation disabled:** The actor requests either route. The backend returns `404`.

## Exception flows

- None specific to this use case; the existing HTTP error contract continues to apply.

## Postconditions

- Success: The actor can inspect the current contract without calling a business operation.
- Failure: The documentation remains unavailable; no user or level data changes.

## Business rules

- BR-007-1: Both documentation routes are available only when the operator explicitly enables documentation for that instance.
- BR-007-2: The reference lists only implemented operations. With #21 and #32 together, this includes health, registration, login, the current user, public level reads, and administrator level writes.
- BR-007-3: The documentation preserves the paths, inputs, success and error contracts, and authentication policy that the API actually implements. A description or example does not change validation.

## Open questions

- Approval decision: the draft proposes `/docs` and `/docs-json`, disabled by default and enabled explicitly for local use or a demo. Always-on documentation would remove setup for reviewers but expose the documentation on every reachable instance.
