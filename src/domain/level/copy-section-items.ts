import { DomainError } from '../shared/domain-error.js';
import type { ErrorCode } from '../shared/error-code.js';

export function copySectionItems<T>(
  values: readonly T[],
  errorCode: ErrorCode,
): readonly T[] {
  const copy: T[] = [];
  for (const index of values.keys()) {
    if (!Object.hasOwn(values, index)) {
      throw new DomainError(errorCode);
    }
    copy.push(values[index]);
  }
  return Object.freeze(copy);
}
