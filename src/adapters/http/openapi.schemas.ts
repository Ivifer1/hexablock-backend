import { ApiResponse, type SchemaObject } from '@nestjs/swagger';

type Model =
  | 'Health'
  | 'Credentials'
  | 'AuthResult'
  | 'User'
  | 'Error'
  | 'BadRequest'
  | 'Level'
  | 'LevelList'
  | 'LevelProgressEntry'
  | 'ScoreProgressInput'
  | 'LevelProgressInput'
  | 'ProgressInput'
  | 'Progress'
  | 'SavedProgress'
  | 'ProgressList'
  | 'ScoreInput'
  | 'ScoreResponse';

export const jwtSchemeName = 'bearer';

export function schemaRef(model: Model): { $ref: string } {
  return { $ref: `#/components/schemas/${model}` };
}

export function ApiHttpError(
  status: number,
  description: string,
): MethodDecorator & ClassDecorator {
  return ApiResponse({
    status,
    description,
    schema: schemaRef(status === 400 ? 'BadRequest' : 'Error'),
  });
}

const error: SchemaObject = {
  type: 'object',
  required: ['statusCode', 'error', 'message', 'path', 'timestamp'],
  properties: {
    statusCode: { type: 'integer' },
    error: { type: 'string' },
    message: { type: 'string' },
    path: {
      type: 'string',
      description: 'Request path without its query string.',
    },
    timestamp: { type: 'string', format: 'date-time' },
  },
};

const safeScore: SchemaObject = {
  type: 'integer',
  minimum: 0,
  maximum: Number.MAX_SAFE_INTEGER,
};
const noBestScore: SchemaObject = {
  type: 'integer',
  nullable: true,
  enum: [null],
};
const noLevels: SchemaObject = {
  type: 'object',
  maxProperties: 0,
  additionalProperties: false,
};
const levelProgressMap: SchemaObject = {
  type: 'object',
  additionalProperties: schemaRef('LevelProgressEntry'),
};
const scoreInput: SchemaObject = {
  type: 'object',
  required: ['bestScore', 'levels'],
  additionalProperties: false,
  properties: { bestScore: safeScore, levels: noLevels },
};
const scoreSubmission: SchemaObject = {
  type: 'object',
  required: ['gameId', 'score'],
  additionalProperties: false,
  properties: {
    gameId: { type: 'string', example: 'hexa-lines' },
    levelId: {
      type: 'string',
      description: 'Required only for games ranked by level.',
      example: 'fit-003',
    },
    score: {
      ...safeScore,
      description: 'The score from this single finished attempt.',
    },
  },
};
const scoreResponse: SchemaObject = {
  oneOf: [
    {
      type: 'object',
      required: ['gameId', 'score', 'personalBest'],
      additionalProperties: false,
      properties: {
        gameId: { type: 'string' },
        score: safeScore,
        personalBest: { type: 'boolean' },
      },
    },
    {
      type: 'object',
      required: ['gameId', 'levelId', 'score', 'personalBest'],
      additionalProperties: false,
      properties: {
        gameId: { type: 'string' },
        levelId: { type: 'string' },
        score: safeScore,
        personalBest: { type: 'boolean' },
      },
    },
  ],
};
const levelInput: SchemaObject = {
  ...scoreInput,
  properties: { bestScore: noBestScore, levels: levelProgressMap },
};
const savedAt: SchemaObject = { type: 'string', format: 'date-time' };

function progressResponse(updatedAt: SchemaObject): SchemaObject {
  return {
    type: 'object',
    required: ['gameId', 'bestScore', 'levels', 'updatedAt'],
    properties: {
      gameId: { type: 'string' },
      bestScore: { ...safeScore, nullable: true },
      levels: levelProgressMap,
      updatedAt,
    },
    oneOf: [
      { properties: scoreInput.properties },
      { properties: levelInput.properties },
    ],
  };
}

// These describe the existing wire contract. Request parsing and validation
// remain the responsibility of the existing HTTP adapters and value objects.
export const apiSchemas: Record<Model, SchemaObject> = {
  Health: {
    type: 'object',
    required: ['status'],
    properties: { status: { type: 'string', enum: ['ok'] } },
  },
  Credentials: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: {
        type: 'string',
        pattern: '^[a-z0-9_]{3,20}$',
        example: 'puzzle_player',
      },
      password: {
        type: 'string',
        format: 'password',
        description:
          'At least 8 user-perceived characters (grapheme clusters).',
      },
    },
  },
  AuthResult: {
    type: 'object',
    required: ['user', 'accessToken', 'expiresIn'],
    properties: {
      user: schemaRef('User'),
      accessToken: { type: 'string', description: 'Bearer JWT.' },
      expiresIn: { type: 'integer', description: 'Token lifetime in seconds.' },
    },
  },
  User: {
    type: 'object',
    required: ['id', 'username', 'role'],
    properties: {
      id: { type: 'string' },
      username: { type: 'string' },
      role: { type: 'string', enum: ['player', 'admin'] },
    },
  },
  Error: error,
  BadRequest: {
    ...error,
    properties: {
      ...error.properties,
      details: {
        type: 'array',
        description:
          'Present for field validation; omitted for malformed JSON.',
        items: {
          type: 'object',
          required: ['field', 'message'],
          properties: {
            field: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  },
  Level: {
    type: 'object',
    description:
      'Common level fields plus one object named by the registered game section.',
    required: ['schemaVersion', 'id', 'gameId', 'order', 'name', 'board'],
    additionalProperties: { type: 'object' },
    properties: {
      schemaVersion: { type: 'integer' },
      id: { type: 'string' },
      gameId: { type: 'string' },
      order: { type: 'integer' },
      name: {
        type: 'object',
        required: ['es', 'en'],
        properties: { es: { type: 'string' }, en: { type: 'string' } },
      },
      board: {
        type: 'object',
        required: ['topology', 'cells'],
        properties: {
          topology: { type: 'string' },
          cells: {
            type: 'array',
            items: { type: 'array', items: { type: 'integer' } },
          },
        },
      },
    },
  },
  LevelProgressEntry: {
    type: 'object',
    required: ['completed', 'stars', 'bestScore'],
    additionalProperties: false,
    properties: {
      completed: { type: 'boolean' },
      stars: {
        type: 'integer',
        minimum: 0,
        maximum: 3,
        description: 'Zero if the game does not award stars.',
      },
      bestScore: safeScore,
    },
  },
  ScoreProgressInput: scoreInput,
  LevelProgressInput: levelInput,
  ProgressInput: {
    oneOf: [schemaRef('ScoreProgressInput'), schemaRef('LevelProgressInput')],
  },
  Progress: progressResponse({
    ...savedAt,
    nullable: true,
    description: 'Null when no progress has been saved.',
  }),
  SavedProgress: progressResponse(savedAt),
  ProgressList: {
    type: 'object',
    required: ['items'],
    properties: { items: { type: 'array', items: schemaRef('SavedProgress') } },
  },
  LevelList: {
    type: 'object',
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        description:
          'Levels ordered by ascending order; empty when the game has no levels.',
        items: schemaRef('Level'),
      },
    },
  },
  ScoreInput: scoreSubmission,
  ScoreResponse: scoreResponse,
};
