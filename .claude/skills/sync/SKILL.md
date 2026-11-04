---
name: sync
description: Synchronize existing code and tests after a use case or business rule changed. Applies only the behavioural difference; never regenerates. Use when a spec was edited after implementation or a bug reveals a spec gap.
argument-hint: "UC-###"
---
# /sync UC-### — synchronize, do not regenerate

1. Show the spec change: `git diff main -- docs/specs/use-cases/UC-###*` (or against the last commit that implemented it).
   If there is no spec change, ask: is the spec wrong (fix the spec first with `/spec`) or does the code not match it?
2. List the behavioural delta: changed rules, new/removed alternative flows, changed postconditions.
3. Map each delta to the code and tests it affects (use the UC ID in tests and doc comments to find them).
4. Write/adjust the change record proposal for the delta only (`Status: PROPOSED`) and wait for human approval.
5. Update tests first for the delta, then the minimal code. Do not reformat, rename or restructure unrelated code.
6. Run the full suite: previously verified use cases must stay green (regression firewall).
7. Run `design-reviewer`, fill the change record, finish with `## Explicación del cambio` (Spanish), focusing on the delta and the regression evidence.
