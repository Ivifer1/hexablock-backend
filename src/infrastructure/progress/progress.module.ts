import { Module } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { MongoProgressRepository } from '../../adapters/persistence/mongo/mongo-progress.repository.js';
import {
  PROGRESS_COLLECTION,
  PROGRESS_MODEL,
  ProgressSchema,
  type ProgressDocument,
} from '../../adapters/persistence/mongo/progress.schema.js';
import type { IClock } from '../../application/ports/clock.js';
import type { IProgressRepository } from '../../application/ports/progress-repository.js';
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
  providers: [
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
