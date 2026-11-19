import sortExample from '../../../docs/specs/levels/hexa-sort.example.json' with { type: 'json' };
import { SectionKey } from '../../../src/domain/level/section-key.js';
import {
  ColorId,
  HexaSortSection,
  Seed,
} from '../../../src/domain/level/sort/hexa-sort-section.js';
import { Count } from '../../../src/domain/shared/count.js';
import { DomainError } from '../../../src/domain/shared/domain-error.js';
import { ErrorCode } from '../../../src/domain/shared/error-code.js';
import { Optional } from '../../../src/domain/shared/optional.js';
import { createLevelValidator } from '../../../src/infrastructure/levels/create-level-validator.js';
import { levelFrom, sparse } from './level-fixture.js';

interface SortInput {
  clearedStacks: number;
  colors: readonly string[];
  minHeight: number;
  maxHeight: number;
  seed: Optional<Seed>;
}

function sortSection(input: Partial<SortInput> = {}): HexaSortSection {
  return HexaSortSection.of(
    Count.of(input.clearedStacks ?? 1),
    (input.colors ?? ['tone-1', 'tone-2']).map((id) => ColorId.of(id)),
    Count.of(input.minHeight ?? 1),
    Count.of(input.maxHeight ?? 9),
    input.seed ?? Optional.empty<Seed>(),
  );
}

describe('Sort level sections (FR-010, issue #29)', () => {
  it('should_accept_the_documented_sort_level_when_its_section_matches_the_rules', () => {
    // Arrange
    const validator = createLevelValidator();
    const section = sortSection({
      clearedStacks: sortExample.sort.goal.clearedStacks,
      colors: sortExample.sort.colors,
      minHeight: sortExample.sort.stackHeight.min,
      maxHeight: sortExample.sort.stackHeight.max,
      seed: Optional.of(Seed.of(sortExample.sort.seed)),
    });

    // Act
    const validate = () => validator.validate(levelFrom(sortExample, section));

    // Assert
    expect(validate).not.toThrow();
  });

  it.each([
    { value: 0, code: () => ErrorCode.InvalidSortSection },
    { value: -1, code: () => ErrorCode.InvalidCount },
    { value: 1.5, code: () => ErrorCode.InvalidCount },
  ])('should_reject_sort_section_when_goal_is_$value', ({ value, code }) => {
    // Arrange
    const validator = createLevelValidator();

    // Act
    const validate = () =>
      validator.validate(
        levelFrom(sortExample, sortSection({ clearedStacks: value })),
      );

    // Assert
    expect(validate).toThrow(new DomainError(code()));
  });

  it.each([
    { case: 'fewer_than_two', colors: ['tone-1'] },
    {
      case: 'repeated_even_when_two_distinct_remain',
      colors: ['tone-1', 'tone-2', 'tone-1'],
    },
  ])('should_reject_sort_section_when_colors_are_$case', ({ colors }) => {
    // Arrange
    const validator = createLevelValidator();

    // Act
    const validate = () =>
      validator.validate(levelFrom(sortExample, sortSection({ colors })));

    // Assert
    expect(validate).toThrow(new DomainError(ErrorCode.InvalidSortSection));
  });

  it.each([
    { minHeight: 0, maxHeight: 9, code: () => ErrorCode.InvalidSortSection },
    { minHeight: 1, maxHeight: 10, code: () => ErrorCode.InvalidSortSection },
    { minHeight: 4, maxHeight: 3, code: () => ErrorCode.InvalidSortSection },
    { minHeight: 1.5, maxHeight: 9, code: () => ErrorCode.InvalidCount },
    { minHeight: 1, maxHeight: 8.5, code: () => ErrorCode.InvalidCount },
  ])(
    'should_reject_sort_section_when_height_range_is_$minHeight-$maxHeight',
    ({ minHeight, maxHeight, code }) => {
      // Arrange
      const validator = createLevelValidator();

      // Act
      const validate = () =>
        validator.validate(
          levelFrom(sortExample, sortSection({ minHeight, maxHeight })),
        );

      // Assert
      expect(validate).toThrow(new DomainError(code()));
    },
  );

  it.each([
    { case: 'absent', seed: () => Optional.empty<Seed>() },
    { case: 'a_negative_integer', seed: () => Optional.of(Seed.of(-1)) },
  ])('should_accept_sort_level_when_seed_is_$case', ({ seed }) => {
    // Arrange
    const validator = createLevelValidator();
    const section = sortSection({ seed: seed(), minHeight: 9, maxHeight: 9 });

    // Act
    const validate = () => validator.validate(levelFrom(sortExample, section));

    // Assert
    expect(validate).not.toThrow();
  });

  it('should_reject_sort_level_when_seed_is_not_an_integer', () => {
    // Arrange
    const validator = createLevelValidator();

    // Act
    const validate = () =>
      validator.validate(
        levelFrom(
          sortExample,
          sortSection({ seed: Optional.of(Seed.of(0.5)) }),
        ),
      );

    // Assert
    expect(validate).toThrow(DomainError);
  });
  it.each([{ fixture: sortExample, key: 'sort' }])(
    'should_reject_a_forged_section_when_only_the_section_key_matches_$key',
    ({ fixture, key }) => {
      // Arrange
      const validator = createLevelValidator();
      const level = levelFrom(fixture, {
        sectionKey: () => SectionKey.of(key),
      });

      // Act
      const validate = () => validator.validate(level);

      // Assert
      expect(validate).toThrow(DomainError);
    },
  );

  it.each([
    [
      'colors',
      () =>
        HexaSortSection.of(
          Count.of(1),
          sparse<ColorId>(2),
          Count.of(1),
          Count.of(9),
          Optional.empty<Seed>(),
        ),
      ErrorCode.InvalidSortSection,
    ],
  ] as const)(
    'should_reject_a_sparse_level_section_collection_when_input_is_%s',
    (_, makeSection, code) => {
      // Arrange
      const expected = new DomainError(code);

      // Act
      const construct = () => makeSection();

      // Assert
      expect(construct).toThrow(expected);
    },
  );
});
