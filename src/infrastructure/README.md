# Layer 4 — Frameworks & Infrastructure

Entrypoints, configuration and composition roots that assemble the application with concrete framework and adapter implementations.

## Current responsibilities

| Area | Examples | Responsibility |
| --- | --- | --- |
| HTTP startup | `main.ts`, `http/configure-app.ts` | Start NestJS, configure the business route prefix and HTTP parsing/error handling |
| API documentation | `http/configure-openapi.ts` | Enable Swagger only through explicit configuration and generate it from controller metadata |
| Configuration | `config/`, `database/` | Read required database/JWT settings and connect Mongoose |
| Application wiring | `AppModule`, `AuthModule`, `LevelsModule`, `ProgressModule`, `ScoresModule`, `LeaderboardModule` | Bind use cases, ports, HTTP adapters and persistence implementations |
| Construction | `levels/create-level-validator.ts`, `levels/create-level-repository.ts` | Assemble section/topology strategies and repository mapping |
| Variant registration | `ProgressModule` and `GameCatalog` wiring | Supply one variant registration with separate progress/ranking capabilities and reuse it across modules |
| Operator entrypoint | `bootstrap/` | Parse private password input, assemble the first-administrator command and report its outcome |

## Dependency and boundary rules

- May depend on every inner layer. Nothing inward may depend on this layer or its NestJS modules/tokens.
- Select concrete implementations and inject ports here; keep business rules in domain/application and external translation in adapters.
- Do not duplicate variant lists for progress, score submission and leaderboard reads.
- Keep secrets in approved runtime configuration, never in source, documentation examples or committed environment files.
- Preserve explicit operator boundaries: the administrator command does not load the server's `.env`, promote an existing user or provision its prerequisite indexes.
- Progress and personal-best schemas disable automatic collection/index creation. Wiring models is not production index provisioning; do not add request-time setup as a convenience.

## Verification and operations

The [root README](../../README.md) documents startup variables, development commands and prerequisites for explicit operator actions.
The [API contract](../../docs/specs/api-contract.md) describes the wired routes.
Integration and E2E tests assemble these modules against disposable MongoDB; passing those checks does not imply deployment or production database access.
