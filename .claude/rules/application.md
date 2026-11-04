---
paths:
  - "src/application/**"
---
# Application layer (Use Cases)

Purpose: RegisterUser, SignIn, SyncProgress, GetProgress, SubmitScore, GetLeaderboard, GetLevels, UpsertLevel…

Allowed imports: `src/domain/**` and `src/application/**`. No `@nestjs/*` (not even decorators), Express, ORM, JWT or bcrypt.

Rules:
- Plain classes with one public `execute(input)`; dependencies are ports injected through the constructor.
- Ports declared here with intent names: `IUserRepository`, `IProgressRepository`, `ILeaderboardRepository`, `ILevelRepository`,
  `IPasswordHasher`, `ITokenIssuer`, `IClock`. Never `PostgresX`, `insertRow`, `signJwt` in this layer.
- One use case per action, generic over `gameId`. No duplicated use case per variant and no `switch (gameId)`;
  filtering by `gameId` is a parameter, per-game validation is a strategy.
- Cross-cutting concerns are AOP decorators implementing the same use case interface (logging with timing, centralized error
  mapping / retries for persistence, authorization `RequiresSession`, caching for `GetLeaderboard`). Applied in the composition root.
- Return domain objects or application result types, never HTTP responses; errors are typed application errors mapped to HTTP in adapters.
- Each use case maps to a `UC-###`; reference it in a short doc comment.
