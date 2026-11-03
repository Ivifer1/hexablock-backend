# Layer 2 — Application (Use Cases)

Use cases (register, sign in, sync progress, submit score…) and the ports they need, such as `IProgressRepository` or `ITokenIssuer`.

- Depends only on `domain`. No NestJS decorators here: use cases stay plain classes so they can be tested and reused without the framework.
- Anything external (database, hashing, tokens, time) is reached through a port defined here and implemented in an outer layer.
- Port and method names state intent (`save(progress)`, `issueFor(user)`), never the mechanism (`insertRow`, `signJwt`). Mechanism names in an inner layer are structural coupling.
