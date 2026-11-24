import { HexaFitSection } from '../../../domain/level/fit/hexa-fit-section.js';
import type { ILevelSection } from '../../../domain/level/level-section.js';
import {
  decodeFitSection,
  encodeFitSection,
} from '../../levels/level-section-payloads.js';
import type { ILevelSectionMapper } from './level-section-mapper.js';

export class HexaFitSectionMapper implements ILevelSectionMapper {
  readonly sectionKey = HexaFitSection.key;

  toPayload(section: ILevelSection): unknown {
    return encodeFitSection(section);
  }

  toDomain(payload: unknown): HexaFitSection {
    return decodeFitSection(payload);
  }
}
