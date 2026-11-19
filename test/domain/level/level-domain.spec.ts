import { GameId } from '../../../src/domain/game/game-id.js';
import { Count } from '../../../src/domain/shared/count.js';
import { DomainError } from '../../../src/domain/shared/domain-error.js';
import { ErrorCode } from '../../../src/domain/shared/error-code.js';
import { BoardDefinition } from '../../../src/domain/level/board-definition.js';
import {
  Level,
  type LevelProperties,
} from '../../../src/domain/level/level.js';
import { LevelId } from '../../../src/domain/level/level-id.js';
import { LevelNumber } from '../../../src/domain/level/level-number.js';
import { LocalizedName } from '../../../src/domain/level/localized-name.js';
import { RawCoord } from '../../../src/domain/level/raw-coord.js';
import { SchemaVersion } from '../../../src/domain/level/schema-version.js';
import { SectionKey } from '../../../src/domain/level/section-key.js';
import { TopologyId } from '../../../src/domain/level/topology-id.js';
import { LevelValidator } from '../../../src/domain/level/level-validator.js';
import type { ILevelSection } from '../../../src/domain/level/level-section.js';
import type { ILevelSectionValidator } from '../../../src/domain/level/level-section-validator.js';
import type { IBoardTopology } from '../../../src/domain/level/topology/board-topology.js';
import { HexAxialTopology } from '../../../src/domain/level/topology/hex-axial-topology.js';

function expectCode(action: () => unknown, code: ErrorCode): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
    return;
  }
  throw new Error('Expected a DomainError');
}

class FakeSection implements ILevelSection {
  constructor(private readonly key = SectionKey.of('fake')) {}
  sectionKey(): SectionKey {
    return this.key;
  }
}

class FakeSectionValidator implements ILevelSectionValidator {
  readonly levels: Level[] = [];
  sectionKey(): SectionKey {
    return SectionKey.of('fake');
  }
  validate(level: Level): void {
    this.levels.push(level);
  }
}

// A different dimension and neighbour count, never a production topology.
class FakeLineTopology implements IBoardTopology {
  id(): TopologyId {
    return TopologyId.of('fake-line');
  }
  coordinateSize(): Count {
    return Count.of(1);
  }
  neighbors(coord: RawCoord): readonly RawCoord[] {
    return [
      coord.translated(RawCoord.of([-1])),
      coord.translated(RawCoord.of([1])),
    ];
  }
}

function level(overrides: Partial<LevelProperties> = {}): Level {
  return Level.create({
    schemaVersion: SchemaVersion.of(1),
    id: LevelId.of('fake-001'),
    gameId: GameId.of('fake-game'),
    order: LevelNumber.of(1),
    name: LocalizedName.of('Nivel de prueba', 'Test level'),
    board: BoardDefinition.of(TopologyId.of('hex-axial'), [
      RawCoord.of([0, 0]),
    ]),
    section: new FakeSection(),
    ...overrides,
  });
}

function board(
  topology: string,
  cells: readonly (readonly number[])[],
): BoardDefinition {
  return BoardDefinition.of(
    TopologyId.of(topology),
    cells.map((cell) => RawCoord.of(cell)),
  );
}

function configured(): {
  validator: LevelValidator;
  section: FakeSectionValidator;
} {
  const validator = new LevelValidator();
  const section = new FakeSectionValidator();
  validator.registerTopology(new HexAxialTopology());
  validator.registerSection(GameId.of('fake-game'), section);
  return { validator, section };
}

