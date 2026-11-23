import { ApiResponse, type SchemaObject } from '@nestjs/swagger';

type Model =
  | 'Health'
  | 'Credentials'
  | 'AuthResult'
  | 'User'
  | 'Error'
  | 'BadRequest'
  | 'Level'
  | 'LevelList';

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
};
