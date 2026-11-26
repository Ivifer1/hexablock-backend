import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../../application/ports/token-issuer.js';
import { ListPlayerProgressUseCase } from '../../../application/use-cases/list-player-progress.use-case.js';
import { UserId } from '../../../domain/user/user-id.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ApiHttpError, jwtSchemeName, schemaRef } from '../openapi.schemas.js';
import {
  toProgressResponse,
  type ProgressResponse,
} from './progress-response.mapper.js';

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
}
