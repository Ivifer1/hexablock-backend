import type { FieldError } from './error-response.js';

export type { FieldError };

// The request body broke one or more input rules. It lists every invalid
// field, so the client can show all the problems at once (HTTP 400).
export class RequestValidationError extends Error {
  constructor(readonly details: readonly FieldError[]) {
    super('Invalid request');
    this.name = 'RequestValidationError';
  }
}
