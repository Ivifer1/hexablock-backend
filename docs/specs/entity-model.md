# Entity model (glossary) — backend

Status: Draft. Structure and relations are a team decision (ADRs + class diagram).

| Term | Meaning |
| --- | --- |
| User | A registered player with credentials. |
| Session / Token | Proof of authentication issued at sign-in (JWT is an adapter detail). |
| GameId | Identifier of a variant (hexa-lines, hexa-fit, hexa-sort, hexa-merge, future ones). |
| Progress | One record per user and GameId: levels completed, stars, best scores. |
| Score | A result submitted for a GameId (and level, if level-based). |
| Leaderboard | Ranked scores for a GameId, or a GameId and level. |
| Level | A level definition: common part (id, order, difficulty, GameId) plus a GameId-specific section. |
