// Keep parsed numbers unchanged while remembering fields that rounded on parse.
const roundedNumbers = new WeakMap<object, Set<string>>();

export function isExactNonnegativeSafeInteger(
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

const EXACT_INTEGER_FIELDS = new Set(['bestScore', 'stars', 'score']);

export function recordExactJsonNumber(
  this: object,
  key: string,
  value: unknown,
  context?: { readonly source?: string },
): unknown {
  if (
    EXACT_INTEGER_FIELDS.has(key) &&
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    !isExactNonnegativeSafeInteger(context?.source, value)
  ) {
    const previous = roundedNumbers.get(this);
    if (previous) previous.add(key);
    else roundedNumbers.set(this, new Set([key]));
  }
  return value;
}

export function wasRoundedJsonNumber(holder: object, key: string): boolean {
  return roundedNumbers.get(holder)?.has(key) ?? false;
}
