import { Module } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { LeaderboardController } from '../../adapters/http/leaderboard/leaderboard.controller.js';
import { LeaderboardRequestMapper } from '../../adapters/http/leaderboard/leaderboard-request.mapper.js';
import { MongoLeaderboardQuery } from '../../adapters/persistence/mongo/mongo-leaderboard-query.js';
import { GetLeaderboardUseCase } from '../../application/use-cases/get-leaderboard.use-case.js';
import { QueryLeaderboardUseCase } from '../../application/use-cases/query-leaderboard.use-case.js';
import { GameCatalog } from '../../application/game-catalog.js';
import type { ILevelRepository } from '../../application/ports/level-repository.js';
import { AuthModule } from '../auth/auth.module.js';
import { LevelsModule, LEVEL_REPOSITORY } from '../levels/levels.module.js';
import { ProgressModule } from '../progress/progress.module.js';

@Module({
  imports: [AuthModule, LevelsModule, ProgressModule],
  controllers: [LeaderboardController],
  providers: [
    LeaderboardRequestMapper,
    {
      provide: QueryLeaderboardUseCase,
      useFactory: (
        catalog: GameCatalog,
        levels: ILevelRepository,
        connection: Connection,
      ) =>
        new QueryLeaderboardUseCase(
          catalog,
          levels,
          new GetLeaderboardUseCase(
            new MongoLeaderboardQuery(
              connection.getClient().db(connection.name),
            ),
          ),
        ),
      inject: [GameCatalog, LEVEL_REPOSITORY, getConnectionToken()],
    },
  ],
})
export class LeaderboardModule {}
