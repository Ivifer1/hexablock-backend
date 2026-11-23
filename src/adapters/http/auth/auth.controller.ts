import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { IUseCase } from '../../../application/use-case.js';
import type {
  AuthResult,
  Credentials,
} from '../../../application/use-cases/auth.models.js';
import type { CurrentUserInput } from '../../../application/use-cases/get-current-user.use-case.js';
import type { User } from '../../../domain/user/user.js';
import { UserId } from '../../../domain/user/user-id.js';
import type { AuthUser } from '../../../application/ports/token-issuer.js';
import {
  AuthResponse,
  toAuthResponse,
  toUserResponse,
  UserResponse,
} from './auth.response.js';
import {
  GET_CURRENT_USER_USE_CASE,
  LOGIN_USE_CASE,
  REGISTER_USE_CASE,
} from './auth.tokens.js';
import { parseCredentials } from './credentials.request.js';
import { CurrentUser } from './current-user.decorator.js';
import { ApiHttpError, jwtSchemeName, schemaRef } from '../openapi.schemas.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

// Thin controller: parse the input, call one use case, map the result.
@ApiTags('Authentication')
@ApiHttpError(500, 'Unexpected server error.')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(REGISTER_USE_CASE)
    private readonly registerUser: IUseCase<Credentials, AuthResult>,
    @Inject(LOGIN_USE_CASE)
    private readonly loginUser: IUseCase<Credentials, AuthResult>,
    @Inject(GET_CURRENT_USER_USE_CASE)
    private readonly currentUser: IUseCase<CurrentUserInput, User>,
  ) {}

  // UC-001. POST answers 201 Created by default.
  @Post('register')
  @ApiOperation({ summary: 'Register a player and issue an access token' })
  @ApiBody({ required: true, schema: schemaRef('Credentials') })
  @ApiCreatedResponse({
    description: 'Player registered.',
    schema: schemaRef('AuthResult'),
  })
  @ApiHttpError(400, 'Invalid credentials payload or malformed JSON.')
  @ApiHttpError(409, 'Username already taken.')
  @ApiHttpError(413, 'Request body too large.')
  async register(@Body() body: unknown): Promise<AuthResponse> {
    const result = await this.registerUser.execute(parseCredentials(body));
    return toAuthResponse(result.user, result.accessToken);
  }

  // UC-002. Signing in creates nothing, so it answers 200.
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in and issue an access token' })
  @ApiBody({ required: true, schema: schemaRef('Credentials') })
  @ApiOkResponse({
    description: 'Credentials accepted.',
    schema: schemaRef('AuthResult'),
  })
  @ApiHttpError(400, 'Invalid credentials payload or malformed JSON.')
  @ApiHttpError(401, 'Invalid credentials.')
  @ApiHttpError(413, 'Request body too large.')
  async login(@Body() body: unknown): Promise<AuthResponse> {
    const result = await this.loginUser.execute(parseCredentials(body));
    return toAuthResponse(result.user, result.accessToken);
  }

  // UC-003. Private route: JwtAuthGuard rejects requests without a valid token.
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the authenticated user' })
  @ApiBearerAuth(jwtSchemeName)
  @ApiOkResponse({ description: 'Current user.', schema: schemaRef('User') })
  @ApiHttpError(
    401,
    'Missing, invalid or expired token, or no current account.',
  )
  async me(@CurrentUser() user: AuthUser): Promise<UserResponse> {
    const found = await this.currentUser.execute({
      userId: UserId.of(user.id),
    });
    return toUserResponse(found);
  }
}
