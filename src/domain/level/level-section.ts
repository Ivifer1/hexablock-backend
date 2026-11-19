import type { SectionKey } from './section-key.js';

// Implemented by immutable, typed variant sections. Raw JSON stays in adapters.
export interface ILevelSection {
  sectionKey(): SectionKey;
}
