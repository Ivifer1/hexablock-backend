import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  apiSchemas,
  jwtSchemeName,
} from '../../adapters/http/openapi.schemas.js';

export function configureOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('HexaBlock Suite API')
    .setDescription(
      'HTTP contract for the operations implemented in this backend.',
    )
    .setVersion('1')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      jwtSchemeName,
    )
    .build();

  SwaggerModule.setup(
    'docs',
    app,
    () =>
      SwaggerModule.createDocument(app, {
        ...config,
        components: { ...config.components, schemas: apiSchemas },
      }),
    {
      jsonDocumentUrl: '/docs-json',
      raw: ['json'],
      swaggerOptions: { persistAuthorization: false },
    },
  );
}
