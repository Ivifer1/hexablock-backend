# AI Usage

## Tools

TBD

## Task Log

| Date | Task | Prompt | Result | Changes made |
|------|------|--------|--------|--------------|
| 2026-10-31 | Backend project scaffold | "Set up the backend: NestJS + TypeScript, four Clean Architecture layers, a lint rule that blocks inner layers from importing outer layers, and CI" | NestJS 12 base project, `src/` layer folders with READMEs, oxlint `no-restricted-imports` overrides per layer, architecture test, `GET /health` endpoint with e2e test, GitHub Actions workflow | Pending team review in the PR. Test sample files use the imported binding because oxlint reports a re-exported import twice; `@nestjs/mau` deploy dependency removed |
| 2026-11-10 | MongoDB connection and in-memory test database (#15) | "Let's start with the MongoDB connection" | Design proposal (change record), `readDatabaseUri` config function, `DatabaseModule` with `MongooseModule.forRootAsync`, `.env` loading in `main.ts`, Vitest global setup for `mongodb-memory-server`, unit and e2e tests | Proposal reviewed and approved by Ivifer1 before any code; team chose Mongoose in ADR-0001 |
| 2026-11-11 | User entity and repository (#16) | "Let's continue with what is left" | Design proposal (change record) from the class diagram, `User` aggregate with `UserId`/`Username`/`PasswordHash`/`Role` value objects, generic `Optional<T>`, `DomainError` with `ErrorCode`, `IUserRepository` port, `MongoUserRepository` with mapper and schema, unit and integration tests | Proposal reviewed and approved by Ivifer1 before any code; `User.create` receives id and date (differs from the diagram) to keep the domain deterministic |

## Critical Evaluation

TBD — estimated percentage of AI-assisted work and errors detected.
