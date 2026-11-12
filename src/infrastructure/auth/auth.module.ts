import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthController } from '../../adapters/http/auth/auth.controller.js';
import {
  LOGIN_USE_CASE,
  REGISTER_USE_CASE,
} from '../../adapters/http/auth/auth.tokens.js';
import { MongoUserRepository } from '../../adapters/persistence/mongo/mongo-user.repository.js';
import {
  USER_MODEL,
  UserDocument,
  UserSchema,
} from '../../adapters/persistence/mongo/user.schema.js';
import { JwtTokenIssuer } from '../../adapters/security/jwt-token-issuer.js';
import { ScryptPasswordHasher } from '../../adapters/security/scrypt-password-hasher.js';
import { SystemClock } from '../../adapters/system/system-clock.js';
import { IClock } from '../../application/ports/clock.js';
import { IPasswordHasher } from '../../application/ports/password-hasher.js';
import { ITokenIssuer } from '../../application/ports/token-issuer.js';
import { IUserRepository } from '../../application/ports/user-repository.js';
import { LoginUseCase } from '../../application/use-cases/login.use-case.js';
import { RegisterUseCase } from '../../application/use-cases/register.use-case.js';
import { readAuthConfig } from '../config/auth.config.js';
import {
  CLOCK,
  PASSWORD_HASHER,
  TOKEN_ISSUER,
  USER_REPOSITORY,
} from '../tokens.js';

// Composition root of authentication: the only place that knows which adapter
// stands behind each port. Use cases are plain classes built by factories.
@Module({
  imports: [
    MongooseModule.forFeature([{ name: USER_MODEL, schema: UserSchema }]),
    JwtModule.registerAsync({
      useFactory: () => ({ secret: readAuthConfig(process.env).jwtSecret }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: CLOCK, useFactory: () => new SystemClock() },
    { provide: PASSWORD_HASHER, useFactory: () => new ScryptPasswordHasher() },
    {
      provide: USER_REPOSITORY,
      useFactory: (model: Model<UserDocument>) =>
        new MongoUserRepository(model),
      inject: [getModelToken(USER_MODEL)],
    },
    {
      provide: TOKEN_ISSUER,
      useFactory: (jwt: JwtService) =>
        new JwtTokenIssuer(
          jwt,
          readAuthConfig(process.env).jwtExpiresInSeconds,
        ),
      inject: [JwtService],
    },
    {
      provide: REGISTER_USE_CASE,
      useFactory: (
        users: IUserRepository,
        hasher: IPasswordHasher,
        clock: IClock,
        tokens: ITokenIssuer,
      ) => new RegisterUseCase(users, hasher, clock, tokens),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, CLOCK, TOKEN_ISSUER],
    },
    {
      provide: LOGIN_USE_CASE,
      useFactory: (
        users: IUserRepository,
        hasher: IPasswordHasher,
        tokens: ITokenIssuer,
      ) => new LoginUseCase(users, hasher, tokens),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_ISSUER],
    },
  ],
})
export class AuthModule {}
