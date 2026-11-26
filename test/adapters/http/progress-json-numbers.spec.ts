import { isExactProgressInteger } from '../../../src/adapters/http/progress/progress-json-numbers.js';

describe('Progress JSON numeric accuracy', () => {
  it.each([
    ['125', 125],
    ['125.00', 125],
    ['1.25e2', 125],
    ['1200e-2', 12],
    ['-0', 0],
  ])('should_accept_an_exact_integer_when_source_is_%s', (source, value) => {
    expect(isExactProgressInteger(source, value)).toBe(true);
  });

  it.each([
    ['12.5', 12],
    ['-12', 12],
    ['1e-2', 0],
    ['7e1000', 7],
    ['7', Number.MAX_SAFE_INTEGER + 1],
    [undefined, 12],
  ])(
    'should_reject_unrepresentable_or_missing_integer_text_when_source_is_%s',
    (source, value) => {
      expect(isExactProgressInteger(source, value)).toBe(false);
    },
  );
});
