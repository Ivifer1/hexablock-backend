import fitExample from '../../../docs/specs/levels/hexa-fit.example.json' with { type: 'json' };
import { LevelMapper } from '../../../src/adapters/persistence/mongo/level.mapper.js';
import { GameId } from '../../../src/domain/game/game-id.js';
import type { ILevelSection } from '../../../src/domain/level/level-section.js';
import { RawCoord } from '../../../src/domain/level/raw-coord.js';
import { SectionKey } from '../../../src/domain/level/section-key.js';
import { createLevelValidator } from '../../../src/infrastructure/levels/create-level-validator.js';
import { levelFrom } from '../../domain/level/level-fixture.js';

class ExtraSection implements ILevelSection {
  constructor(readonly label: string) {}

  sectionKey(): SectionKey {
    return SectionKey.of('extra');
  }
}

describe('LevelMapper (FR-010, issue #30)', () => {
  it('should_round_trip_a_new_variant_when_its_section_mapper_is_registered', () => {
    // Arrange
    const gameId = GameId.of('test-extra');
    const section = new ExtraSection('a separate variant');
    const validator = createLevelValidator();
    validator.registerSection(gameId, {
      sectionKey: () => SectionKey.of('extra'),
      validate() {},
    });
    const mapper = new LevelMapper(validator, [
      {
        gameId,
        mapper: {
          sectionKey: SectionKey.of('extra'),
          toPayload(value) {
            if (!(value instanceof ExtraSection))
              throw new Error('Unexpected section');
            return { label: value.label };
          },
          toDomain(payload) {
            if (
              typeof payload !== 'object' ||
              payload === null ||
              !('label' in payload) ||
              typeof payload.label !== 'string'
            )
              throw new Error('Invalid extra section');
            return new ExtraSection(payload.label);
          },
        },
      },
    ]);
    const level = levelFrom({ ...fitExample, gameId: 'test-extra' }, section);

    // Act
    const document = mapper.toDocument(level);
    const rehydrated = mapper.toDomain(document);

    // Assert
    expect(document.section).toEqual({
      key: 'extra',
      payload: { label: section.label },
    });
    expect(rehydrated.gameId.equals(gameId)).toBe(true);
    expect(rehydrated.section).toBeInstanceOf(ExtraSection);
    expect(rehydrated.section).toEqual(section);
  });

  it('should_preserve_coordinate_when_its_boundary_snapshot_is_modified', () => {
    // Arrange
    const coordinate = RawCoord.of([0, -1]);

    // Act
    const snapshot = coordinate.toArray();
    const modified = Reflect.set(snapshot, '0', 4);

    // Assert
    expect(modified).toBe(false);
    expect(coordinate.equals(RawCoord.of([0, -1]))).toBe(true);
    expect(coordinate.toArray()).not.toBe(snapshot);
  });
});
