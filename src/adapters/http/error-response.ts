// One invalid field of a request (only in 400 answers).
export interface FieldError {
  readonly field: string;
  readonly message: string;
}

// The error body of the API contract (section Errors). Every error the API
// answers has this shape.
export interface ErrorResponse {
  readonly statusCode: number;
  readonly error: string;
  readonly message: string;
  readonly details?: readonly FieldError[];
  readonly path: string;
  readonly timestamp: string;
}
