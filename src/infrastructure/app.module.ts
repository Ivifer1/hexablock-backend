import { Module } from '@nestjs/common';
import { HealthController } from '../adapters/http/health.controller.js';
import { DatabaseModule } from './database/database.module.js';

// Composition root: wires adapters and use cases together.
@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
