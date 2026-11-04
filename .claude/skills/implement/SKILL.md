---
name: implement
description: Implement an approved use case end to end (proposal → human approval → tests → code → verification → explanation). Use when the team says "implement UC-###" or asks for a feature that has an approved spec.
argument-hint: "UC-###"
---
# /implement UC-### — spec-driven implementation

Follow these steps in order. Hooks block shortcuts; if a hook blocks you, read its message and comply.

1. **Context.** Read the use case, its linked requirements, the entity model, `CLAUDE.md`, relevant ADRs and the code it touches.
   If the use case is not `Approved`, stop and offer `/spec`.
2. **Branch.** If on `main`, create `feat/<scope>-<short-name>` (or `fix/…`, `refactor/…`).
3. **Proposal.** Delegate to the `architect` subagent to write the proposal into the branch change record (`Status: PROPOSED`).
   Read it critically and fix weak justifications.
4. **Ask for approval.** Present the proposal to the team in Spanish (design summary, decisions to make) and STOP.
   Do not continue until a human has set `Status: APPROVED` in the file. Never write that line yourself.
5. **Tests first.** Delegate to `test-engineer`: tests from the main flow, alternatives and business rules. Confirm they fail for the right reason.
6. **Implement** the smallest change that makes them pass, layer by layer from the inside out (domain → application → adapters → infrastructure).
   Respect the approved design; if you need to deviate, stop and explain why, and update the proposal for re-approval.
7. **Verify.** `npm run typecheck`, `npm run lint`, `npm test` (backend: also `npm run test:e2e`). Then run the `design-reviewer`
   subagent and fix every blocking finding.
8. **Record.** Fill "Implementation notes", "Verification" and "AI usage" in the change record; update `docs/specs/dashboard.md`
   and, if the engine's extension points changed, `docs/EXTENSIBILITY.md` (client) or the OpenAPI docs (backend).
9. **Explain.** Finish with `## Explicación del cambio` in Spanish (format in `CLAUDE.md`).
10. Offer `/commit-pr`. Do not push or merge without the team's go-ahead.
