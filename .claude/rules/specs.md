---
paths:
  - "docs/specs/**"
---
# Specification rules (Spec-Driven Development)

- Three artifacts, in this order: `requirements.md` (FR/NFR/C), `entity-model.md` (shared vocabulary), `use-cases/UC-###-*.md`.
- IDs are stable and never reused. Use cases link their requirement IDs; entities are referenced by name.
- Use cases describe observable behaviour only: actor steps and system responses, never classes, storage or widgets.
- One rule per sentence; no vague words (normally, quickly, should, if possible, as needed); measurable NFRs.
- Alternative and exception flows reference the exact main-flow step where they diverge.
- Preconditions are what is true before step 1; postconditions are guaranteed outcomes for success and failure.
- The agent may write `Status: Draft`. Only humans set `Reviewed` or `Approved`.
- Ambiguity in the professor's brief is listed under "Open questions", never silently decided.
- Keep `docs/specs/dashboard.md` in sync when a use case changes status.
