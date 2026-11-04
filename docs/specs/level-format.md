# Level format

The single format for every level-based variant (Hexa Fit, Hexa Sort, and any future one).
The brief asks for "one schema with a specific section per `gameId`" (section 5.2), and for a Builder that assembles
the board, the pieces and the goals from JSON (section 3.3).

The backend owns this contract: the levels CRUD stores and validates it, and the client Builder reads it.

Examples: [`levels/hexa-fit.example.json`](levels/hexa-fit.example.json), [`levels/hexa-sort.example.json`](levels/hexa-sort.example.json).

## Structure

A level has a **common part**, shared by every variant, and **one section named after its variant** (`fit`, `sort`…).

```json
{
  "schemaVersion": 1,
  "id": "fit-003",
  "gameId": "hexa-fit",
  "order": 3,
  "name": { "es": "El panal", "en": "The honeycomb" },
  "board": { "topology": "hex-axial", "cells": [[0, 0], [1, 0]] },
  "fit": { }
}
```

### Common part

| Field | Type | Meaning |
|---|---|---|
| `schemaVersion` | integer | Version of this format. Currently `1`. |
| `id` | string | Unique level id, lowercase letters, digits and `-` (for example `fit-003`). |
| `gameId` | string | Variant the level belongs to (`hexa-fit`, `hexa-sort`). Selects the variant section and its validator. |
| `order` | integer ≥ 1 | Position in the variant's level list: progressive difficulty and unlock order. |
| `name` | object | Display name per language: `es` and `en` are required. |
| `board.topology` | string | Cell geometry used to read `cells` (see below). |
| `board.cells` | array of coordinates | The playable cells: the figure in Hexa Fit, the board in Hexa Sort. |

### Board: topology and cells

`board.cells` lists every playable cell. A coordinate is an **array of integers** whose meaning is given by
`board.topology`. The format never assumes hexagons: a new cell shape adds a topology id, not new fields.

| `topology` | Coordinate | Meaning |
|---|---|---|
| `hex-axial` | `[q, r]` | Hexagonal cell in axial coordinates. |

The board is always an explicit list of cells (no named shapes such as "hexagon of radius 2"), so one rule reads
every board. A radius-2 hexagon is the 19 cells listed in the Hexa Sort example.

### Hexa Fit section (`fit`)

| Field | Type | Meaning |
|---|---|---|
| `pieces` | array | The fixed set of pieces of the level. |
| `pieces[].id` | string | Piece id, unique within the level. |
| `pieces[].cells` | array of coordinates | Piece shape, relative to its own origin `[0, 0]`, in the board topology. Rotations are computed by the topology, not stored. |
| `stars` | array | Star thresholds, from the best result down. |
| `stars[].stars` | integer | Stars awarded: `3` or `2`. |
| `stars[].maxMoves` | integer ≥ 1 | Maximum moves to earn them. |
| `stars[].maxSeconds` | integer ≥ 1 | Maximum seconds to earn them. |

Stars: the player earns the first threshold whose `maxMoves` **and** `maxSeconds` are both met. Completing the level
always earns at least 1 star. A move is each place, remove or rotate action.

### Hexa Sort section (`sort`)

| Field | Type | Meaning |
|---|---|---|
| `goal.clearedStacks` | integer ≥ 1 | Stacks of 10 tiles of one colour to clear to win. |
| `colors` | array of strings | Colour ids used by the tray. Semantic ids (`tone-1`), never colour values: the injected palette maps them to colours. |
| `stackHeight.min` / `stackHeight.max` | integers | Tile count range of each stack the tray offers. |
| `seed` | integer, optional | Seed of the tray generator. With a seed the level always offers the same stacks; without it, they are random. |

## Validation rules

The backend validates in two steps. The **common part** is validated by one generic validator. The **variant section**
is validated by a strategy registered for its `gameId`, so adding a variant adds a strategy and never edits the
common validator or the levels use cases.

Common part:
1. `schemaVersion` is `1`.
2. `id` matches `^[a-z0-9-]+$` and is unique.
3. `gameId` has a registered validator; the level contains the section of that variant and no other variant section.
4. `order` is an integer ≥ 1, unique within its `gameId`.
5. `name.es` and `name.en` are non-empty.
6. `board.topology` is a known topology.
7. `board.cells` is non-empty, has no duplicates, and every coordinate has the length the topology expects.
8. `board.cells` is connected according to the topology neighbours.

Hexa Fit:
1. `pieces` is non-empty and piece ids are unique.
2. Every piece has at least one cell, no duplicates, contains `[0, 0]` and is connected.
3. The total number of piece cells equals the number of board cells (brief, section 1.2).
4. `stars` has at most one threshold per star value; the 3-star limits are not higher than the 2-star limits.

Equal area is necessary, not sufficient: whether a level can be solved is checked by playing it, not by the schema.

Hexa Sort:
1. `goal.clearedStacks` is an integer ≥ 1.
2. `colors` has at least 2 unique ids.
3. `1 ≤ stackHeight.min ≤ stackHeight.max < 10` (a stack of 10 is cleared).
4. `seed`, when present, is an integer.

## Adding a variant

1. Add its section (for example `fill`) and document it here.
2. Register a validator for its `gameId` in the backend, and its level builder step in the client.

The common part and the existing variant sections do not change.
