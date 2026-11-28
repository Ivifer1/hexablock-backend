# Layer 1 — Domain (Entities)

Business values, entities and rules, independent of HTTP, NestJS and MongoDB.

## Current responsibilities

| Area | Examples | Responsibility |
| --- | --- | --- |
| Users | `User`, `UserId`, `Username`, `Password`, `PasswordHash` | User identity and validated credential values; hashing and token issuance are external |
| Levels | `Level`, `BoardDefinition`, `LevelValidator` | Common level invariants and validation through registered section/topology strategies |
| Variant sections | `HexaFitSectionValidator`, `HexaSortSectionValidator` | Variant-owned level rules without variant conditionals in the common validator |
| Topology | `IBoardTopology`, `HexAxialTopology` | Board connectivity and coordinate semantics for level validation |
| Progress | `Progress`, `LevelProgress` | Retained player progress and its values |
| Scores | `PersonalBest`, `RankingScope`, `Score`, `AchievedAt` | A retained best per player and game/level; only a higher score replaces its value and achievement time |
| Shared values | `Count`, `Optional`, `DomainError`, `ErrorCode` | Validated counts, explicit absence and business failures |

The backend validates level definitions; it does not implement the client's game engine or Builder.
Ranking scope and score values live here, but public leaderboard projections and competition-rank assignment belong to application.

## Dependency and boundary rules

- Import no outer layer, NestJS, Express, Mongoose or database driver.
- Use business names (`progress`, `score`, `level`), not storage or transport mechanisms (`row`, `request`, `json`, `jwt`).
- Keep domain invariants in domain values. Convert raw HTTP and persisted values at adapter boundaries rather than adding framework annotations here.
- Use `Optional<T>` for values that may be absent in domain contracts.
- Keep registration of concrete strategies in infrastructure; the common validator depends on its strategy interfaces.

## Verification

Domain behavior tests live in [`test/domain`](../../test/domain).
The [architecture tests](../../test/architecture/layer-boundaries.spec.ts) pin the lint restrictions between layers.
