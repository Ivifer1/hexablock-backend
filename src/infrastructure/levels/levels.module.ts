import { Module } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { RolesGuard } from '../../adapters/http/auth/roles.guard.js';
import { AdminLevelsController } from '../../adapters/http/levels/admin-levels.controller.js';
import { LevelRequestMapper } from '../../adapters/http/levels/level-request.mapper.js';
import { MongoLevelWriteReadiness } from '../../adapters/persistence/mongo/mongo-level-write-readiness.js';
import type { ILevelWriteReadiness } from '../../application/ports/level-write-readiness.js';
import { CreateLevelUseCase } from '../../application/use-cases/create-level.use-case.js';
import { ReplaceLevelUseCase } from '../../application/use-cases/replace-level.use-case.js';
import { DeleteLevelUseCase } from '../../application/use-cases/delete-level.use-case.js';
import { AuthModule } from '../auth/auth.module.js';
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
const LEVEL_WRITE_READINESS = Symbol('ILevelWriteReadiness');
const readSchema = LevelSchema.clone();
readSchema.set('autoCreate', false);
readSchema.set('autoIndex', false);

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: LEVEL_MODEL, schema: readSchema }]),
  ],
  controllers: [LevelsController, AdminLevelsController],
  providers: [
    RolesGuard,
    {
      provide: LEVEL_WRITE_READINESS,
      useFactory: (model: Model<LevelDocument>) =>
        new MongoLevelWriteReadiness(model),
      inject: [getModelToken(LEVEL_MODEL)],
    },
    {
      provide: CreateLevelUseCase,
      useFactory: (levels: ILevelRepository, readiness: ILevelWriteReadiness) =>
        new CreateLevelUseCase(levels, readiness),
      inject: [LEVEL_REPOSITORY, LEVEL_WRITE_READINESS],
    },
    {
      provide: ReplaceLevelUseCase,
      useFactory: (levels: ILevelRepository, readiness: ILevelWriteReadiness) =>
        new ReplaceLevelUseCase(levels, readiness),
      inject: [LEVEL_REPOSITORY, LEVEL_WRITE_READINESS],
    },
    {
      provide: DeleteLevelUseCase,
      useFactory: (levels: ILevelRepository, readiness: ILevelWriteReadiness) =>
        new DeleteLevelUseCase(levels, readiness),
      inject: [LEVEL_REPOSITORY, LEVEL_WRITE_READINESS],
    },
    {
      provide: LevelRequestMapper,
      useFactory: (validator: LevelValidator) =>
        new LevelRequestMapper(validator, createLevelSectionBindings()),
      inject: [LevelValidator],
    },
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
