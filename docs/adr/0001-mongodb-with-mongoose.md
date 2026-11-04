# ADR-0001: MongoDB with Mongoose for persistence

Status: Proposed
Date: 2026-11-04 · Deciders: Ivifer1, llamb1315, Leoibarrapp

## Context
The backend stores users, progress per user and `gameId`, leaderboards per `gameId` and per level, and levels.
The brief asks for a levels CRUD with a generic schema plus a section per `gameId`: each variant (Hexa Fit, Hexa Sort…)
has a different level shape, and a fifth variant must be addable without changing existing use cases.
Integration tests must run against an in-memory database (brief, section 3.6).

## Decision
We use MongoDB as the database and Mongoose (through `@nestjs/mongoose`) as the ODM. Integration tests run against
`mongodb-memory-server`. Mongoose and the MongoDB driver are only allowed in `adapters` (repository implementations)
and `infrastructure` (connection and module wiring); `domain` and `application` depend on repository ports.
The lint configuration enforces this boundary and the architecture tests pin it.

## Consequences
- Positive: the per-variant section of a level is stored as a nested document, so a new variant adds its section
  without a migration or a new collection.
- Positive: `@nestjs/mongoose` is the official NestJS integration, and `mongodb-memory-server` works with it without a replica set.
- Negative: Mongoose schemas are weaker than TypeScript types; the domain keeps its own types and validates its invariants,
  and repositories map between documents and domain objects.
- Negative: no foreign keys or joins; references between users, progress and leaderboards are checked by the use cases.
- Swapping the database later only touches the repository adapters and the infrastructure module.

## Alternatives considered
- Relational database (PostgreSQL, SQLite): the per-variant level section would need a JSON column or one table per variant;
  the team chose a document database.
- Prisma: strong generated types, but with MongoDB it requires a replica set (also in tests) and its MongoDB support is less mature.
- Official MongoDB driver only: full control, but every mapping and validation is written by hand.
