import { ErrorCode } from './error-code.js';

// Raised when a domain rule is broken. It carries a code, not a message for
// users; the error filter (issue #20) builds the HTTP response from the code.
export class DomainError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
    this.name = 'DomainError';
  }
}
