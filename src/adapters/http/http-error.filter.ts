import { Catch } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { IClock } from '../../application/ports/clock.js';
import { DomainError } from '../../domain/shared/domain-error.js';
import { ErrorCode } from '../../domain/shared/error-code.js';
import { RequestValidationError } from './request-validation.error.js';

interface HttpError {
  readonly statusCode: number;
  readonly error: string;
  readonly message: string;
}

// One entry per error code that reaches HTTP. A new code is a new entry.
const DOMAIN_ERRORS: Partial<Record<ErrorCode, HttpError>> = {
  [ErrorCode.UsernameTaken]: {
    statusCode: 409,
    error: 'Conflict',
    message: 'Username already taken',
  },
};

// A code without an entry is a bug on our side: answer 500 without details.
const UNEXPECTED: HttpError = {
  statusCode: 500,
  error: 'Internal Server Error',
  message: 'Internal server error',
};

// Writes the error body of the API contract for the errors of our own code.
// Controllers and use cases only throw; the HTTP shape lives here.
@Catch(RequestValidationError, DomainError)
export class HttpErrorFilter implements ExceptionFilter {
  constructor(private readonly clock: IClock) {}

  catch(
    exception: RequestValidationError | DomainError,
    host: ArgumentsHost,
  ): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const { statusCode, error, message, details } = this.describe(exception);
    response.status(statusCode).json({
      statusCode,
      error,
      message,
      ...(details ? { details } : {}),
      path: request.originalUrl,
      timestamp: this.clock.now().toISOString(),
    });
  }

  private describe(
    exception: RequestValidationError | DomainError,
  ): HttpError & { details?: RequestValidationError['details'] } {
    if (exception instanceof RequestValidationError) {
      return {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid request',
        details: exception.details,
      };
    }
    return DOMAIN_ERRORS[exception.code] ?? UNEXPECTED;
  }
}
