---
paths:
  - "src/adapters/**"
---
# Interface Adapters layer

Contains: NestJS controllers and DTOs (with validation and Swagger decorators), guards that adapt JWT to the session port,
exception filters that map application errors to a consistent HTTP error body, repository implementations of the ports,
mappers (domain ⇄ persistence model ⇄ DTO), adapters for hashing and token libraries.

Allowed imports: `src/application/**`, `src/domain/**`, NestJS and libraries. Never `src/infrastructure/**`.

Rules:
- Controllers are thin: validate/parse input, call ONE use case, map the result to a DTO. No business rules.
- Every endpoint is documented in OpenAPI (summary, params including `gameId`, request/response schemas, error codes).
- Consistent responses and errors: same error envelope, correct status codes (400 validation, 401/403 auth, 404, 409 conflict, 500 never leaks details).
- Repository implementations translate persistence models; the domain never sees ORM entities.
- Technical names are allowed here (`TypeOrmProgressRepository`, `BcryptPasswordHasher`, `JwtTokenIssuer`).
