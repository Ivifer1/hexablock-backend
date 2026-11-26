import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  QueryLeaderboardUseCase,
  LeaderboardScopeError,
} from '../../../application/use-cases/query-leaderboard.use-case.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ApiHttpError, jwtSchemeName } from '../openapi.schemas.js';
import { RequestValidationError } from '../request-validation.error.js';
import { LeaderboardRequestMapper } from './leaderboard-request.mapper.js';

const properties = {
  gameId: { type: 'string' },
  entries: {
    type: 'array',
    maxItems: 100,
    items: {
      type: 'object',
      additionalProperties: false,
      required: ['rank', 'username', 'score', 'achievedAt'],
      properties: {
        rank: { type: 'integer', minimum: 1 },
        username: { type: 'string' },
        score: { type: 'integer', minimum: 0 },
        achievedAt: { type: 'string', format: 'date-time' },
      },
    },
  },
};

@ApiTags('Leaderboard')
@ApiBearerAuth(jwtSchemeName)
@ApiHttpError(400, 'Invalid query, identifier or level scope.')
@ApiHttpError(401, 'Missing, invalid or expired token.')
@ApiHttpError(404, 'Unknown game.')
@ApiHttpError(500, 'Ranking cannot be read.')
@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(
    @Inject(QueryLeaderboardUseCase)
    private readonly ranking: QueryLeaderboardUseCase,
    @Inject(LeaderboardRequestMapper)
    private readonly input: LeaderboardRequestMapper,
  ) {}

  @Get(':gameId')
  @ApiOperation({ summary: 'Read the highest personal bests for one ranking' })
  @ApiParam({
    name: 'gameId',
    required: true,
    schema: { type: 'string', pattern: '^[a-z0-9-]+$' },
  })
  @ApiQuery({
    name: 'levelId',
    required: false,
    type: String,
    description: 'Required only for level-based rankings.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
  })
  @ApiOkResponse({
    description: 'Ordered personal bests with shared competition ranks.',
    schema: {
      oneOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['gameId', 'entries'],
          properties,
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['gameId', 'levelId', 'entries'],
          properties: { ...properties, levelId: { type: 'string' } },
        },
      ],
    },
  })
  async get(
    @Param('gameId') game: string,
    @Query() query: Record<string, unknown>,
  ) {
    try {
      const result = await this.ranking.execute(
        this.input.toInput(game, query),
      );
      return {
        gameId: result.scope.gameId.toString(),
        ...(result.scope.levelId.isPresent()
          ? { levelId: result.scope.levelId.get().toString() }
          : {}),
        entries: result.entries.map((entry) => ({
          rank: entry.rank.toNumber(),
          username: entry.username.toString(),
          score: entry.score.toNumber(),
          achievedAt: entry.achievedAt.toDate().toISOString(),
        })),
      };
    } catch (error) {
      if (error instanceof LeaderboardScopeError)
        throw new RequestValidationError([
          { field: 'levelId', message: error.message },
        ]);
      throw error;
    }
  }
}
