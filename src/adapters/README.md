# Layer 3 — Interface Adapters

HTTP controllers, DTOs, mappers and the implementations of the ports declared in `application`.

- Depends on `application` and `domain`, never on `infrastructure`.
- NestJS decorators for controllers and DTOs belong here. This is the first layer where technical names (`PostgresProgressRepository`, `JwtTokenIssuer`) belong.
