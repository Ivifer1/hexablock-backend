import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

// Local development reads settings from .env (see .env.example); in CI and
// production they come from the real environment.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
