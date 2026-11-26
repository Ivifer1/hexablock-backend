// Keep the ordinary parsed values for every route. Progress validation also
// checks the original number text so it never accepts a rounded value.
const roundedNumbers = new WeakMap<object, Set<string>>();

export function isExactProgressInteger(
  source: string | undefined,
  value: number,
): boolean {
  if (!Number.isSafeInteger(value) || value < 0) return false;
  if (source === String(value)) return true;
  const match = source?.match(/^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  if (!match) return false;
  const [, sign, whole, fraction = '', exponent = '0'] = match;
  const digits = (whole + fraction).replace(/^0+/, '');
  if (digits === '') return value === 0;
  if (sign === '-') return false;
  const shift = Number(exponent) - fraction.length;
  if (shift >= 0) {
    // No allocation can be driven by a large exponent or coefficient.
    return (
      digits.length + shift <= 16 &&
      digits + '0'.repeat(shift) === String(value)
    );
  }
  const cut = digits.length + shift;
  return (
    cut > 0 &&
    /^0+$/.test(digits.slice(cut)) &&
    digits.slice(0, cut) === String(value)
  );
}

export function recordProgressNumber(
  this: object,
  key: string,
  value: unknown,
  context?: { readonly source?: string },
): unknown {
  if (
    (key === 'bestScore' || key === 'stars') &&
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    !isExactProgressInteger(context?.source, value)
  ) {
    const previous = roundedNumbers.get(this);
    if (previous) previous.add(key);
    else roundedNumbers.set(this, new Set([key]));
  }
  return value;
}

export function wasRoundedProgressNumber(holder: object, key: string): boolean {
  return roundedNumbers.get(holder)?.has(key) ?? false;
}
