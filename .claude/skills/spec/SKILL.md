---
name: spec
description: Write or update a system use case (UC-###) or requirement in docs/specs following Spec-Driven Development. Use when behaviour is requested that has no approved use case, or when a business rule changes.
argument-hint: "UC-### or a short description of the behaviour"
---
# /spec — write an executable use case

1. Read `docs/specs/requirements.md`, `docs/specs/entity-model.md`, `docs/specs/use-cases/` and the professor's brief section
   referenced in the requirements. Find the next free ID (IDs are never reused).
2. If the behaviour needs a new requirement, add it to `requirements.md` (FR/NFR/C with a stable ID) marked `Draft`.
3. Create `docs/specs/use-cases/UC-###-<kebab-name>.md` from `docs/specs/use-cases/UC-000-template.md`, or edit the existing one.
4. Apply the executability checks:
   - Every step is observable from outside the system, in active voice, alternating actor/system, one rule per sentence.
   - No vague words: normally, quickly, should, if possible, as needed, appropriately.
   - Alternative/exception flows name the main-flow step where they diverge.
   - Preconditions = true before step 1. Postconditions for success AND failure.
   - Business rules have IDs `BR-###-n`. Entities are named exactly as in the entity model.
   - Two readers would imagine the same outcome; a tester could derive the tests; an AI would not need to invent a rule.
5. Anything the brief leaves open goes under "Open questions" with options, never decided silently.
6. Set `Status: Draft` and update `docs/specs/dashboard.md`.
7. Reply in Spanish: summary of the behaviour, the open questions, and ask the team to review and set `Status: Approved`.
Do not touch `src/`.
