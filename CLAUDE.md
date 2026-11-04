# HexaBlock Suite — backend

REST API for HexaBlock Suite: JWT auth, progress sync per user and `gameId`, leaderboards per `gameId` (and per level),
and level definitions for Hexa Fit and Hexa Sort. University project (Desarrollo de Software, NRC 15671), graded on design
quality. Due 2026-12-14. The mobile client lives in a separate repo (`hexablock-client`); the contract between both is the OpenAPI spec.
Stack: NestJS 12, TypeScript (strict, ESM `nodenext`: relative imports end in `.js`), Vitest + Supertest, oxlint. Node 24.

## Commands
- `npm test` (unit + architecture) · `npm run test:e2e` · `npm run lint` · `npm run typecheck` · `npm run start:dev`

## Language
- Talk to the team in **Spanish**. Everything committed (code, comments, docs, commits, PRs) is in **English**.

## Non-negotiable rules (from the professor's brief; violating any of them loses points)
1. **Generic by `gameId`, never one copy per game.** One progress entry per user and variant; one leaderboard model keyed by
   `gameId` (+ level for level-based variants); ONE level schema with a common part and a `gameId`-specific section.
   No controller, use case or table duplicated per variant. Per-variant differences (e.g. validating the level section)
   live behind a Strategy chosen by a registry/factory, not in `if/switch` chains inside use cases.
2. **Open/Closed:** a new variant must be supportable by adding a strategy/config entry, without editing existing use cases.
3. **Clean Architecture, dependency rule inwards:** `infrastructure → adapters → application → domain`.
   `domain` and `application` are plain TypeScript: no NestJS decorators, no Express, no ORM, no JWT or hashing library.
   NestJS controllers/DTOs live in `adapters`; modules are the composition root in `infrastructure`. Layer rules: `.claude/rules/`.
4. **SOLID everywhere** and **GoF patterns** where they solve a real problem (Strategy, Factory, Adapter, Facade, Decorator,
   Repository…). Every pattern you introduce is justified in the change record.
5. **Infrastructure is a detail.** Database, password hashing, token issuing, clock, config and logging are ports declared in
   `application` with intent names (`ITokenIssuer.issueFor(user)`, `IPasswordHasher`, `IClock`), implemented in `adapters`.
   Swapping the database must not touch domain or use cases.
6. **AOP without libraries:** logging, timing, centralized error handling/retries, authorization and caching (e.g.
   `GetLeaderboardUseCase`) are decorators/proxies around use cases. No logger calls or retry loops inside business code.
7. **API quality:** OpenAPI/Swagger documented, consistent response and error shape, correct HTTP status codes, input validated
   at the edge (adapters). Never leak stack traces or password hashes. OWASP basics: hash passwords, validate JWT, rate-sensitive
   endpoints protected, no secrets in code (config comes from env through the composition root).
8. **Tests:** AAA, named `should_<expected>_when_<condition>`. Unit tests for entities and use cases with fakes; integration tests
   with an in-memory database; e2e tests per endpoint including `gameId` filtering and error cases.
9. **Git:** feature branch per change, Conventional Commits in English (`feat(progress): sync progress per gameId`), PR to `main`.
10. **AI transparency:** every significant AI contribution is recorded (change record + `AI_USAGE.md`). The team must be able
    to explain every line in the defence.

## Workflow (spec first; hooks enforce it, do not try to work around them)
1. **Spec.** Behaviour lives in `docs/specs/` (requirements `FR/NFR/C-###`, entity model, use cases `UC-###`). If there is no
   approved use case, write or update it with `/spec` and ask the team to review it. Never invent rules; list open questions.
2. **Design proposal.** On a feature branch, copy `docs/ai/change-records/TEMPLATE.md` to `docs/ai/change-records/<branch>.md`
   (slashes become `__`) and fill the proposal (use the `architect` subagent). `Status: PROPOSED`. Present it in Spanish and
   **wait**. Only a human sets `Status: APPROVED`; until then `src/**` is locked. Tests may be written.
3. **Tests first** from the use case flows, business rules and error cases (`test-engineer` subagent).
4. **Implement** the smallest change that satisfies the spec. Synchronize, do not regenerate.
5. **Verify**: typecheck, lint, unit and e2e green; run the `design-reviewer` subagent on the diff and fix what it finds.
6. **Explain** (see below), update the change record and the OpenAPI docs, then `/commit-pr`. Merging is a human decision.
Use `/implement UC-###`, `/sync UC-###`, and `/api-endpoint` for new endpoints.

## How to explain every change to the humans
End every turn that changed code with a section titled `## Explicación del cambio`, in Spanish, that covers:
- **Qué y por qué**: use case / requirement IDs and the problem solved.
- **Capas**: each file touched and its Clean Architecture layer; confirm that no dependency points outwards.
- **SOLID**: only the principles at play, each with the concrete class and how it is satisfied (or the trade-off).
- **Patrones**: pattern name, the role each class plays, and why it beats the simpler alternative.
- **Extensibilidad**: what a new variant or rule would add, and which files it would NOT touch.
- **API**: endpoint, request/response, status codes and errors, if any changed.
- **Pruebas**: test names and how you checked they fail when the rule is broken.
- **Riesgos y decisiones abiertas**: what the team should double-check or decide.

## Coding standards
- TypeScript strict; no `any`; immutable domain objects; validation of invariants inside entities/value objects.
- Use cases are plain classes with one public `execute(...)`; constructor injection of ports; NestJS wires them in modules
  (factories/`useFactory`), so use cases never import `@nestjs/*`.
- Mappers convert between domain entities, persistence models and DTOs in `adapters`; entities never leave as JSON directly.
- New dependency = ask the team first and verify the package exists.

## Where things are
- Specs: `docs/specs/` · ADRs: `docs/adr/` · Change records: `docs/ai/change-records/` · Diagrams: `docs/diagrams/`
- Layer rules load automatically from `.claude/rules/` when you touch those folders.

## Never
- Commit or push to `main`, force-push, use `--no-verify`, or change git identity/config.
- Edit the harness (`.claude/`, this file), lint rules, architecture tests or CI to make a check pass.
- Disable a lint rule, skip a test, or weaken an assertion to go green. Fix the cause or ask.
- Read or print `.env` files, tokens or credentials. Approve your own proposal or mark a spec `Approved`.
