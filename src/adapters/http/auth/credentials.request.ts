import { Credentials } from '../../../application/use-cases/auth.models.js';
import { DomainError } from '../../../domain/shared/domain-error.js';
import { Password } from '../../../domain/user/password.js';
import { Username } from '../../../domain/user/username.js';
import {
  FieldError,
  RequestValidationError,
} from '../request-validation.error.js';

// Validates the body at the edge. The rules are not repeated here: each field
// is built through its value object, and a rejected field becomes one entry
// of the 400 response.
export function parseCredentials(body: unknown): Credentials {
  const fields = isRecord(body) ? body : {};
  const errors: FieldError[] = [];

  const username = parseField(
    fields,
    'username',
    (raw) => Username.of(raw),
    'must have 3 to 20 characters: lowercase letters, digits or _',
    errors,
  );
  const password = parseField(
    fields,
    'password',
    (raw) => Password.of(raw),
    'must have at least 8 characters',
    errors,
  );

  if (username === undefined || password === undefined) {
    throw new RequestValidationError(errors);
  }
  return { username, password };
}

function parseField<T>(
  fields: Record<string, unknown>,
  field: string,
  build: (raw: string) => T,
  ruleMessage: string,
  errors: FieldError[],
): T | undefined {
  const raw = fields[field];
  if (typeof raw !== 'string') {
    errors.push({ field, message: 'must be a string' });
    return undefined;
  }
  try {
    return build(raw);
  } catch (error) {
    if (error instanceof DomainError) {
      errors.push({ field, message: ruleMessage });
      return undefined;
    }
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
