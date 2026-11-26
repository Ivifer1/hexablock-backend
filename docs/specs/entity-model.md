# Entity model (glossary) — backend

Status: Draft. Structure and relations remain a team decision (ADRs + class diagram).
The descriptions below reflect implemented backend concepts; updating this glossary does not grant formal approval.

| Term | Meaning |
| --- | --- |
| User | Account identity, username, password hash, role and creation date; public registration creates a player. Hashing and token issuance use application ports. |
| Session / Token | Authentication proof issued at registration/sign-in. JWT encoding and verification are adapter details, not a persisted domain session entity. |
| GameId | Identifier of a variant (hexa-lines, hexa-fit, hexa-sort, hexa-merge, future ones). |
| Progress | Retained progress per user and GameId, with either a global best count or per-level progress. It is separate from leaderboard personal-best storage. |
| LevelProgress | One level's retained completion flag, stars and best score, combined without discarding previously earned progress. |
| Score | A nonnegative safe-integer value for an attempt or retained best; it is not a whole submission or storage record. |
| RankingScope | A GameId plus an optional LevelId, distinguishing game-wide and per-level rankings. |
| PersonalBest | A player, RankingScope, Score and AchievedAt. Equal or lower attempts preserve the record; only higher attempts replace it and the time. |
| AchievedAt | Validated achievement time retained with the personal best. |
| Leaderboard | An application read result, not a separately stored domain aggregate. Candidates contain public Username, Score and AchievedAt; application assigns competition ranks from score/time ties. |
| Level | A definition with SchemaVersion, LevelId, GameId, LevelNumber/order, LocalizedName, BoardDefinition and a typed ILevelSection. There is no common difficulty property in the implemented model. |
| BoardDefinition | Level topology identifier and explicit coordinates for the board's cells. Topology strategies support common validation. |
| ILevelSection | Immutable typed variant-owned level data, identified by a section key; external JSON is decoded by adapters. |
| Optional | Explicit presence/absence in inner contracts, including a ranking's optional level. |

## Boundaries and references

- Domain definitions: [`src/domain`](../../src/domain/README.md).
- Progress models, the shared game catalog, public ranking projections and scope coordination: [`src/application`](../../src/application/README.md).
- HTTP and stored shapes are mapped by adapters; they are not the domain model. See the [API contract](api-contract.md) and [level format](level-format.md).
- MongoDB stores game-wide personal bests with an explicit null level; the domain represents absence with `Optional<LevelId>`.
