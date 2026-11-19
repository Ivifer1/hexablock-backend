import { Count } from '../../shared/count.js';
import { DomainError } from '../../shared/domain-error.js';
import { ErrorCode } from '../../shared/error-code.js';
import type { Level } from '../level.js';
import type { ILevelSectionValidator } from '../level-section-validator.js';
import type { SectionKey } from '../section-key.js';
import { HexaSortSection } from './hexa-sort-section.js';

export class HexaSortSectionValidator implements ILevelSectionValidator {
  sectionKey(): SectionKey {
    return HexaSortSection.key;
  }

  validate(level: Level): void {
    if (!(level.section instanceof HexaSortSection)) {
      throw new DomainError(ErrorCode.WrongLevelSection);
    }

    const { clearedStacks, colors, minHeight, maxHeight } = level.section;
    const one = Count.of(1);
    const clearingHeight = Count.of(10);
    if (
      clearedStacks.isLessThan(one) ||
      colors.length < 2 ||
      colors.some((color, index) =>
        colors.slice(0, index).some((other) => color.equals(other)),
      ) ||
      minHeight.isLessThan(one) ||
      maxHeight.isLessThan(minHeight) ||
      !maxHeight.isLessThan(clearingHeight)
    ) {
      throw new DomainError(ErrorCode.InvalidSortSection);
    }
  }
}
