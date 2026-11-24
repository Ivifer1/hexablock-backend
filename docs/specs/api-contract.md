# REST API contract

The agreement between `hexablock-backend` and `hexablock-client` (brief, section 5.2). The OpenAPI (Swagger)
documentation generated from the code must match this contract; when one changes, the other changes in the same PR.

## Conventions

- Base path: `/api/v1`. `GET /health` stays outside it. When enabled, `/docs` and `/docs-json` are also outside the API prefix and show only the implemented routes.
- JSON in and out. Field names in `camelCase`.
- Authentication: `Authorization: Bearer <accessToken>` on the routes marked 🔒. 🔑 means admin only.
- Every variant is addressed by its `gameId` (`hexa-lines`, `hexa-fit`, `hexa-sort`, `hexa-merge`). No route names a
  variant: a new variant is a new `gameId`, not a new route.
- Each `gameId` is registered with its progress model: **best score** (`hexa-lines`, `hexa-merge`) or **levels**
  (`hexa-fit`, `hexa-sort`). An unknown `gameId` returns `404`.
- Dates are ISO 8601 strings in UTC.

## Errors

Every error has the same shape:

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Username already taken",
  "path": "/api/v1/auth/register",
  "timestamp": "2026-11-04T18:00:00.000Z"
}
```

Validation errors (`400`) add `details`, one entry per invalid field:

```json
{ "statusCode": 400, "error": "Bad Request", "message": "Invalid request",
  "details": [{ "field": "password", "message": "must have at least 8 characters" }],
  "path": "/api/v1/auth/register", "timestamp": "2026-11-04T18:00:00.000Z" }
```

| Code | When |
|---|---|
| `400` | Invalid body or query, including a level that breaks the [level format](level-format.md) rules |
| `401` | Missing, invalid or expired token; wrong credentials |
| `403` | Valid token without the required role |
| `404` | Resource or `gameId` not found |
| `409` | Username or level ID already exists, or the level order is occupied within its game |

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/auth/register` | | Create a user |
| `POST` | `/auth/login` | | Get an access token |
| `GET` | `/auth/me` | 🔒 | Current user |
| `GET` | `/progress` | 🔒 | Progress of the current user in every variant |
| `GET` | `/progress/{gameId}` | 🔒 | Progress in one variant |
| `PUT` | `/progress/{gameId}` | 🔒 | Sync progress in one variant |
| `POST` | `/scores` | 🔒 | Submit a score |
| `GET` | `/leaderboard/{gameId}` | | Leaderboard of a variant or a level |
| `GET` | `/levels` | | Levels of a variant |
| `GET` | `/levels/{id}` | | One level |
| `POST` | `/levels` | 🔑 | Create a level |
| `PUT` | `/levels/{id}` | 🔑 | Replace a level |
| `DELETE` | `/levels/{id}` | 🔑 | Delete a level |

### Auth

Users register with a username and a password; there is no email. Passwords are stored hashed, never in plain text.
Roles: `player` (default) and `admin`. The first admin is created by a setup script, never through the API.

#### `POST /auth/register`

```json
{ "username": "ivifer", "password": "correct-horse" }
```

- `username`: 3–20 characters, lowercase letters, digits and `_`. Unique.
- `password`: at least 8 characters (an emoji counts as one).

`201`:

```json
{
  "user": { "id": "6730f1c2a1b2c3d4e5f60718", "username": "ivifer", "role": "player" },
  "accessToken": "<jwt>",
  "expiresIn": 604800
}
```

`expiresIn` is in seconds (default 7 days, configurable up to 30 days). Errors: `400`, `409` (username taken).

#### `POST /auth/login`

Same body as register. `200` with the same response. Errors: `400`, `401` with the message `Invalid credentials`
whether the username or the password is wrong, so the API does not reveal which usernames exist.

#### `GET /auth/me` 🔒

`200`: `{ "id": "...", "username": "ivifer", "role": "player" }`. Errors: `401`.

### Progress

