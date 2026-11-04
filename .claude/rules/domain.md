---
paths:
  - "src/domain/**"
---
# Domain layer (Entities)

Purpose: business concepts and invariants: User, Progress (one per user and `gameId`), Score / LeaderboardEntry,
Level (common part + `gameId`-specific section), GameId as a value object.

Allowed imports: other files in `src/domain/**` and the TypeScript standard library. No NestJS, Express, ORM, JWT or hashing libraries.

Rules:
- Entities protect their invariants in constructors/factory methods (e.g. stars 0–3, score ≥ 0, known `gameId`).
- `gameId` is a dimension, not a reason to duplicate types: one `Progress`, one `LeaderboardEntry`, one `Level` schema.
  The per-game level section is validated by a strategy per `gameId` (registry), not by a switch.
- Pure and deterministic: no `Date.now`, `new Date()`, `Math.random`, `console`, I/O or `process.env`. Time comes from an injected clock.
- Names in business language: progress, score, level, player. Never row, request, json, jwt, table.
- No persistence or transport annotations on entities.
