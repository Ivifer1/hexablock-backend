---
paths:
  - "src/**"
---
# Design pattern map (GoF) — use where they fit, justify each in the change record

| Pattern | Where it fits in the backend |
| --- | --- |
| Strategy | Per-`gameId` level-section validation; ranking policy (high score vs. levels/stars) |
| Factory / Abstract Factory | Registry that returns the strategies for a `gameId` |
| Repository (+ Adapter) | Ports in application, ORM-backed adapters |
| Adapter | Hashing, JWT, database driver behind ports |
| Facade | A simple entry point over several use cases if the API needs it |
| Decorator | AOP aspects around use cases: logging/timing, error mapping/retry, authorization, caching |
| Builder | Assembling a `Level` from the generic schema + game section |
| Template Method | Shared skeleton for "validate → persist → respond" flows, if it removes real duplication |
| Observer | Domain events (e.g. ScoreSubmitted → leaderboard cache invalidation) |

Rules: no pattern for its own sake. State the problem, the participants and the simpler alternative rejected.
