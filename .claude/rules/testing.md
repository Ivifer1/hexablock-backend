---
paths:
  - "test/**"
  - "src/**/*.spec.ts"
  - "src/**/*.e2e-spec.ts"
---
# Testing rules

- Tests derive from specs: main flow → happy path, each alternative/exception flow → scenario, each business rule → assertion.
  Put the `UC-###` in the `describe`.
- Name: `should_<expected_result>_when_<condition>`; AAA with `// Arrange`, `// Act`, `// Assert`.
- Unit: entities and use cases with hand-written fakes for ports and a fake clock.
- Integration: use cases + real repository implementations on an in-memory database.
- E2E (Supertest): every endpoint, auth required/denied, validation errors, `gameId` filtering, leaderboard per level.
- Contract tests with Pact are recommended for the client ⇄ backend API.
- Test behaviour through public APIs. Before accepting a test, break the rule and see it fail.
- Never skip, delete or weaken a test to make the suite pass.
