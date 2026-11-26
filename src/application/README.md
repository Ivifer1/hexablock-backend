# Layer 2 — Application (Use Cases)

Framework-independent use cases, their input/output models and the ports needed to perform external operations.

## Current responsibilities

| Area | Examples | Responsibility |
| --- | --- | --- |
| Authentication | `RegisterUseCase`, `LoginUseCase`, `GetCurrentUserUseCase` | Coordinate users, hashing, tokens and time through ports |
| Administrator setup | `BootstrapFirstAdministratorUseCase` | Coordinate insert-only first-administrator creation through a dedicated port |
| Levels | `ListLevelsUseCase`, `GetLevelUseCase`, `CreateLevelUseCase`, `ReplaceLevelUseCase`, `DeleteLevelUseCase` | Coordinate validation, repository access and write-readiness checks |
| Progress | `ListPlayerProgressUseCase`, `GetGameProgressUseCase`, `SyncPlayerProgressUseCase` | Read or combine progress using registered models and validate supplied level membership |
| Personal bests | `SubmitScoreUseCase`, `IPersonalBestRepository` | Resolve ranking scope and submit an attempt to guarded score storage, independently of progress storage |
| Leaderboard | `QueryLeaderboardUseCase`, `GetLeaderboardUseCase`, `ILeaderboardQuery` | Validate requested scope and assign competition ranks over ordered, bounded public candidates |

## Shared capabilities and ports

- `GameCatalog` implements separate progress and ranking catalog interfaces. One registration carries both capabilities; infrastructure supplies concrete registrations.
- `IProgressModel` strategies represent global-score and per-level progress without duplicating the common synchronization workflow.
- Storage, password hashing, token operations and time are reached through ports in `ports/` and implemented outside this layer.
- `ILeaderboardQuery` is a read port, separate from `IPersonalBestRepository` writes. It returns ordered candidates with public username, score and achievement time; application assigns ranks using score/time ties, not internal user IDs.
- `IUseCase` is a reusable execution contract. Its existence does not mean custom AOP decorators are implemented or planned for the backend.

## Dependency and boundary rules

- Depend only on this layer and domain; use plain classes, with no NestJS decorators, HTTP request objects or MongoDB APIs.
- Receive ports through constructors. Composition and concrete adapter selection belong to infrastructure.
- Name ports and methods by intent (`save(progress)`, `issueFor(user)`), not mechanism (`insertRow`, `signJwt`).
- Do not couple score submission to progress persistence or use a score writer to read the leaderboard.
- Validate business scope here; HTTP syntax, status codes and serialization belong to adapters.

## Verification

Use-case unit tests use port fakes in [`test/application`](../../test/application).
Integration and HTTP tests verify the same workflows with disposable MongoDB; see the [root README](../../README.md#tests).
