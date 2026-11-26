import { Module } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { ScoresController } from '../../adapters/http/scores/scores.controller.js';
import { ScoreRequestMapper } from '../../adapters/http/scores/score-request.mapper.js';
import { ScoreResponseMapper } from '../../adapters/http/scores/score-response.mapper.js';
import { MongoPersonalBestRepository } from '../../adapters/persistence/mongo/mongo-personal-best.repository.js';
import {
  PERSONAL_BEST_COLLECTION,
  PERSONAL_BEST_MODEL,
  PersonalBestSchema,
  type PersonalBestDocument,
} from '../../adapters/persistence/mongo/personal-best.schema.js';
import type { IClock } from '../../application/ports/clock.js';
import type { IPersonalBestRepository } from '../../application/ports/personal-best-repository.js';
import type { ILevelRepository } from '../../application/ports/level-repository.js';
import { GameCatalog, type IGameRankingCatalog } from '../../application/game-catalog.js';
import { SubmitScoreUseCase } from '../../application/use-cases/submit-score.use-case.js';
import { AuthModule } from '../auth/auth.module.js';
import { LevelsModule, LEVEL_REPOSITORY } from '../levels/levels.module.js';
import { ProgressModule } from '../progress/progress.module.js';
import { CLOCK } from '../tokens.js';

export const PERSONAL_BEST_REPOSITORY = Symbol('IPersonalBestRepository');

@Module({
  imports: [
    AuthModule,
    LevelsModule,
    ProgressModule,
    MongooseModule.forFeature([
      { name: PERSONAL_BEST_MODEL, schema: PersonalBestSchema },
    ]),
  ],
  controllers: [ScoresController],
  providers: [
    ScoreRequestMapper,
    ScoreResponseMapper,
    {
      provide: SubmitScoreUseCase,
      useFactory: (
        catalog: IGameRankingCatalog,
        levels: ILevelRepository,
        records: IPersonalBestRepository,
      ) => new SubmitScoreUseCase(catalog, levels, records),
      inject: [GameCatalog, LEVEL_REPOSITORY, PERSONAL_BEST_REPOSITORY],
    },
    {
      provide: PERSONAL_BEST_REPOSITORY,
      useFactory: (
        model: Model<PersonalBestDocument>,
        clock: IClock,
      ): IPersonalBestRepository =>
        new MongoPersonalBestRepository(
          model.db
            .getClient()
            .db(model.db.name)
            .collection<PersonalBestDocument>(PERSONAL_BEST_COLLECTION),
          clock,
        ),
      inject: [getModelToken(PERSONAL_BEST_MODEL), CLOCK],
    },
  ],
})
export class ScoresModule {}
