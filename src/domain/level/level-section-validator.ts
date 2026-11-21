import type { Level } from './level.js';
import type { SectionKey } from './section-key.js';
import type { IBoardTopology } from './topology/board-topology.js';

export interface ILevelSectionValidator {
  sectionKey(): SectionKey;
  validate(level: Level, topology: IBoardTopology): void;
}
