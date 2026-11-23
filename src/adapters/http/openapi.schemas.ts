import type { SchemaObject } from '@nestjs/swagger';

type Model = 'Health';

export const jwtSchemeName = 'bearer';

export function schemaRef(model: Model): { $ref: string } {
  return { $ref: `#/components/schemas/${model}` };
}

// These describe the existing wire contract. Request parsing and validation
// remain the responsibility of the existing HTTP adapters and value objects.
export const apiSchemas: Record<Model, SchemaObject> = {
  Health: {
    type: 'object',
    required: ['status'],
    properties: { status: { type: 'string', enum: ['ok'] } },
  },
};
