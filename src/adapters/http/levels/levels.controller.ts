import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiHttpError, schemaRef } from '../openapi.schemas.js';
import { levelExamples } from './level.openapi-examples.js';
import { GetLevelUseCase } from '../../../application/use-cases/get-level.use-case.js';
import { ListLevelsUseCase } from '../../../application/use-cases/list-levels.use-case.js';
import { GameId } from '../../../domain/game/game-id.js';
import { LevelId } from '../../../domain/level/level-id.js';
import { DomainError } from '../../../domain/shared/domain-error.js';
import { ErrorCode } from '../../../domain/shared/error-code.js';
import { RequestValidationError } from '../request-validation.error.js';
import {
  type LevelResponse,
  LevelResponseMapper,
} from './level-response.mapper.js';

@ApiTags('Levels')
@ApiHttpError(500, 'Unexpected server error.')
@Controller('levels')
export class LevelsController {
  constructor(
    @Inject(ListLevelsUseCase) private readonly listLevels: ListLevelsUseCase,
    @Inject(GetLevelUseCase) private readonly getLevel: GetLevelUseCase,
    @Inject(LevelResponseMapper) private readonly mapper: LevelResponseMapper,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List public levels for a game' })
  @ApiQuery({
    name: 'gameId',
    required: true,
    schema: { type: 'string', pattern: '^[a-z0-9-]+$' },
    example: 'hexa-fit',
  })
  @ApiOkResponse({
    description: 'Levels for the game.',
    schema: schemaRef('LevelList'),
  })
  @ApiHttpError(400, 'Missing or malformed gameId.')
  @ApiHttpError(404, 'Unknown game or game does not support levels.')
  async list(
    @Query('gameId') rawGameId: unknown,
  ): Promise<{ items: LevelResponse[] }> {
    const levels = await this.listLevels.execute(parseGameId(rawGameId));
    return { items: levels.map((level) => this.mapper.toResponse(level)) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a public level by ID' })
  @ApiParam({ name: 'id', required: true, type: String, example: 'fit-003' })
  @ApiOkResponse({
    description: 'Level definition.',
    content: {
      'application/json': {
        schema: schemaRef('Level'),
        examples: levelExamples,
      },
    },
  })
  @ApiHttpError(404, 'Invalid or unknown level ID.')
  async get(@Param('id') rawId: string): Promise<LevelResponse> {
    const level = await this.getLevel.execute(parseLevelId(rawId));
    return this.mapper.toResponse(level);
  }
}

function parseGameId(raw: unknown): GameId {
  if (typeof raw === 'string') {
    try {
      return GameId.of(raw);
    } catch (error) {
      if (
        !(error instanceof DomainError) ||
        error.code !== ErrorCode.InvalidGameId
      ) {
        throw error;
      }
    }
  }
  throw new RequestValidationError([
    {
      field: 'gameId',
      message: 'Provide one game ID with lowercase letters, digits, or hyphens',
    },
  ]);
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
