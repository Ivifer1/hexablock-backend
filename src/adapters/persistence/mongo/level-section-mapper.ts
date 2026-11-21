import type { GameId } from '../../../domain/game/game-id.js';
import type { ILevelSection } from '../../../domain/level/level-section.js';
import type { SectionKey } from '../../../domain/level/section-key.js';

export interface ILevelSectionMapper {
  readonly sectionKey: SectionKey;
  toPayload(section: ILevelSection): unknown;
  toDomain(payload: unknown): ILevelSection;
}

export interface LevelSectionMapperRegistration {
  readonly gameId: GameId;
  readonly mapper: ILevelSectionMapper;
}
