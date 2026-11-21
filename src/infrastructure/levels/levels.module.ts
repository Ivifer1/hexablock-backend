import { Module } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { LevelResponseMapper } from '../../adapters/http/levels/level-response.mapper.js';
import { LevelsController } from '../../adapters/http/levels/levels.controller.js';
import {
  LEVEL_MODEL,
  type LevelDocument,
  LevelSchema,
} from '../../adapters/persistence/mongo/level.schema.js';
import type { ILevelRepository } from '../../application/ports/level-repository.js';
import { GetLevelUseCase } from '../../application/use-cases/get-level.use-case.js';
import { ListLevelsUseCase } from '../../application/use-cases/list-levels.use-case.js';
import { LevelValidator } from '../../domain/level/level-validator.js';
import {
  createLevelRepository,
  createLevelSectionBindings,
} from './create-level-repository.js';
import { createLevelValidator } from './create-level-validator.js';

const LEVEL_REPOSITORY = Symbol('ILevelRepository');
const readSchema = LevelSchema.clone();
readSchema.set('autoCreate', false);
readSchema.set('autoIndex', false);

@Module({
  imports: [
    MongooseModule.forFeature([{ name: LEVEL_MODEL, schema: readSchema }]),
  ],
  controllers: [LevelsController],
  providers: [
    { provide: LevelValidator, useFactory: createLevelValidator },
    {
      provide: LEVEL_REPOSITORY,
      useFactory: (model: Model<LevelDocument>, validator: LevelValidator) =>
        createLevelRepository(model, validator),
      inject: [getModelToken(LEVEL_MODEL), LevelValidator],
    },
    {
      provide: ListLevelsUseCase,
      useFactory: (repository: ILevelRepository, validator: LevelValidator) =>
        new ListLevelsUseCase(repository, validator),
      inject: [LEVEL_REPOSITORY, LevelValidator],
    },
    {
      provide: GetLevelUseCase,
      useFactory: (repository: ILevelRepository) =>
        new GetLevelUseCase(repository),
      inject: [LEVEL_REPOSITORY],
    },
    {
      provide: LevelResponseMapper,
      useFactory: () => new LevelResponseMapper(createLevelSectionBindings()),
    },
  ],
})
export class LevelsModule {}
