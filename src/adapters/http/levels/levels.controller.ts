import { Controller, Get, Inject, Param } from '@nestjs/common';
import { GetLevelUseCase } from '../../../application/use-cases/get-level.use-case.js';
import { LevelId } from '../../../domain/level/level-id.js';
import { DomainError } from '../../../domain/shared/domain-error.js';
import { ErrorCode } from '../../../domain/shared/error-code.js';
import {
  type LevelResponse,
  LevelResponseMapper,
} from './level-response.mapper.js';

@Controller('levels')
export class LevelsController {
  constructor(
    @Inject(GetLevelUseCase) private readonly getLevel: GetLevelUseCase,
    @Inject(LevelResponseMapper) private readonly mapper: LevelResponseMapper,
  ) {}

  @Get(':id')
  async get(@Param('id') rawId: string): Promise<LevelResponse> {
    const level = await this.getLevel.execute(parseLevelId(rawId));
    return this.mapper.toResponse(level);
  }
}

function parseLevelId(raw: string): LevelId {
  try {
    return LevelId.of(raw);
  } catch (error) {
    if (
      error instanceof DomainError &&
      error.code === ErrorCode.InvalidLevelId
    ) {
      throw new DomainError(ErrorCode.LevelNotFound);
    }
    throw error;
  }
}
