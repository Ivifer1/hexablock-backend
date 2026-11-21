import type { Count } from '../../shared/count.js';
import { DomainError } from '../../shared/domain-error.js';
import { ErrorCode } from '../../shared/error-code.js';
import type { Optional } from '../../shared/optional.js';
import { copySectionItems } from '../copy-section-items.js';
import type { ILevelSection } from '../level-section.js';
import { SectionKey } from '../section-key.js';

export class ColorId {
  private constructor(private readonly value: string) {}

  static of(value: string): ColorId {
    return new ColorId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: ColorId): boolean {
    return this.value === other.value;
  }
}

export class Seed {
  private constructor(private readonly value: number) {}

  static of(value: number): Seed {
    if (!Number.isInteger(value)) {
      throw new DomainError(ErrorCode.InvalidSortSection);
    }
    return new Seed(value);
  }

  toNumber(): number {
    return this.value;
  }

  equals(other: Seed): boolean {
    return this.value === other.value;
  }
}

export class HexaSortSection implements ILevelSection {
  static readonly key = SectionKey.of('sort');

  private constructor(
    readonly clearedStacks: Count,
    readonly colors: readonly ColorId[],
    readonly minHeight: Count,
    readonly maxHeight: Count,
    readonly seed: Optional<Seed>,
  ) {}

  static of(
    clearedStacks: Count,
    colors: readonly ColorId[],
    minHeight: Count,
    maxHeight: Count,
    seed: Optional<Seed>,
  ): HexaSortSection {
    return new HexaSortSection(
      clearedStacks,
      copySectionItems(colors, ErrorCode.InvalidSortSection),
      minHeight,
      maxHeight,
      seed,
    );
  }

  sectionKey(): SectionKey {
    return HexaSortSection.key;
  }
}
