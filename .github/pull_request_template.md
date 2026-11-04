## What
<!-- Summary. Reviewers: read the spec changes first, then the code, then the tests. -->

## Spec and traceability
- Use cases / requirements: UC-###, FR-###
- Change record: `docs/ai/change-records/<branch>.md`

## Design rationale
- **Clean Architecture:** layers touched; all dependencies point inwards; ports and adapters added.
- **SOLID:** principle → class → how it holds.
- **Design patterns:** pattern → participants → why.
- **Extensibility:** what a new variant / rule would add; files it would not touch.

## How to test
<!-- Commands and manual steps. -->

## AI usage
<!-- Tool + model, what it generated, what the team changed. Mirrored in AI_USAGE.md. -->

## Checklist
- [ ] Spec updated/approved before code (spec-first)
- [ ] Design proposal approved by a human (`Status: APPROVED`)
- [ ] No inner layer depends on an outer layer or framework
- [ ] No per-variant conditionals in the engine or use cases
- [ ] Tests AAA, named `should_..._when_...`, cover every flow and business rule
- [ ] Typecheck, lint and tests green locally and in CI
- [ ] Commit messages follow Conventional Commits, in English
- [ ] README / EXTENSIBILITY / OpenAPI / diagrams updated if needed
- [ ] AI_USAGE.md entry added
