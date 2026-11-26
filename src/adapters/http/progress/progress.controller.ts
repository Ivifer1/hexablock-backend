import {
  Controller,
  Get,
  Inject,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../../application/ports/token-issuer.js';
import { GetGameProgressUseCase } from '../../../application/use-cases/get-game-progress.use-case.js';
import { ListPlayerProgressUseCase } from '../../../application/use-cases/list-player-progress.use-case.js';
import { UserId } from '../../../domain/user/user-id.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ApiHttpError, jwtSchemeName, schemaRef } from '../openapi.schemas.js';
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
    @Inject(ProgressRequestMapper)
    private readonly input: ProgressRequestMapper,
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

}
