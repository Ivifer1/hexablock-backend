import fitExample from '../../../docs/specs/levels/hexa-fit.example.json' with { type: 'json' };
import {
  FitPiece,
  FitStarThreshold,
  HexaFitSection,
  PieceId,
} from '../../../src/domain/level/fit/hexa-fit-section.js';
import { RawCoord } from '../../../src/domain/level/raw-coord.js';
import { SectionKey } from '../../../src/domain/level/section-key.js';
import { TopologyId } from '../../../src/domain/level/topology-id.js';
import type { IBoardTopology } from '../../../src/domain/level/topology/board-topology.js';
import { Count } from '../../../src/domain/shared/count.js';
import { DomainError } from '../../../src/domain/shared/domain-error.js';
import { ErrorCode } from '../../../src/domain/shared/error-code.js';
import { createLevelValidator } from '../../../src/infrastructure/levels/create-level-validator.js';
import { levelFrom, sparse } from './level-fixture.js';

function piece(id: string, cells: readonly (readonly number[])[]): FitPiece {
  return FitPiece.of(
    PieceId.of(id),
    cells.map((coord) => RawCoord.of(coord)),
  );
}

function threshold(
  stars: number,
  moves: number,
  seconds: number,
): FitStarThreshold {
  return FitStarThreshold.of(
    Count.of(stars),
    Count.of(moves),
    Count.of(seconds),
  );
}

class LineTopology implements IBoardTopology {
  id(): TopologyId {
    return TopologyId.of('test-line');
  }

  coordinateSize(): Count {
    return Count.of(1);
  }

  neighbors(cell: RawCoord): readonly RawCoord[] {
    return [
      cell.translated(RawCoord.of([-1])),
      cell.translated(RawCoord.of([1])),
    ];
  }
}

