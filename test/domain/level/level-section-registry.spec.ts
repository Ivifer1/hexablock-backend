import sortExample from '../../../docs/specs/levels/hexa-sort.example.json' with { type: 'json' };
import { GameId } from '../../../src/domain/game/game-id.js';
import { Level } from '../../../src/domain/level/level.js';
import type { ILevelSectionValidator } from '../../../src/domain/level/level-section-validator.js';
import { SectionKey } from '../../../src/domain/level/section-key.js';
import { DomainError } from '../../../src/domain/shared/domain-error.js';
import { ErrorCode } from '../../../src/domain/shared/error-code.js';
import { createLevelValidator } from '../../../src/infrastructure/levels/create-level-validator.js';
import { levelFrom } from './level-fixture.js';

class ExtraSectionValidator implements ILevelSectionValidator {
  readonly seen: Level[] = [];

  sectionKey(): SectionKey {
    return SectionKey.of('extra');
  }

  validate(level: Level): void {
    this.seen.push(level);
  }
}

describe('Level section strategy registration (FR-010, issue #29)', () => {
  it('should_reject_a_level_when_no_strategy_is_registered_for_its_game', () => {
    // Arrange
    const validator = createLevelValidator();
    const level = levelFrom(
      { ...sortExample, gameId: 'unknown-game' },
      { sectionKey: () => SectionKey.of('sort') },
    );

    // Act
    const validate = () => validator.validate(level);

    // Assert
    expect(validate).toThrow(new DomainError(ErrorCode.UnknownGame));
  });

  it('should_call_the_extension_strategy_when_only_it_is_registered', () => {
    // Arrange
    const validator = createLevelValidator();
    const extra = new ExtraSectionValidator();
    const level = levelFrom(
      { ...sortExample, gameId: 'extra-game' },
      { sectionKey: () => SectionKey.of('extra') },
    );
    validator.registerSection(GameId.of('extra-game'), extra);

    // Act
    validator.validate(level);

    // Assert
    expect(extra.seen).toEqual([level]);
  });
});
