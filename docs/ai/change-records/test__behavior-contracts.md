# Change record: test/behavior-contracts

Status: Test-only corrections implemented locally; native review approved and acknowledged
Date: 2026-11-27

## Outcome and scope

Correct brittle or incomplete assertions without changing production behavior, public APIs,
configuration, dependencies, storage formats or architecture. Initial correction was local-only;
the maintainer subsequently authorized publication, not integration.
Traceability: UC-002 BR-002-2 and failure postconditions; UC-008 immutability; UC-010 BR-010-4;
UC-011 bounded ranking reads; existing level/domain contracts.

## Corrections

| Area | Previous limitation | Correction |
| --- | --- | --- |
| Personal best and levels | Required object-reference reuse | Check public values and business identity instead |
| Coordinates, boards and progress | Required freezing or fresh object references | Attempt snapshot mutation and verify subsequent domain state |
| Login password-work check | Swallowed any rejection and did not reject successful outcomes | Assert invalid credentials, unchanged stored users and no token issuance; compare password-work paths |
| Score contention | Fixed the implementation's exact retry count | Require failure and unchanged data; use a generous test-only guard against unbounded work |
| Ranking index | Name implied the real adapter selected the index | State the actual guarantee: the hinted index supports the ordered read |
| Mongo failure paths | Required exactly one incidental read | Preserve rejection, stored values and no duplicate/uncertain write retries without fixing read count |
| Corrupt ranking user | Required internal technical error wording | Reject the complete read even when a valid user precedes a corrupt selected user |
| Public level use cases | Imported the production infrastructure catalog | Inject a minimal supported/unsupported capability double |
| Score and achievement time | Missing non-finite inputs and specific error-code assertions | Reject NaN, both infinities and an invalid date with the corresponding domain error codes |

No-op writes and clock sampling remain asserted because the approved score-storage design
explicitly forbids them. Uncertain writes must still fail without unsafe retries. Spies that inject
storage failures or schedule contention remain valid test setup, not blanket removal targets.

## Reproduction and verification

In an external disposable copy, four behavior-preserving alternatives made the original tests fail:
returning an equivalent personal-best object, returning a mutable defensive coordinate snapshot,
and exposing defensive board/progress array getters instead of frozen arrays. The corrected tests
accept all four. A retry budget of three rather than five is also accepted.

Six deliberately broken variants are rejected: successful unknown-user login, ignored score
improvement, leaked mutable coordinate/board/progress storage, and unbounded contention retries.
The original isolated password-work test accepted the broken login; other existing tests already
covered invalid-credential rejection, so this was not evidence that the complete suite missed it.

Independent verification found no candidate-caused blockers. Its targeted login probes accepted
an equivalent dummy-hash verification implementation and rejected token issuance, a saved user,
and omitted password work on failing authentication.

Observed checks:
- Focused unit/domain/mapper checks: 92 passed.
- Focused Mongo checks: 25 passed with disposable MongoDB.
- Full unit/architecture suite: 262 passed.
- Full integration/E2E suite: 233 passed with disposable MongoDB.
- Typecheck and lint passed; lint retained three pre-existing warnings.
- Source, configuration, dependency manifests and lockfile are unchanged.

## Follow-up audit corrections (2026-11-27)

The user approved the five-step follow-up with "dale": remove incidental assertions, cover
invalid domain inputs, isolate application fixtures, verify behavior/refactoring and measure time.
No production fix was needed: this is a test-design and regression-coverage change.

Before editing, an external disposable copy reproduced failures from an extra successful hinted
read, changed internal error wording and an unavailable production catalog. All three alternatives
pass with the corrected tests. Four deliberately broken validators (accepting NaN, positive
infinity, negative infinity or an invalid date) passed the previous focused tests and fail the new
cases. These are focused-test coverage gaps, not claims that the whole former suite accepted them.

Independent probes detected unsafe retries for another unique index, retry after an applied update
lost its response, partial rankings with a corrupt second user, and swapped Score/AchievedAt error
codes. The verifier's first setup excluded dependency dist files and could not load Vitest; one
corrected setup ran all five probes and observed relevant assertion failures. No production tree
was mutated by the probes.

Fresh checks after normalization:
- Focused domain/application: 14 passed; focused Mongo integration: 25 passed.
- Full unit/architecture: 266 passed, Vitest duration 2.11 s (2.42 s process wall time).
- Full integration/E2E: 233 passed, Vitest duration 4.85 s (5.60 s process wall time), disposable MongoDB.
- Isolated real scrypt adapter checks: 17 passed, Vitest duration 1.86 s; test bodies 1.74 s.
- Typecheck, lint and git diff --check passed; three pre-existing lint warnings remain.
- These are single local observations with cached dependencies/binary, not a CI benchmark or SLO.
  Keep the existing crypto classification: the measured complete unit loop does not justify a
  configuration change. Revisit if repeatable local/CI measurements show feedback degradation.
- Source, configuration, dependencies and lockfile remain unchanged. No new API or UML change.

Follow-up risk: item 4, preserving assertions against duplicate/uncertain Mongo write retries.
Independent follow-up verification found no blockers. The updated candidate was subsequently
approved and acknowledged by native review; no earlier consent tokens were reused. No commit or publication.

## Limits and review

This is a targeted correction, not proof that every test tolerates every possible refactor.
Password-work counts are not response-time measurements. The ranking index test does not prove
unhinted optimizer choice or monitor every command for absence of writes. These remain explicit
coverage limits, not production failures discovered by this correction.

Risk: item 2, assertions protecting authentication rejection and absence of token issuance.
The user selected review consent (option 1). Native review `review-a443776756d0544e` approved
all four lenses and exact acknowledgement returned `authority: burned`. The reviewed target is
`sha256:d1b5fea1c8838c6cab826ef098839c4ceb28abf5acf7771ee533aa512401154c` and reviewed
candidate tree is `17209a20cf7fc26c0b2f9ff09c49bf3668db77c8`. No correction was required.
This passive status update follows acknowledgement; the test bytes remain unchanged.

Three non-blocking advisories remain separate later work, not approval conditions:
- R2-001: the corrupt-user rejection currently accepts any thrown error; use a stable failure
  discriminator if the adapter exposes one, without restoring incidental message coupling.
- R2-002: the minimal level-support double does not distinguish game IDs; a more precise double
  could detect a use case checking the wrong game while remaining independent of infrastructure.
- R3-001: assert that contention writes stay below the generous test-only guard, so translating
  the guard's own error into the expected rejection cannot hide an unbounded retry loop.

Review is not exhaustive coverage proof and does not authorize commit, publication or integration.

## AI usage

Codex inspected test design, reproduced false alarms and incomplete assertions, and corrected
only tests and this verification record. An independent Codex verifier ran isolated login probes.
Human authorization covered local correction; it did not authorize publication or production changes.

## Publication preparation

The maintainer authorized one PR with `size:exception` after the original 409-line estimate.
Publication branch: `test/behavior-contracts-reviewed`, based on integrated main `06bd7dd`.
All eight test files are byte-identical to the acknowledged candidate. The current main
documentation and its usage-log entry are preserved; only passive publication metadata differs.
The original local correction branch is preserved. No production, dependency or configuration
change, additional advisory fix or merge into main is included.

Fresh publication-copy checks passed: 266 unit/architecture tests, 233 integration/E2E tests,
typecheck, lint, build and diff check. Three pre-existing lint warnings remain.
Tests are unchanged from the acknowledged review; no additional native correction or advisory
implementation was performed. The original independent probes remain the regression evidence.
