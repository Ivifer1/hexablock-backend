import { STATUS_CODES } from 'node:http';
import { Catch, HttpException, HttpStatus } from '@nestjs/common';
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
  [ErrorCode.InvalidCredentials]: {
    statusCode: 401,
    error: 'Unauthorized',
    message: 'Invalid credentials',
  },
};

// A code without an entry is a bug on our side: answer 500 without details.
const UNEXPECTED: HttpError = {
  statusCode: 500,
  error: 'Internal Server Error',
  message: 'Internal server error',
};

// Fixed messages for framework errors (malformed JSON, body too large...).
// The framework's own message is never sent: it can echo part of the input.
const FRAMEWORK_MESSAGES: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Invalid request',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'Request body too large',
};

type HandledError = RequestValidationError | DomainError | HttpException;

// Writes the error body of the API contract for our own errors and for the
// framework's HTTP errors, so every error has the same shape (NFR-002).
// Controllers and use cases only throw; the HTTP shape lives here.
@Catch(RequestValidationError, DomainError, HttpException)
export class HttpErrorFilter implements ExceptionFilter {
  constructor(private readonly clock: IClock) {}

  catch(exception: HandledError, host: ArgumentsHost): void {
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
    exception: HandledError,
  ): HttpError & { details?: RequestValidationError['details'] } {
    if (exception instanceof RequestValidationError) {
      return {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid request',
        details: exception.details,
      };
    }
    if (exception instanceof HttpException) {
      return describeFrameworkError(exception);
    }
    return DOMAIN_ERRORS[exception.code] ?? UNEXPECTED;
  }
}

function describeFrameworkError(exception: HttpException): HttpError {
  const statusCode = exception.getStatus();
  if (statusCode >= 500) {
    return UNEXPECTED;
  }
  // The standard reason phrase ("Payload Too Large"): never user input.
  const error = STATUS_CODES[statusCode] ?? 'Error';
  return {
    statusCode,
    error,
    message: FRAMEWORK_MESSAGES[statusCode] ?? error,
  };
}
