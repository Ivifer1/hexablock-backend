import { Module } from '@nestjs/common';
import { HealthController } from '../adapters/http/health.controller.js';

// Composition root: wires adapters and use cases together.
@Module({
  imports: [],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
