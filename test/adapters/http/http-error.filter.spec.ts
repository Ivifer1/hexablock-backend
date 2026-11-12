import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { HttpErrorFilter } from '../../../src/adapters/http/http-error.filter.js';
import { RequestValidationError } from '../../../src/adapters/http/request-validation.error.js';
import { DomainError } from '../../../src/domain/shared/domain-error.js';
import { ErrorCode } from '../../../src/domain/shared/error-code.js';
import { FixedClock } from '../../support/fakes.js';

// The filter's mapping from every kind of error to the contract's error body
// (issue #20, NFR-002). One test per status code.
describe('HttpErrorFilter (issue #20)', () => {
  const now = new Date('2026-11-12T10:00:00.000Z');
  const filter = new HttpErrorFilter(new FixedClock(now));

  function answer(exception: unknown, url = '/api/v1/somewhere') {
    const sent: { status?: number; body?: unknown } = {};
    const response = {
      status(code: number) {
        sent.status = code;
        return response;
      },
      json(body: unknown) {
        sent.body = body;
        return response;
      },
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ originalUrl: url }),
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;
    filter.catch(exception, host);
    return sent;
  }

  function body(statusCode: number, error: string, message: string) {
    return {
      statusCode,
      error,
      message,
      path: '/api/v1/somewhere',
      timestamp: '2026-11-12T10:00:00.000Z',
    };
  }

  it('should_answer_400_with_details_when_request_validation_fails', () => {
    // Arrange
    const details = [{ field: 'password', message: 'must be a string' }];

    // Act
    const sent = answer(new RequestValidationError(details));

    // Assert
    expect(sent.status).toBe(400);
    expect(sent.body).toEqual({
      ...body(400, 'Bad Request', 'Invalid request'),
      details,
    });
  });

  it('should_answer_400_with_fixed_message_when_framework_rejects_request', () => {
    // Arrange: the framework's message could echo the input.
    const exception = new BadRequestException('Unexpected token "secret-probe"');

    // Act
    const sent = answer(exception);

    // Assert
    expect(sent.status).toBe(400);
    expect(sent.body).toEqual(body(400, 'Bad Request', 'Invalid request'));
  });

  it('should_answer_401_when_credentials_are_invalid', () => {
    // Arrange + Act
    const sent = answer(new DomainError(ErrorCode.InvalidCredentials));

    // Assert
    expect(sent.status).toBe(401);
    expect(sent.body).toEqual(body(401, 'Unauthorized', 'Invalid credentials'));
  });

  it('should_answer_401_when_authentication_is_required', () => {
    // Arrange + Act
    const sent = answer(new DomainError(ErrorCode.AuthenticationRequired));

    // Assert
    expect(sent.status).toBe(401);
    expect(sent.body).toEqual(
      body(401, 'Unauthorized', 'Authentication required'),
    );
  });

  it('should_answer_403_when_access_is_forbidden', () => {
    // Arrange + Act
    const sent = answer(new ForbiddenException('internal reason'));

    // Assert
    expect(sent.status).toBe(403);
    expect(sent.body).toEqual(body(403, 'Forbidden', 'Forbidden'));
  });

  it('should_answer_404_when_resource_is_not_found', () => {
    // Arrange + Act
    const sent = answer(new NotFoundException('Cannot GET /api/v1/x'));

    // Assert
    expect(sent.status).toBe(404);
    expect(sent.body).toEqual(body(404, 'Not Found', 'Not Found'));
  });

  it('should_answer_409_when_username_is_taken', () => {
    // Arrange + Act
    const sent = answer(new DomainError(ErrorCode.UsernameTaken));

    // Assert
    expect(sent.status).toBe(409);
    expect(sent.body).toEqual(body(409, 'Conflict', 'Username already taken'));
  });

  it('should_answer_413_when_body_is_too_large', () => {
    // Arrange + Act
    const sent = answer(new PayloadTooLargeException());

    // Assert
    expect(sent.status).toBe(413);
    expect(sent.body).toEqual(
      body(413, 'Payload Too Large', 'Request body too large'),
    );
  });

  it('should_answer_500_without_details_when_domain_code_has_no_mapping', () => {
    // Arrange: a domain rule that reached HTTP without a row in the table.
    const exception = new DomainError(ErrorCode.InvalidUsername);

    // Act
    const sent = answer(exception);

    // Assert
    expect(sent.status).toBe(500);
    expect(sent.body).toEqual(
      body(500, 'Internal Server Error', 'Internal server error'),
    );
  });

  it('should_answer_500_without_details_when_error_is_unexpected', () => {
    // Arrange
    const exception = new Error('connection refused at 10.0.0.5:27017');

    // Act
    const sent = answer(exception);

    // Assert
    expect(sent.status).toBe(500);
    expect(sent.body).toEqual(
      body(500, 'Internal Server Error', 'Internal server error'),
    );
    expect(JSON.stringify(sent.body)).not.toContain('10.0.0.5');
  });

  it('should_write_path_without_query_string_when_url_has_one', () => {
    // Arrange
    const url = '/api/v1/somewhere?access_token=secret-token';

    // Act
    const sent = answer(new DomainError(ErrorCode.UsernameTaken), url);

    // Assert
    expect((sent.body as { path: string }).path).toBe('/api/v1/somewhere');
    expect(JSON.stringify(sent.body)).not.toContain('secret-token');
  });
});
