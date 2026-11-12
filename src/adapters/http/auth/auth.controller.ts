import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import type { IUseCase } from '../../../application/use-case.js';
import type {
  AuthResult,
  Credentials,
} from '../../../application/use-cases/auth.models.js';
import { AuthResponse, toAuthResponse } from './auth.response.js';
import { LOGIN_USE_CASE, REGISTER_USE_CASE } from './auth.tokens.js';
import { parseCredentials } from './credentials.request.js';

// Thin controller: parse the body, call one use case, map the result.
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(REGISTER_USE_CASE)
    private readonly registerUser: IUseCase<Credentials, AuthResult>,
    @Inject(LOGIN_USE_CASE)
    private readonly loginUser: IUseCase<Credentials, AuthResult>,
  ) {}

  // UC-001. POST answers 201 Created by default.
  @Post('register')
  async register(@Body() body: unknown): Promise<AuthResponse> {
    const result = await this.registerUser.execute(parseCredentials(body));
    return toAuthResponse(result.user, result.accessToken);
  }

  // UC-002. Signing in creates nothing, so it answers 200.
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown): Promise<AuthResponse> {
    const result = await this.loginUser.execute(parseCredentials(body));
    return toAuthResponse(result.user, result.accessToken);
  }
}