One progress entry per user and `gameId` (brief, section 5.2).

```json
{
  "gameId": "hexa-fit",
  "bestScore": null,
  "levels": {
    "fit-001": { "completed": true, "stars": 3, "bestScore": 120 },
    "fit-002": { "completed": false, "stars": 0, "bestScore": 0 }
  },
  "updatedAt": "2026-11-04T18:00:00.000Z"
}
```

- Best-score variants use `bestScore` (integer ≥ 0) and leave `levels` empty.
- Level variants use `levels`, keyed by level id; `bestScore` is `null`. `stars` (0–3) is used by variants with stars
  (Hexa Fit) and stays `0` otherwise.

#### `GET /progress` 🔒

`200`: `{ "items": [ <progress>, ... ] }`, one item per variant the user has played. Errors: `401`.

#### `GET /progress/{gameId}` 🔒

`200`: the progress. A variant never played returns an empty progress (`bestScore` `0` or `null`, `levels` `{}`),
not `404`. Errors: `401`, `404` (unknown `gameId`).

#### `PUT /progress/{gameId}` 🔒

Body: the progress without `gameId` and `updatedAt`. The server **merges** it with the stored one and keeps the best
value of every field, so syncing from an offline device never loses a record:

- `bestScore` = max of both.
- Per level: `completed` = either is true; `stars` = max; `bestScore` = max.
- Levels missing from the body are kept.

`200`: the merged progress. Errors: `400` (invalid values or a level id that does not belong to `gameId`), `401`, `404`.

### Scores and leaderboard

The leaderboard keeps **one entry per user**: their best score. A higher score is better; each variant's scoring
policy produces the number. Ties are ranked by who reached the score first.

#### `POST /scores` 🔒

```json
{ "gameId": "hexa-fit", "levelId": "fit-001", "score": 120 }
```

- `levelId` is required for level variants and must be absent for best-score variants.
- `score`: integer ≥ 0.

`201`: `{ "gameId": "hexa-fit", "levelId": "fit-001", "score": 120, "personalBest": true }`.
`personalBest` says whether the leaderboard entry changed. Errors: `400`, `401`, `404`.

#### `GET /leaderboard/{gameId}?levelId=&limit=`

- `levelId`: required for level variants (leaderboard per level), absent otherwise.
- `limit`: 1–100, default 10.

`200`:

```json
{
  "gameId": "hexa-fit",
  "levelId": "fit-001",
  "entries": [
    { "rank": 1, "username": "ivifer", "score": 120, "achievedAt": "2026-11-04T18:00:00.000Z" }
  ]
}
```

Errors: `400`, `404`.

### Levels

Levels follow the [level format](level-format.md). Reading is public, so the app can load levels before login;
writing is admin only. The write routes check the current stored role; a deleted account receives `401`,
and a current non-admin receives `403`, regardless of the token's role claim. Before a valid write,
the API checks for the required unique `{ gameId: 1, order: 1 }` index. If readiness cannot be verified it
returns a generic `500` without writing. Public reads do not check or provision this index.

#### `GET /levels?gameId=`

`200`: `{ "items": [ <level>, ... ] }` ordered by `order`; a supported game with no stored levels returns
`{ "items": [] }`. A missing, malformed, or repeated `gameId` yields `400`; an unknown game or a game that
does not support levels yields `404`.

#### `GET /levels/{id}`

`200`: the level. A malformed or non-existent level ID yields `404`.

#### `POST /levels` 🔑

Body: a level. `201`: the stored level. Errors: `400` (invalid format), `401`, `403`, `409` (duplicate ID or occupied order), `500` (write readiness unavailable).

#### `PUT /levels/{id}` 🔑

Body: the full level; its `id` must equal the path `id`. `200`: the stored level. Errors: `400`, `401`, `403`, `404`, `409` (occupied order), `500` (write readiness unavailable).

#### `DELETE /levels/{id}` 🔑

`204` with no body. Errors: `401`, `403`, `404` (unknown or malformed ID), `500` (write readiness unavailable).