describe('Fit level sections (FR-010, issue #29)', () => {
  const singleCell = {
    ...fitExample,
    board: { ...fitExample.board, cells: [[0, 0]] },
  };

  it('should_accept_the_documented_fit_level_when_its_section_matches_the_board', () => {
    // Arrange
    const validator = createLevelValidator();
    const section = HexaFitSection.of(
      fitExample.fit.pieces.map(({ id, cells }) => piece(id, cells)),
      fitExample.fit.stars.map(({ stars, maxMoves, maxSeconds }) =>
        threshold(stars, maxMoves, maxSeconds),
      ),
    );

    // Act
    const validate = () => validator.validate(levelFrom(fitExample, section));

    // Assert
    expect(validate).not.toThrow();
  });

  it.each([
    ['empty', []],
    [
      'repeated_by_value',
      [
        { id: 'same', at: [[0, 0]] },
        { id: 'same', at: [[0, 0]] },
      ],
    ],
  ] as const)(
    'should_reject_fit_pieces_when_the_piece_list_is_%s',
    (_, pieces) => {
      // Arrange
      const validator = createLevelValidator();
      const fixture = {
        ...fitExample,
        board: {
          ...fitExample.board,
          cells: [
            [0, 0],
            [1, 0],
          ],
        },
      };

      // Act
      const validate = () =>
        validator.validate(
          levelFrom(
            fixture,
            HexaFitSection.of(
              pieces.map(({ id, at }) => piece(id, at)),
              [],
            ),
          ),
        );

      // Assert
      expect(validate).toThrow(new DomainError(ErrorCode.InvalidFitSection));
    },
  );

  it.each([
    { case: 'empty', cells: [] },
    {
      case: 'duplicated',
      cells: [
        [0, 0],
        [0, 0],
      ],
    },
    {
      case: 'missing_origin',
      cells: [
        [1, 0],
        [2, 0],
      ],
    },
    { case: 'misdimensioned', cells: [[0, 0], [1]] },
    {
      case: 'disconnected',
      cells: [
        [0, 0],
        [2, 0],
      ],
    },
  ])('should_reject_fit_piece_when_cells_are_$case', ({ cells }) => {
    // Arrange
    const validator = createLevelValidator();
    const fixture = {
      ...fitExample,
      board: {
        ...fitExample.board,
        cells: [
          [0, 0],
          [1, 0],
        ],
      },
    };
    const pieces =
      cells.length === 0
        ? [
            { id: 'empty', cells },
            {
              id: 'valid',
              cells: [
                [0, 0],
                [1, 0],
              ],
            },
          ]
        : [{ id: 'test', cells }];

    // Act
    const validate = () =>
      validator.validate(
        levelFrom(
          fixture,
          HexaFitSection.of(
            pieces.map((entry) => piece(entry.id, entry.cells)),
            [],
          ),
        ),
      );

    // Assert
    expect(validate).toThrow(new DomainError(ErrorCode.InvalidFitSection));
  });

  it('should_reject_fit_section_when_piece_area_differs_from_board_area', () => {
    // Arrange
    const validator = createLevelValidator();
    const section = HexaFitSection.of([piece('p1', [[0, 0]])], []);

    // Act
    const validate = () => validator.validate(levelFrom(fitExample, section));

    // Assert
    expect(validate).toThrow(new DomainError(ErrorCode.InvalidFitSection));
  });

  it.each([
    { case: 'empty', entries: [] },
    { case: 'one_threshold', entries: [[2, 6, 90]] },
    {
      case: 'two_ordered_thresholds',
      entries: [
        [3, 3, 30],
        [2, 6, 90],
      ],
    },
    {
      case: 'equal_limits',
      entries: [
        [3, 3, 30],
        [2, 3, 30],
      ],
    },
  ])('should_accept_fit_section_when_stars_has_$case', ({ entries }) => {
    // Arrange
    const validator = createLevelValidator();
    const stars = entries.map(([award, moves, seconds]) =>
      threshold(award, moves, seconds),
    );

    // Act
    const validate = () =>
      validator.validate(
        levelFrom(
          singleCell,
          HexaFitSection.of([piece('p1', [[0, 0]])], stars),
        ),
      );

    // Assert
    expect(validate).not.toThrow();
  });

  it.each([
    { case: 'an_invalid_award', entries: [[1, 2, 3]] },
    {
      case: 'a_duplicate_award',
      entries: [
        [3, 3, 30],
        [3, 6, 90],
      ],
    },
    {
      case: 'three_thresholds',
      entries: [
        [3, 3, 30],
        [2, 6, 90],
        [2, 6, 90],
      ],
    },
    { case: 'zero_moves', entries: [[3, 0, 30]] },
    { case: 'zero_seconds', entries: [[3, 3, 0]] },
    {
      case: 'reversed_awards',
      entries: [
        [2, 6, 90],
        [3, 3, 30],
      ],
    },
    {
      case: 'more_moves_for_three_stars',
      entries: [
        [3, 7, 30],
        [2, 6, 90],
      ],
    },
    {
      case: 'more_seconds_for_three_stars',
      entries: [
        [3, 3, 91],
        [2, 6, 90],
      ],
    },
  ])('should_reject_fit_section_when_stars_has_$case', ({ entries }) => {
    // Arrange
    const validator = createLevelValidator();

    // Act
    const validate = () =>
      validator.validate(
        levelFrom(
          singleCell,
          HexaFitSection.of(
            [piece('p1', [[0, 0]])],
            entries.map(([award, moves, seconds]) =>
              threshold(award, moves, seconds),
            ),
          ),
        ),
      );

    // Assert
    expect(validate).toThrow(new DomainError(ErrorCode.InvalidFitSection));
  });

  it.each([
    { cells: [[0], [1]], accepted: true },
    { cells: [[0], [2]], accepted: false },
  ])(
    'should_follow_the_resolved_topology_when_fit_uses_a_line_board_%#',
    ({ cells, accepted }) => {
      // Arrange
      const validator = createLevelValidator();
      validator.registerTopology(new LineTopology());
      const fixture = {
        ...fitExample,
        board: { topology: 'test-line', cells: [[0], [1]] },
      };
      const section = HexaFitSection.of([piece('p1', cells)], []);

      // Act
      const validate = () => validator.validate(levelFrom(fixture, section));

      // Assert
      if (accepted) {
        expect(validate).not.toThrow();
      } else {
        expect(validate).toThrow(new DomainError(ErrorCode.InvalidFitSection));
      }
    },
  );
  it.each([{ fixture: fitExample, key: 'fit' }])(
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
});

describe('Level section collections (FR-010, issue #29)', () => {
  it.each([
    [
      'pieces',
      () => HexaFitSection.of(sparse<FitPiece>(1), []),
      ErrorCode.InvalidFitSection,
    ],
    [
      'cells',
      () => FitPiece.of(PieceId.of('p1'), sparse<RawCoord>(1)),
      ErrorCode.InvalidFitSection,
    ],
    [
      'thresholds',
      () =>
        HexaFitSection.of([piece('p1', [[0, 0]])], sparse<FitStarThreshold>(1)),
      ErrorCode.InvalidFitSection,
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
