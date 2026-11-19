import type { Level } from './level.js';
import type { SectionKey } from './section-key.js';

export interface ILevelSectionValidator {
  sectionKey(): SectionKey;
  validate(level: Level): void;
}
