import { Module } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { ProgressRequestMapper } from '../../adapters/http/progress/progress-request.mapper.js';
import { ProgressController } from '../../adapters/http/progress/progress.controller.js';
import { MongoProgressRepository } from '../../adapters/persistence/mongo/mongo-progress.repository.js';
import {
  PROGRESS_COLLECTION,
  PROGRESS_MODEL,
  ProgressSchema,
  type ProgressDocument,
} from '../../adapters/persistence/mongo/progress.schema.js';
import type { IClock } from '../../application/ports/clock.js';
import type { IProgressRepository } from '../../application/ports/progress-repository.js';
import { GameProgressCatalog } from '../../application/progress/game-progress-catalog.js';
import {
  BestScoreProgressModel,
  LevelProgressModel,
} from '../../application/progress/progress-model.js';
import { ListPlayerProgressUseCase } from '../../application/use-cases/list-player-progress.use-case.js';
import { GetGameProgressUseCase } from '../../application/use-cases/get-game-progress.use-case.js';
import { SyncPlayerProgressUseCase } from '../../application/use-cases/sync-player-progress.use-case.js';
import { GameId } from '../../domain/game/game-id.js';
import { Count } from '../../domain/shared/count.js';
import { AuthModule } from '../auth/auth.module.js';
import { CLOCK } from '../tokens.js';

export const PROGRESS_REPOSITORY = Symbol('IProgressRepository');

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: PROGRESS_MODEL, schema: ProgressSchema },
    ]),
  ],
  controllers: [ProgressController],
  providers: [
    ProgressRequestMapper,
    {
      provide: GameProgressCatalog,
      useFactory: () => {
        const score = new BestScoreProgressModel();
        return new GameProgressCatalog([
          { game: GameId.of('hexa-lines'), model: score },
          { game: GameId.of('hexa-merge'), model: score },
          {
            game: GameId.of('hexa-fit'),
            model: new LevelProgressModel(Count.of(3)),
          },
          {
            game: GameId.of('hexa-sort'),
            model: new LevelProgressModel(Count.of(0)),
          },
        ]);
      },
    },
    {
      provide: ListPlayerProgressUseCase,
      useFactory: (progress: IProgressRepository) =>
        new ListPlayerProgressUseCase(progress),
      inject: [PROGRESS_REPOSITORY],
    },
    {
      provide: GetGameProgressUseCase,
      useFactory: (
        progress: IProgressRepository,
        catalog: GameProgressCatalog,
      ) => new GetGameProgressUseCase(progress, catalog),
      inject: [PROGRESS_REPOSITORY, GameProgressCatalog],
    },
    {
      provide: SyncPlayerProgressUseCase,
      useFactory: (
        progress: IProgressRepository,
        catalog: GameProgressCatalog,
      ) => new SyncPlayerProgressUseCase(progress, catalog),
      inject: [PROGRESS_REPOSITORY, GameProgressCatalog],
    },
    {
      provide: PROGRESS_REPOSITORY,
      useFactory: (
        model: Model<ProgressDocument>,
        clock: IClock,
      ): IProgressRepository =>
        new MongoProgressRepository(
          model.db
            .getClient()
            .db(model.db.name)
            .collection<ProgressDocument>(PROGRESS_COLLECTION),
          clock,
        ),
      inject: [getModelToken(PROGRESS_MODEL), CLOCK],
    },
  ],
  exports: [PROGRESS_REPOSITORY],
})
export class ProgressModule {}