describe('Level value objects (FR-010, issue #28)', () => {
  it.each([
    ['schema version', () => SchemaVersion.of(1).equals(SchemaVersion.of(1))],
    ['level id', () => LevelId.of('fit-003').equals(LevelId.of('fit-003'))],
    ['game id', () => GameId.of('hexa-fit').equals(GameId.of('hexa-fit'))],
    ['order', () => LevelNumber.of(1).equals(LevelNumber.of(1))],
    ['count', () => Count.of(0).equals(Count.of(0))],
    [
      'topology id',
      () => TopologyId.of('hex-axial').equals(TopologyId.of('hex-axial')),
    ],
    ['section key', () => SectionKey.of('fit').equals(SectionKey.of('fit'))],
    [
      'name',
      () =>
        LocalizedName.of('Nombre', 'Name').equals(
          LocalizedName.of('Nombre', 'Name'),
        ),
    ],
  ])(
    'should_compare_by_value_when_instances_are_distinct (%s)',
    (_name, equal) => {
      // Arrange + Act
      const result = equal();
      // Assert
      expect(result).toBe(true);
    },
  );

  it.each([
    ['level id', () => LevelId.of('a').equals(LevelId.of('b'))],
    ['game id', () => GameId.of('a').equals(GameId.of('b'))],
    ['order', () => LevelNumber.of(1).equals(LevelNumber.of(2))],
    ['count', () => Count.of(0).equals(Count.of(1))],
    ['topology id', () => TopologyId.of('a').equals(TopologyId.of('b'))],
    ['section key', () => SectionKey.of('a').equals(SectionKey.of('b'))],
    [
      'name',
      () =>
        LocalizedName.of('Nombre', 'Name').equals(
          LocalizedName.of('Otro', 'Name'),
        ),
    ],
  ])('should_compare_unequal_when_values_differ (%s)', (_name, equal) => {
    // Arrange + Act
    const result = equal();
    // Assert
    expect(result).toBe(false);
  });

  it.each([0, 2, 1.5, NaN, Infinity])(
    'should_throw_invalid_schema_version_when_version_is_not_1 (%s)',
    (raw) => {
      // Arrange + Act + Assert
      expectCode(() => SchemaVersion.of(raw), ErrorCode.InvalidSchemaVersion);
    },
  );

  it.each(['', 'Fit-003', 'fit_003', 'with space', ' fit-1'])(
    'should_throw_invalid_level_id_when_format_is_invalid (%s)',
    (raw) => {
      // Arrange + Act + Assert
      expectCode(() => LevelId.of(raw), ErrorCode.InvalidLevelId);
      expectCode(() => GameId.of(raw), ErrorCode.InvalidGameId);
    },
  );

  it.each([0, -1, 1.5, NaN, Infinity])(
    'should_throw_invalid_level_order_when_value_is_below_1_or_not_integer (%s)',
    (raw) => {
      // Arrange + Act + Assert
      expectCode(() => LevelNumber.of(raw), ErrorCode.InvalidLevelOrder);
    },
  );

  it.each([-1, 0.5, NaN, Infinity])(
    'should_throw_invalid_count_when_value_is_not_a_nonnegative_integer (%s)',
    (raw) => {
      // Arrange + Act + Assert
      expectCode(() => Count.of(raw), ErrorCode.InvalidCount);
    },
  );

  it.each([
    ['', 'Name'],
    ['Nombre', ''],
    ['  ', 'Name'],
    ['Nombre', '  '],
  ])(
    'should_throw_invalid_level_name_when_a_language_is_blank (%s, %s)',
    (es, en) => {
      // Arrange + Act + Assert
      expectCode(() => LocalizedName.of(es, en), ErrorCode.InvalidLevelName);
    },
  );

  it.each(['', '  '])(
    'should_throw_invalid_identifier_when_topology_or_section_key_is_blank (%s)',
    (raw) => {
      // Arrange + Act + Assert
      expectCode(() => TopologyId.of(raw), ErrorCode.InvalidTopologyId);
      expectCode(() => SectionKey.of(raw), ErrorCode.InvalidSectionKey);
    },
  );

  it('should_preserve_original_text_when_name_is_valid', () => {
    // Arrange
    const original = LocalizedName.of(' Nombre ', ' Name ');
    // Act + Assert
    expect(original.equals(LocalizedName.of('Nombre', 'Name'))).toBe(false);
    expect(original.equals(LocalizedName.of(' Nombre ', ' Name '))).toBe(true);
  });
});

