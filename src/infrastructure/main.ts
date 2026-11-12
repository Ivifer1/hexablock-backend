import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './http/configure-app.js';

// Local development reads settings from .env (see .env.example); in CI and
// production they come from the real environment.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
