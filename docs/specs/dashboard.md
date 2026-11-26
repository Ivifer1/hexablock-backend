# Spec dashboard

Progress is measured by behaviour that is specified, implemented and verified, not by closed tickets.

| Use case | Linked FR | UC status | Code | Unit | Integration / E2E | Regression | Integrity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 Register | FR-001 | Draft | ✓ | ✓ | ✓ | — | Weak (spec not reviewed by the team yet) |
| UC-002 Login | FR-002 | Draft | ✓ | ✓ | ✓ | — | Weak (spec not reviewed by the team yet) |
| UC-003 Current user | FR-002 | Draft | ✓ | ✓ | ✓ | — | Weak (spec not reviewed by the team yet) |
| UC-004 Read public level definitions | FR-008, FR-010 | Verified | ✓ | ✓ | ✓ | ✓ | Integrated; main CI passed |
| UC-005 Manage level definitions | FR-009, FR-010 | Verified | ✓ | — | ✓ | ✓ | Integrated; main CI passed; native review approved |
| UC-006 Bootstrap the first administrator | FR-001, FR-009, NFR-002, NFR-003 | Verified | ✓ | — | ✓ | ✓ | Integrated and tested with disposable MongoDB; native review approved; no real administrator created |
| UC-007 Read API documentation | NFR-001, NFR-002 | Verified | ✓ | — | ✓ | ✓ | Integrated; main CI passed; native review approved |
| UC-008 Retain player progress | FR-003, FR-004, NFR-004 | Verified | ✓ | ✓ | ✓ | ✓ | Integrated; main CI passed; native review approved |
| UC-009 Read and sync player progress | FR-003, FR-004, NFR-001, NFR-002, NFR-004 | Verified | ✓ | ✓ | ✓ | ✓ | Integrated; main CI passed; maintainer accepted manual review; native review closure remains unresolved |
| UC-010 Submit a score and receive the current personal best | FR-005, NFR-001, NFR-002, NFR-004 | Verified | ✓ | ✓ | ✓ | ✓ | Integrated; storage and HTTP native reviews approved and acknowledged; diagram synchronization maintainer-confirmed |
| UC-011 Read leaderboard | FR-006, FR-007 | Verified | ✓ | ✓ | ✓ | ✓ | Integrated; Mongo and HTTP native reviews approved and acknowledged; diagram synchronization maintainer-confirmed |

Status flow: Draft → Reviewed → Approved → Implemented → Verified → Deployed.

## Verification snapshot

- Integrated baseline: `d3c7aa3` on `main`; [CI run 45884701943](https://github.com/Ivifer1/hexablock-backend/actions/runs/45884701943) passed lint, typecheck, unit/architecture tests, integration/E2E tests and build.
- Final #57 candidate checks: 262 unit/architecture and 233 integration/E2E tests; independent HTTP/OpenAPI verification passed 35 tests. These counts describe the recorded candidate, not a live counter.
- The UC-001–UC-003 specifications still say `Draft`. Implementation and passing tests do not grant specification approval; those statuses are intentionally unchanged.
- Diagram synchronization is reported by the maintainer, not independently verified by this snapshot.
- `Verified` does not mean `Deployed`. No production database access, index provisioning or first-administrator execution is claimed.
- `—` means no separate check is recorded in that category, not that the category passed.
