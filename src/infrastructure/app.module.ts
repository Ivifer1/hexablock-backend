import { Module } from '@nestjs/common';
import { HealthController } from '../adapters/http/health.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { DatabaseModule } from './database/database.module.js';
import { LevelsModule } from './levels/levels.module.js';
import { ProgressModule } from './progress/progress.module.js';
import { ScoresModule } from './scores/scores.module.js';
import { LeaderboardModule } from './leaderboard/leaderboard.module.js';

// Composition root: wires adapters and use cases together.
@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    LevelsModule,
    ProgressModule,
    ScoresModule,
    LeaderboardModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
