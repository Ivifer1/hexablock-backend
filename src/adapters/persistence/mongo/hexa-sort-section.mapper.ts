import { HexaSortSection } from '../../../domain/level/sort/hexa-sort-section.js';
import type { ILevelSection } from '../../../domain/level/level-section.js';
import {
  decodeSortSection,
  encodeSortSection,
} from '../../levels/level-section-payloads.js';
import type { ILevelSectionMapper } from './level-section-mapper.js';

export class HexaSortSectionMapper implements ILevelSectionMapper {
  readonly sectionKey = HexaSortSection.key;

  toPayload(section: ILevelSection): unknown {
    return encodeSortSection(section);
  }

  toDomain(payload: unknown): HexaSortSection {
    return decodeSortSection(payload);
  }
}
