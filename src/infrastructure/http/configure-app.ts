import { INestApplication } from '@nestjs/common';
import { HttpErrorFilter } from '../../adapters/http/http-error.filter.js';
import { IClock } from '../../application/ports/clock.js';
import { CLOCK } from '../tokens.js';
import { configureOpenApi } from './configure-openapi.js';

// HTTP settings shared by the real server (main.ts) and the e2e tests, so
// tests exercise the same prefix and error format as production.
export function configureApp(app: INestApplication): void {
  // Prefix business routes; keep the health check and optional docs unprefixed.
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.useGlobalFilters(
    new HttpErrorFilter(app.get<IClock>(CLOCK, { strict: false })),
  );
  if (process.env.SWAGGER_ENABLED === 'true') {
    configureOpenApi(app);
  }
}