describe('Board and coordinates (FR-010, issue #28)', () => {
  it.each(['all', 'first', 'last'])(
    'should_throw_invalid_coordinate_when_components_are_missing (%s)',
    (missing) => {
      // Arrange
      const values: number[] = [];
      values.length = 2;
      if (missing === 'first') values[1] = 0;
      if (missing === 'last') values[0] = 0;
      // Act + Assert
      expectCode(() => RawCoord.of(values), ErrorCode.InvalidCoordinate);
    },
  );

  it.each([Number.MAX_SAFE_INTEGER + 1, Number.MIN_SAFE_INTEGER - 1])(
    'should_throw_invalid_coordinate_when_a_component_is_an_unsafe_integer (%s)',
    (value) => {
      // Arrange
      const values = [value, 0];
      // Act + Assert
      expectCode(() => RawCoord.of(values), ErrorCode.InvalidCoordinate);
    },
  );

  it.each([Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER])(
    'should_preserve_coordinate_when_components_are_safe_boundary_integers (%s)',
    (value) => {
      // Arrange
      const coordinate = RawCoord.of([value, 0]);
      const offset = RawCoord.of([0, 0]);
      // Act
      const translated = coordinate.translated(offset);
      // Assert
      expect(translated.equals(coordinate)).toBe(true);
      expect(coordinate.equals(RawCoord.of([value, 0]))).toBe(true);
      expect(coordinate.size().equals(Count.of(2))).toBe(true);
    },
  );

  it.each([
    [Number.MAX_SAFE_INTEGER, 1],
    [Number.MIN_SAFE_INTEGER, -1],
  ])(
    'should_throw_invalid_coordinate_when_translation_exceeds_safe_integer_range (%s, %s)',
    (value, step) => {
      // Arrange
      const coordinate = RawCoord.of([value, 0]);
      const offset = RawCoord.of([step, 0]);
      // Act + Assert
      expectCode(
        () => coordinate.translated(offset),
        ErrorCode.InvalidCoordinate,
      );
      expect(coordinate.equals(RawCoord.of([value, 0]))).toBe(true);
      expect(offset.equals(RawCoord.of([step, 0]))).toBe(true);
    },
  );

  it('should_keep_coordinate_value_when_input_array_changes', () => {
    // Arrange
    const input = [-2, 1, 0];
    const coordinate = RawCoord.of(input);
    // Act
    input[0] = 9;
    // Assert
    expect(coordinate.equals(RawCoord.of([-2, 1, 0]))).toBe(true);
    expect(coordinate.size().equals(Count.of(3))).toBe(true);
    expect(coordinate.equals(RawCoord.of([-2, 1]))).toBe(false);
  });

  it.each([
    [0.5, 0],
    [NaN, 0],
    [Infinity, 0],
  ])(
    'should_throw_invalid_coordinate_when_a_component_is_not_an_integer (%j)',
    (...values) => {
      // Arrange + Act + Assert
      expectCode(() => RawCoord.of(values), ErrorCode.InvalidCoordinate);
    },
  );

  it('should_translate_without_mutation_when_dimensions_match', () => {
    // Arrange
    const origin = RawCoord.of([-1, 2]);
    const offset = RawCoord.of([2, -1]);
    // Act
    const result = origin.translated(offset);
    // Assert
    expect(result.equals(RawCoord.of([1, 1]))).toBe(true);
    expect(origin.equals(RawCoord.of([-1, 2]))).toBe(true);
    expect(offset.equals(RawCoord.of([2, -1]))).toBe(true);
  });

  it('should_throw_invalid_coordinate_when_translation_dimensions_differ', () => {
    // Arrange
    const coordinate = RawCoord.of([0, 0]);
    // Act + Assert
    expectCode(
      () => coordinate.translated(RawCoord.of([1])),
      ErrorCode.InvalidCoordinate,
    );
  });

  it('should_throw_invalid_board_when_cells_are_empty', () => {
    // Arrange + Act + Assert
    expectCode(() => board('hex-axial', []), ErrorCode.InvalidBoard);
  });

  it('should_throw_invalid_board_when_distinct_instances_have_equal_coordinates', () => {
    // Arrange + Act + Assert
    expectCode(
      () =>
        board('hex-axial', [
          [0, 0],
          [0, 0],
        ]),
      ErrorCode.InvalidBoard,
    );
  });

  it('should_keep_board_cells_when_input_array_changes', () => {
    // Arrange
    const input = [RawCoord.of([0, 0])];
    const definition = BoardDefinition.of(TopologyId.of('hex-axial'), input);
    // Act
    input.push(RawCoord.of([9, 9]));
    // Assert
    expect(definition.cells).toHaveLength(1);
    expect(Object.isFrozen(definition.cells)).toBe(true);
    expect(definition.cells[0].equals(RawCoord.of([0, 0]))).toBe(true);
  });

  it('should_keep_typed_fields_when_level_is_created', () => {
    // Arrange
    const definition = board('hex-axial', [
      [0, 0],
      [1, 0],
    ]);
    const section = new FakeSection();
    // Act
    const model = level({ board: definition, section });
    // Assert
    expect(model.id.equals(LevelId.of('fake-001'))).toBe(true);
    expect(model.gameId.equals(GameId.of('fake-game'))).toBe(true);
    expect(model.order.equals(LevelNumber.of(1))).toBe(true);
    expect(model.schemaVersion.equals(SchemaVersion.of(1))).toBe(true);
    expect(
      model.name.equals(LocalizedName.of('Nivel de prueba', 'Test level')),
    ).toBe(true);
    expect(model.board).toBe(definition);
    expect(model.section).toBe(section);
  });
});

