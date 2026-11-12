# AI Usage

## Tools

TBD

## Task Log

| Date | Task | Prompt | Result | Changes made |
|------|------|--------|--------|--------------|
| 2026-10-31 | Backend project scaffold | "Set up the backend: NestJS + TypeScript, four Clean Architecture layers, a lint rule that blocks inner layers from importing outer layers, and CI" | NestJS 12 base project, `src/` layer folders with READMEs, oxlint `no-restricted-imports` overrides per layer, architecture test, `GET /health` endpoint with e2e test, GitHub Actions workflow | Pending team review in the PR. Test sample files use the imported binding because oxlint reports a re-exported import twice; `@nestjs/mau` deploy dependency removed |
| 2026-11-10 | MongoDB connection and in-memory test database (#15) | "Let's start with the MongoDB connection" | Design proposal (change record), `readDatabaseUri` config function, `DatabaseModule` with `MongooseModule.forRootAsync`, `.env` loading in `main.ts`, Vitest global setup for `mongodb-memory-server`, unit and e2e tests | Proposal reviewed and approved by Ivifer1 before any code; team chose Mongoose in ADR-0001 |
| 2026-11-11 | User entity and repository (#16) | "Let's continue with what is left" | Design proposal (change record) from the class diagram, `User` aggregate with `UserId`/`Username`/`PasswordHash`/`Role` value objects, generic `Optional<T>`, `DomainError` with `ErrorCode`, `IUserRepository` port, `MongoUserRepository` with mapper and schema, unit and integration tests | Proposal reviewed and approved by Ivifer1 before any code; `User.create` receives id and date (differs from the diagram) to keep the domain deterministic |
| 2026-11-11 | Register endpoint (#17, UC-001) | "Yes, let's continue with #17" | Use case spec UC-001, design proposal, `RegisterUseCase`, ports `IPasswordHasher`/`IClock`/`ITokenIssuer`, scrypt and JWT adapters, `AuthController`, error filter for 400/409, `/api/v1` prefix, unit, integration and e2e tests | Proposal and the new `@nestjs/jwt` dependency approved by Ivifer1 before any code; the token issuer was pulled forward from #18 so register meets the API contract |
| 2026-11-11 | Login endpoint (#18, UC-002) | "Yes" (continue with #18) | Use case spec UC-002, design proposal, `LoginUseCase`, `IPasswordHasher.verify` with constant-time comparison and the cost read from the stored hash, `POST /api/v1/auth/login`, 401 row in the error filter, one database per e2e test file, unit and e2e tests | Proposal approved by Ivifer1 before any code; Ivifer1 chose to update diagram tab B4 to the code (no DTO classes until Swagger, #21) |
| 2026-11-12 | JWT guard and current user (#19, UC-003) | "Yes, that order, start with #19" | Use case spec UC-003, design proposal, `JwtAuthGuard`, `@CurrentUser()`, `JwtTokenIssuer.verify` (HS256 only), `GetCurrentUserUseCase`, `GET /api/v1/auth/me`, 401 row in the error filter, unit and e2e tests | Proposal approved by Ivifer1 before any code, including three changes to the class diagram; `RolesGuard` postponed to the levels endpoints |

## Critical Evaluation

TBD — estimated percentage of AI-assisted work and errors detected.
