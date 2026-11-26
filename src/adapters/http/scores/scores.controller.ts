import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../../application/ports/token-issuer.js';
import { SubmitScoreUseCase } from '../../../application/use-cases/submit-score.use-case.js';
import { ScoreInputError } from '../../../application/use-cases/score-input.error.js';
import { UserId } from '../../../domain/user/user-id.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ApiHttpError, jwtSchemeName, schemaRef } from '../openapi.schemas.js';
import { RequestValidationError } from '../request-validation.error.js';
import { ScoreRequestMapper } from './score-request.mapper.js';
import {
  ScoreResponseMapper,
  type ScoreResponse,
} from './score-response.mapper.js';

@ApiTags('Scores')
@ApiBearerAuth(jwtSchemeName)
@ApiHttpError(400, 'Malformed JSON, invalid score or level ranking.')
@ApiHttpError(401, 'Missing, invalid or expired token.')
@ApiHttpError(404, 'Unknown game.')
@ApiHttpError(413, 'Request body too large.')
@ApiHttpError(500, 'Unexpected server error or unconfirmed save.')
@Controller('scores')
@UseGuards(JwtAuthGuard)
export class ScoresController {
  constructor(
    @Inject(SubmitScoreUseCase)
    private readonly submitScore: SubmitScoreUseCase,
    @Inject(ScoreRequestMapper)
    private readonly input: ScoreRequestMapper,
    @Inject(ScoreResponseMapper)
    private readonly output: ScoreResponseMapper,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Submit an attempt and receive the retained best' })
  @ApiBody({ required: true, schema: schemaRef('ScoreInput') })
  @ApiCreatedResponse({
    description: 'The confirmed retained personal best.',
    schema: schemaRef('ScoreResponse'),
  })
  async submit(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
  ): Promise<ScoreResponse> {
    try {
      const input = this.input.toInput(body);
      const result = await this.submitScore.execute({
        playerId: UserId.of(user.id),
        ...input,
      });
      return this.output.toResponse(result);
    } catch (error) {
      if (error instanceof ScoreInputError) {
        throw new RequestValidationError([
          { field: error.field, message: error.message },
        ]);
      }
      throw error;
    }
  }
}