describe('Topology and common validation (FR-010, issue #28)', () => {
  it('should_return_six_axial_neighbors_when_hex_topology_is_used', () => {
    // Arrange
    const topology = new HexAxialTopology();
    // Act
    const neighbors = topology.neighbors(RawCoord.of([2, -1]));
    // Assert
    expect(topology.id().equals(TopologyId.of('hex-axial'))).toBe(true);
    expect(topology.coordinateSize().equals(Count.of(2))).toBe(true);
    expect(neighbors).toHaveLength(6);
    for (const expected of [
      [3, -1],
      [3, -2],
      [2, -2],
      [1, -1],
      [1, 0],
      [2, 0],
    ]) {
      expect(
        neighbors.filter((cell) => cell.equals(RawCoord.of(expected))),
      ).toHaveLength(1);
    }
  });

  it('should_throw_unknown_game_when_no_section_validator_is_registered', () => {
    // Arrange
    const validator = new LevelValidator();
    // Act + Assert
    expectCode(() => validator.validate(level()), ErrorCode.UnknownGame);
    expectCode(
      () => validator.sectionKeyOf(GameId.of('fake-game')),
      ErrorCode.UnknownGame,
    );
  });

  it('should_throw_wrong_level_section_before_delegating_when_key_does_not_match', () => {
    // Arrange
    const { validator, section } = configured();
    const model = level({ section: new FakeSection(SectionKey.of('other')) });
    // Act + Assert
    expectCode(() => validator.validate(model), ErrorCode.WrongLevelSection);
    expect(section.levels).toEqual([]);
  });

  it('should_throw_unknown_topology_before_delegating_when_geometry_is_not_registered', () => {
    // Arrange
    const { validator, section } = configured();
    const model = level({ board: board('unknown', [[0, 0]]) });
    // Act + Assert
    expectCode(() => validator.validate(model), ErrorCode.UnknownTopology);
    expect(section.levels).toEqual([]);
  });

  it('should_throw_invalid_board_before_delegating_when_one_coordinate_has_wrong_size', () => {
    // Arrange
    const { validator, section } = configured();
    const model = level({ board: board('hex-axial', [[0, 0], [1]]) });
    // Act + Assert
    expectCode(() => validator.validate(model), ErrorCode.InvalidBoard);
    expect(section.levels).toEqual([]);
  });

  it.each([
    ['hex-axial', [[0, 0]], new HexAxialTopology()],
    [
      'hex-axial',
      [
        [2, 0],
        [0, 0],
        [1, 0],
      ],
      new HexAxialTopology(),
    ],
    [
      'hex-axial',
      [
        [0, 0],
        [1, -1],
      ],
      new HexAxialTopology(),
    ],
    ['fake-line', [[2], [0], [1]], new FakeLineTopology()],
  ] as const)(
    'should_delegate_when_board_is_connected (%s, %j)',
    (id, cells, topology) => {
      // Arrange
      const { validator, section } = configured();
      validator.registerTopology(topology);
      const model = level({ board: board(id, cells) });
      // Act
      validator.validate(model);
      // Assert
      expect(section.levels).toEqual([model]);
    },
  );

  it.each([
    [
      'hex-axial',
      [
        [0, 0],
        [2, 0],
      ],
      new HexAxialTopology(),
    ],
    [
      'hex-axial',
      [
        [0, 0],
        [1, 1],
      ],
      new HexAxialTopology(),
    ],
    ['fake-line', [[0], [2]], new FakeLineTopology()],
  ] as const)(
    'should_throw_board_not_connected_when_cells_form_islands (%s, %j)',
    (id, cells, topology) => {
      // Arrange
      const { validator, section } = configured();
      validator.registerTopology(topology);
      const model = level({ board: board(id, cells) });
      // Act + Assert
      expectCode(() => validator.validate(model), ErrorCode.BoardNotConnected);
      expect(section.levels).toEqual([]);
    },
  );

  it('should_find_registered_section_when_game_id_is_an_equal_distinct_instance', () => {
    // Arrange
    const { validator, section } = configured();
    const model = level({ gameId: GameId.of('fake-game') });
    // Act
    validator.validate(model);
    // Assert
    expect(
      validator
        .sectionKeyOf(GameId.of('fake-game'))
        .equals(SectionKey.of('fake')),
    ).toBe(true);
    expect(section.levels).toEqual([model]);
  });
});
