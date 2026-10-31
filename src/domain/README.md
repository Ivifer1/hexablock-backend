# Layer 1 — Domain (Entities)

Business entities and rules: users, progress per `gameId`, scores, leaderboards and the generic level schema.

- Depends on nothing outside this folder: no other layer, no NestJS, Express or database packages.
- Names speak the business language (`progress`, `score`, `level`), never technical details (`row`, `request`, `json`, `jwt`).
