import { DomainError } from '../shared/domain-error.js';
import { ErrorCode } from '../shared/error-code.js';

const MINIMUM_LENGTH = 8;
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

function countCharacters(text: string): number {
  let count = 0;
  for (const _ of graphemes.segment(text)) {
    count += 1;
  }
  return count;
}

// A plain password as the player typed it (BR-001-2). It only lives during a
// request: it is hashed into a PasswordHash and never stored.
export class Password {
  private constructor(private readonly value: string) {}

  static of(raw: string): Password {
    // Counts characters as people see them, not UTF-16 units: an emoji is one.
    if (countCharacters(raw) < MINIMUM_LENGTH) {
      throw new DomainError(ErrorCode.InvalidPassword);
    }
    return new Password(raw);
  }

  toString(): string {
    return this.value;
  }
}
