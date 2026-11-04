---
name: api-endpoint
description: Add or change a REST endpoint following Clean Architecture (use case + port + adapter + controller + DTO + OpenAPI + e2e test). Use for auth, progress, leaderboard or level endpoints.
argument-hint: "METHOD /path (UC-###)"
---
# /api-endpoint — one endpoint, all layers, in order

Requires an approved use case and an approved proposal (normal `/implement` gate).

1. **Contract first:** method, path, `gameId` placement (path or query), auth required?, request/response DTOs, status codes and
   the error body. Write it in the use case and in the proposal.
2. **Domain:** entities/value objects and invariants needed (no framework).
3. **Application:** one use case class with `execute(input)`, ports it needs (intent names), typed application errors.
4. **Adapters:** repository/gateway implementations; DTOs with validation and Swagger decorators; thin controller calling ONE use case;
   mapper domain ⇄ DTO; error mapping in the exception filter.
5. **Infrastructure:** bind ports to adapters in the module, wrap the use case with the AOP decorators that apply (logging/timing,
   error handling, authorization, caching).
6. **Tests:** unit test of the use case with fakes; e2e with Supertest for success, validation error, unauthorized, not found,
   and `gameId` filtering. Names `should_<expected>_when_<condition>`.
7. Verify the endpoint appears correctly in Swagger. Note the contract change for the client team (and Pact, if used).
