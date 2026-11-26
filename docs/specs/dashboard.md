# Spec dashboard

Progress is measured by behaviour that is specified, implemented and verified, not by closed tickets.

| Use case | Linked FR | UC status | Code | Unit | Integration / E2E | Regression | Integrity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 Register | FR-001 | Draft | ✓ | ✓ | ✓ | — | Weak (spec not reviewed by the team yet) |
| UC-002 Login | FR-002 | Draft | ✓ | ✓ | ✓ | — | Weak (spec not reviewed by the team yet) |
| UC-003 Current user | FR-002 | Draft | ✓ | ✓ | ✓ | — | Weak (spec not reviewed by the team yet) |
| UC-004 Read public level definitions | FR-008, FR-010 | Verified locally | ✓ | ✓ | ✓ | ✓ | CI/publication pending |
| UC-005 Manage level definitions | FR-009, FR-010 | Verified locally | ✓ | — | ✓ | ✓ | CI/publication pending |
| UC-007 Read API documentation | NFR-001, NFR-002 | Verified locally | ✓ | — | ✓ | ✓ | Native review and CI pending |
| UC-008 Retain player progress | FR-003, FR-004, NFR-004 | Verified locally | ✓ | ✓ | ✓ | ✓ | Native review and publication pending |
| UC-009 Read and sync player progress | FR-003, FR-004, NFR-001, NFR-002, NFR-004 | Verified locally | ✓ | ✓ | ✓ | ✓ | Native review and publication pending |

Status flow: Draft → Reviewed → Approved → Implemented → Verified → Deployed.
