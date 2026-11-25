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
import type { IProgressRepository } from '../../application/ports/progress-repository.js';

export const PROGRESS_REPOSITORY = Symbol('IProgressRepository');

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PROGRESS_MODEL, schema: ProgressSchema },
    ]),
  ],
  providers: [
    {
      provide: PROGRESS_REPOSITORY,
      useFactory: (model: Model<ProgressDocument>): IProgressRepository =>
        new MongoProgressRepository(
          model.db
            .getClient()
            .db(model.db.name)
            .collection<ProgressDocument>(PROGRESS_COLLECTION),
        ),
      inject: [getModelToken(PROGRESS_MODEL)],
    },
  ],
  exports: [PROGRESS_REPOSITORY],
})
export class ProgressModule {}
