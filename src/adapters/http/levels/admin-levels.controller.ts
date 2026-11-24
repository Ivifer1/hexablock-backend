import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateLevelUseCase } from '../../../application/use-cases/create-level.use-case.js';
import { DeleteLevelUseCase } from '../../../application/use-cases/delete-level.use-case.js';
import { ReplaceLevelUseCase } from '../../../application/use-cases/replace-level.use-case.js';
import { LevelId } from '../../../domain/level/level-id.js';
import { DomainError } from '../../../domain/shared/domain-error.js';
import { ErrorCode } from '../../../domain/shared/error-code.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { ApiHttpError, jwtSchemeName, schemaRef } from '../openapi.schemas.js';
import { RequestValidationError } from '../request-validation.error.js';
import { LevelRequestMapper } from './level-request.mapper.js';
import {
  type LevelResponse,
  LevelResponseMapper,
} from './level-response.mapper.js';
import { levelExamples } from './level.openapi-examples.js';

const levelJson = { schema: schemaRef('Level'), examples: levelExamples };
const levelIdParameter = {
  name: 'id',
  required: true,
  type: String,
  example: 'fit-003',
};

@ApiTags('Levels')
@ApiBearerAuth(jwtSchemeName)
@ApiHttpError(401, 'Missing, invalid or expired token, or no current account.')
@ApiHttpError(403, 'The current stored role must be admin.')
@ApiHttpError(500, 'Unexpected server error.')
@Controller('levels')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminLevelsController {
  constructor(
    @Inject(CreateLevelUseCase)
    private readonly createLevel: CreateLevelUseCase,
    @Inject(ReplaceLevelUseCase)
    private readonly replaceLevel: ReplaceLevelUseCase,
    @Inject(DeleteLevelUseCase)
    private readonly deleteLevel: DeleteLevelUseCase,
    @Inject(LevelRequestMapper) private readonly input: LevelRequestMapper,
    @Inject(LevelResponseMapper) private readonly output: LevelResponseMapper,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a level as an administrator' })
  @ApiBody({ required: true, ...levelJson })
  @ApiCreatedResponse({
    description: 'Level created.',
    content: { 'application/json': levelJson },
  })
  @ApiHttpError(400, 'Malformed JSON or invalid level definition.')
  @ApiHttpError(409, 'Level ID already exists or game order is occupied.')
  @ApiHttpError(413, 'Request body too large.')
  async create(@Body() body: unknown): Promise<LevelResponse> {
    const created = await this.createLevel.execute(this.input.toLevel(body));
    return this.output.toResponse(created);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace a level as an administrator' })
  @ApiParam(levelIdParameter)
  @ApiBody({ required: true, ...levelJson })
  @ApiOkResponse({
    description: 'Level replaced.',
    content: { 'application/json': levelJson },
  })
  @ApiHttpError(
    400,
    'Malformed JSON, invalid level definition or path ID, or mismatched body and path IDs.',
  )
  @ApiHttpError(404, 'Unknown level ID.')
  @ApiHttpError(409, 'Game order is occupied.')
  @ApiHttpError(413, 'Request body too large.')
  async replace(
    @Param('id') rawId: string,
    @Body() body: unknown,
  ): Promise<LevelResponse> {
    const id = parseWriteId(rawId, false);
    const level = this.input.toLevel(body);
    if (!id.equals(level.id)) {
      throw new RequestValidationError([
        { field: 'id', message: 'Body and path level IDs must match' },
      ]);
    }
    return this.output.toResponse(await this.replaceLevel.execute(level));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a level as an administrator' })
  @ApiParam(levelIdParameter)
  @ApiNoContentResponse({ description: 'Level deleted.' })
  @ApiHttpError(404, 'Invalid or unknown level ID.')
  async remove(@Param('id') rawId: string): Promise<void> {
    await this.deleteLevel.execute(parseWriteId(rawId, true));
  }
}

function parseWriteId(rawId: string, notFoundOnInvalid: boolean): LevelId {
  try {
    return LevelId.of(rawId);
  } catch (error) {
    if (
      !(error instanceof DomainError) ||
      error.code !== ErrorCode.InvalidLevelId
    ) {
      throw error;
    }
    if (notFoundOnInvalid) throw new DomainError(ErrorCode.LevelNotFound);
    throw new RequestValidationError([
      { field: 'id', message: 'Invalid level ID' },
    ]);
  }
}
