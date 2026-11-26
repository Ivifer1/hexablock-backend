import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../../application/ports/token-issuer.js';
import {
  GameCatalog,
  type IGameProgressCatalog,
} from '../../../application/game-catalog.js';
import { ProgressInputError } from '../../../application/progress/progress-model.js';
import { GetGameProgressUseCase } from '../../../application/use-cases/get-game-progress.use-case.js';
import { ListPlayerProgressUseCase } from '../../../application/use-cases/list-player-progress.use-case.js';
import { SyncPlayerProgressUseCase } from '../../../application/use-cases/sync-player-progress.use-case.js';
import { UserId } from '../../../domain/user/user-id.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ApiHttpError, jwtSchemeName, schemaRef } from '../openapi.schemas.js';
import { RequestValidationError } from '../request-validation.error.js';
import { ProgressRequestMapper } from './progress-request.mapper.js';
import {
  toProgressResponse,
  type ProgressResponse,
} from './progress-response.mapper.js';

const gameParameter = { name: 'gameId', type: String, required: true };

@ApiTags('Progress')
@ApiBearerAuth(jwtSchemeName)
@ApiHttpError(401, 'Missing, invalid or expired token.')
@ApiHttpError(500, 'Unexpected server error or unconfirmed save.')
@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(
    @Inject(ListPlayerProgressUseCase)
    private readonly listProgress: ListPlayerProgressUseCase,
    @Inject(GetGameProgressUseCase)
    private readonly getProgress: GetGameProgressUseCase,
    @Inject(SyncPlayerProgressUseCase)
    private readonly syncProgress: SyncPlayerProgressUseCase,
    @Inject(ProgressRequestMapper)
    private readonly input: ProgressRequestMapper,
    @Inject(GameCatalog)
    private readonly catalog: IGameProgressCatalog,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Read all saved progress for the signed-in player' })
  @ApiOkResponse({
    description: 'Saved progress by game.',
    schema: schemaRef('ProgressList'),
  })
  async list(
    @CurrentUser() user: AuthUser,
  ): Promise<{ items: ProgressResponse[] }> {
    return {
      items: (await this.listProgress.execute(UserId.of(user.id))).map(
        toProgressResponse,
      ),
    };
  }

  @Get(':gameId')
  @ApiOperation({ summary: 'Read progress for one game' })
  @ApiParam(gameParameter)
  @ApiHttpError(404, 'Invalid or unknown game ID.')
  @ApiOkResponse({
    description: 'Saved progress or empty defaults.',
    schema: schemaRef('Progress'),
  })
  async get(
    @CurrentUser() user: AuthUser,
    @Param('gameId') rawGame: string,
  ): Promise<ProgressResponse> {
    const game = this.input.toGameId(rawGame);
    return toProgressResponse(
      await this.getProgress.execute(UserId.of(user.id), game),
    );
  }

  @Put(':gameId')
  @ApiOperation({ summary: 'Retain the best progress for one game' })
  @ApiParam(gameParameter)
  @ApiBody({ required: true, schema: schemaRef('ProgressInput') })
  @ApiHttpError(
    400,
    'Malformed JSON, invalid progress or a level outside this game.',
  )
  @ApiHttpError(404, 'Invalid or unknown game ID.')
  @ApiHttpError(413, 'Request body too large.')
  @ApiOkResponse({
    description: 'Confirmed retained progress.',
    schema: schemaRef('SavedProgress'),
  })
  async sync(
    @CurrentUser() user: AuthUser,
    @Param('gameId') rawGame: string,
    @Body() body: unknown,
  ): Promise<ProgressResponse> {
    const gameId = this.input.toGameId(rawGame);
    this.catalog.modelFor(gameId);
    const draft = this.input.toDraft(body);
    try {
      return toProgressResponse(
        await this.syncProgress.execute({
          userId: UserId.of(user.id),
          gameId,
          ...draft,
        }),
      );
    } catch (error) {
      if (error instanceof ProgressInputError) {
        throw new RequestValidationError([
          { field: error.field, message: error.message },
        ]);
      }
      throw error;
    }
  }
}
