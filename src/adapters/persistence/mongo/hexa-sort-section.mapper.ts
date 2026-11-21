import { encodeSortSection } from '../../levels/level-section-payloads.js';
import type { ILevelSection } from '../../../domain/level/level-section.js';
import {
  ColorId,
  HexaSortSection,
  Seed,
} from '../../../domain/level/sort/hexa-sort-section.js';
import { Count } from '../../../domain/shared/count.js';
import { Optional } from '../../../domain/shared/optional.js';
import type { ILevelSectionMapper } from './level-section-mapper.js';
import {
  readList,
  readNumber,
  readRecord,
  readText,
} from './stored-level-values.js';

export class HexaSortSectionMapper implements ILevelSectionMapper {
  readonly sectionKey = HexaSortSection.key;

  toPayload(section: ILevelSection): unknown {
    return encodeSortSection(section);
  }

  toDomain(payload: unknown): HexaSortSection {
    const sort = readRecord(payload, 'Sort section');
    const goal = readRecord(sort.goal, 'goal');
    const height = readRecord(sort.stackHeight, 'stack height');
    return HexaSortSection.of(
      Count.of(readNumber(goal.clearedStacks, 'cleared stack goal')),
      readList(sort.colors, 'colors', (color) =>
        ColorId.of(readText(color, 'color id')),
      ),
      Count.of(readNumber(height.min, 'minimum stack height')),
      Count.of(readNumber(height.max, 'maximum stack height')),
      Object.hasOwn(sort, 'seed')
        ? Optional.of(Seed.of(readNumber(sort.seed, 'seed')))
        : Optional.empty(),
    );
  }
}
