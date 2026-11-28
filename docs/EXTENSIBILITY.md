# Backend extensibility

This guide describes extension points already implemented in the backend. It does not approve a new variant, topology, dependency or API contract.
The mobile engine, per-variant Abstract Factories and level Builder belong to the client, not this repository.

## Add a variant using existing capabilities

1. Agree its game identifier, level format (if any), progress model and ranking scope with the team before implementation.
2. Supply one registration in the `GameCatalog` composition in [`ProgressModule`](../src/infrastructure/progress/progress.module.ts). Progress and ranking capabilities are independent: a global-score progress model is not the same concept as a game-wide ranking.
3. Reuse `BestScoreProgressModel` or `LevelProgressModel` when the approved rules fit, or implement the narrow `IProgressModel` contract for genuinely different rules.
4. For a level-based variant, add its typed section, validator and boundary mappings as described below.
5. Prove behavior through public use cases and HTTP integration. Existing auth, progress, score and ranking routes should not need variant-specific branches.

Current examples are configuration, not a fixed list in the workflow: Lines/Merge use global-score progress and game-wide ranking; Fit/Sort use per-level progress and ranking, with different maximum-star configuration.
Concrete configuration changes at the composition boundary are expected; modifying common use cases to switch on a new variant is not the extension strategy.
The existing progress models operate on the current progress input shape. A new payload shape or merge semantics needs contract/domain review rather than registration alone.

## Add a level section

Follow [the level format](specs/level-format.md), including its common envelope and variant-owned section key.

| Boundary | Existing extension point | Current example |
| --- | --- | --- |
| Domain data | `ILevelSection` implemented by a typed immutable section | Fit and Sort sections |
| Domain rules | `ILevelSectionValidator` | Fit topology-aware validation and Sort section constraints |
| Validation composition | `createLevelValidator()` registrations | `registerSection(GameId, validator)` |
| HTTP payload translation | Section encode/decode bindings | `adapters/levels/level-section-payloads.ts` |
| Persistence translation | Section mappers used by `LevelMapper` | `HexaFitSectionMapper`, `HexaSortSectionMapper` |
| Boundary composition | `createLevelSectionBindings()` | Game/section-key/mapper/encode/decode/error bindings |

Reuse the existing common level validator, request mapper and repository. Do not add optional properties named for each variant to a common DTO, or duplicate controllers and persistence per variant.
Variant-owned payload validation is still needed: a generic envelope is not permission to accept arbitrary JSON.
Check the OpenAPI contract and examples whenever the externally documented level format changes.

## Topology boundary

Domain level validation asks `IBoardTopology` for coordinate semantics; `HexAxialTopology` is the production implementation currently registered by `createLevelValidator()`.
A new topology needs its own implementation, agreed format identifier, registration and behavior tests. Do not assume that changing a label alone enables another coordinate system.
Coordinate any future `square` support with the client owner; it is not enabled or authorized by this guide.

## Scores and ranking

`IGameRankingCatalog` resolves the same registration used by progress, but exposes only ranking capability.
`SubmitScoreUseCase` validates the scope and delegates retention to `IPersonalBestRepository`; it does not synchronize progress.
`QueryLeaderboardUseCase` validates requested scope, `ILeaderboardQuery` supplies the ordered bounded public prefix, and `GetLeaderboardUseCase` assigns competition ranks.

For a new variant using an existing scope, reuse those workflows. Preserve the following invariants:

- One personal best per player and scope; equal or lower attempts do not change its time.
- Read entries only from the exact game/level scope; game-wide absence is explicit in stored data.
- Limit before resolving usernames; expose no private user data or internal IDs.
- Score/time ties share ranks. An internal user ID may stabilize the prefix, not improve a rank.
- A projection failure rejects the whole read rather than returning a misleading partial ranking.

A new ranking mode, score representation or tie rule is a contract/design change, not just another registration. It requires explicit agreement and new verification before modifying the shared workflow.

## Replace an external implementation

Implement the relevant application port and change its binding in infrastructure. Keep HTTP, Mongo, JWT and hashing details out of domain/application.
For example, a replacement `ILeaderboardQuery` must retain the same ordering, limit, public projection and all-or-nothing failure semantics; a replacement score repository must retain confirmed-write and concurrency semantics.
Changing storage formats or indexes requires an explicit operational plan. Registration does not migrate stored data, repair indexes or deploy anything.

## Verification checklist

- Derive deterministic behavior tests from the agreed use case; observe applicable RED before implementation.
- Use port fakes for unit tests and disposable MongoDB for persistence/E2E tests.
- Exercise the new registration and existing siblings sharing changed helpers; preserve auth and error behavior.
- Update contract documentation and examples alongside the behavior. Do not mark a proposal approved or a feature deployed merely because tests pass.
- Run `npm test`, `npm run test:e2e`, `npm run typecheck`, `npm run lint` and `npm run build` for implementation changes. Read back and structurally validate passive documentation changes.

See the [layer README files](../README.md#architecture), [API contract](specs/api-contract.md) and [verification dashboard](specs/dashboard.md).
Project-level AOP is planned in the client; no additional backend aspects are implied by these extension points.
