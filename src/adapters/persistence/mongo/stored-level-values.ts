export function readRecord(
  raw: unknown,
  field: string,
): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`Expected an object for ${field}`);
  }
  return raw as Record<string, unknown>;
}

export function readText(raw: unknown, field: string): string {
  if (typeof raw !== 'string') throw new Error(`Expected text for ${field}`);
  return raw;
}

export function readNumber(raw: unknown, field: string): number {
  if (typeof raw !== 'number')
    throw new Error(`Expected a number for ${field}`);
  return raw;
}

export function readList<T>(
  raw: unknown,
  field: string,
  readItem: (value: unknown) => T,
): T[] {
  if (!Array.isArray(raw)) throw new Error(`Expected an array for ${field}`);
  return Array.from(raw, readItem);
}

export function readCoordinates(raw: unknown): number[][] {
  return readList(raw, 'cells', (cell) =>
    readList(cell, 'coordinate', (part) =>
      readNumber(part, 'coordinate component'),
    ),
  );
}
