import { randomUUID } from 'node:crypto';
import { createConnection, type Connection, type Model } from 'mongoose';
import fitExample from '../../../docs/specs/levels/hexa-fit.example.json' with { type: 'json' };
import sortExample from '../../../docs/specs/levels/hexa-sort.example.json' with { type: 'json' };
import {
  LEVEL_MODEL,
  LevelSchema,
  type LevelDocument,
} from '../../../src/adapters/persistence/mongo/level.schema.js';
import type { ILevelRepository } from '../../../src/application/ports/level-repository.js';
import { GameId } from '../../../src/domain/game/game-id.js';
import {
  FitPiece,
  FitStarThreshold,
  HexaFitSection,
  PieceId,
} from '../../../src/domain/level/fit/hexa-fit-section.js';
import { LevelId } from '../../../src/domain/level/level-id.js';
import { RawCoord } from '../../../src/domain/level/raw-coord.js';
import {
  ColorId,
  HexaSortSection,
  Seed,
} from '../../../src/domain/level/sort/hexa-sort-section.js';
import { Count } from '../../../src/domain/shared/count.js';
import { DomainError } from '../../../src/domain/shared/domain-error.js';
import { ErrorCode } from '../../../src/domain/shared/error-code.js';
import { Optional } from '../../../src/domain/shared/optional.js';
import { createLevelRepository } from '../../../src/infrastructure/levels/create-level-repository.js';
import { levelFrom } from '../../domain/level/level-fixture.js';

function fit(id = 'fit-003', order = 3) {
  return levelFrom(
    { ...fitExample, id, order },
    HexaFitSection.of(
      fitExample.fit.pieces.map(({ id: pieceId, cells }) =>
        FitPiece.of(
          PieceId.of(pieceId),
          cells.map((cell) => RawCoord.of(cell)),
        ),
      ),
      fitExample.fit.stars.map(({ stars, maxMoves, maxSeconds }) =>
        FitStarThreshold.of(
          Count.of(stars),
          Count.of(maxMoves),
          Count.of(maxSeconds),
        ),
      ),
    ),
  );
}

function sort(id = 'sort-001', order = 1, seed = Optional.empty<Seed>()) {
  return levelFrom(
    { ...sortExample, id, order },
    HexaSortSection.of(
      Count.of(sortExample.sort.goal.clearedStacks),
      sortExample.sort.colors.map((color) => ColorId.of(color)),
      Count.of(sortExample.sort.stackHeight.min),
      Count.of(sortExample.sort.stackHeight.max),
      seed,
    ),
  );
}

function fitWithInvalidPieceArea(id: string) {
  return levelFrom(
    { ...fitExample, id },
    HexaFitSection.of(
      [FitPiece.of(PieceId.of('one-cell'), [RawCoord.of([0, 0])])],
      [],
    ),
  );
}

describe('MongoLevelRepository (integration, issue #30)', () => {
  let connection: Connection;
  let model: Model<LevelDocument>;
  let repository: ILevelRepository;

  beforeAll(async () => {
    connection = await createConnection(process.env.MONGODB_URI ?? '', {
      dbName: `levels-${randomUUID()}`,
    }).asPromise();
    model = connection.model<LevelDocument>(LEVEL_MODEL, LevelSchema);
    await model.init();
    repository = createLevelRepository(model);
  });

  beforeEach(async () => {
    await model.deleteMany({}).exec();
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await connection.close();
  });

  it.each([
    ['fit', () => fit()],
    ['sort_without_seed', () => sort()],
    ['sort_with_zero', () => sort('sort-001', 1, Optional.of(Seed.of(0)))],
  ] as const)(
    'should_restore_typed_level_when_round_tripping_%s',
    async (_, makeLevel) => {
      // Arrange
      const level = makeLevel();

      // Act
      await repository.create(level);
      const found = await repository.findById(level.id);

      // Assert
      expect(found.isPresent()).toBe(true);
      expect(found.get()).toStrictEqual(level);
      const document = await model
        .findById(level.id.toString())
        .lean<LevelDocument>()
        .exec();
      expect(document?.section.key).toBe(level.section.sectionKey().toString());
      if (
        level.section instanceof HexaSortSection &&
        level.section.seed.isPresent()
      ) {
        expect(document?.section.payload).toHaveProperty('seed', 0);
      } else if (level.section instanceof HexaSortSection) {
        expect(document?.section.payload).not.toHaveProperty('seed');
      }
    },
  );

  it('should_return_empty_when_the_id_or_game_has_no_levels', async () => {
    // Arrange
    const id = LevelId.of('missing');
    const game = GameId.of('hexa-fit');

    // Act
    const found = await repository.findById(id);
    const listed = await repository.list(game);

    // Assert
    expect(found.isPresent()).toBe(false);
    expect(listed).toEqual([]);
  });

  it('should_list_only_the_requested_game_when_levels_are_inserted_out_of_order', async () => {
    // Arrange
    const first = fit('fit-first', 1);
    const second = fit('fit-second', 2);
    await repository.create(second);
    await repository.create(sort());
    await repository.create(first);

    // Act
    const listed = await repository.list(first.gameId);

    // Assert
    expect(listed).toStrictEqual([first, second]);
  });

  it('should_preserve_original_when_another_game_tries_to_create_the_same_id', async () => {
    // Arrange
    const original = fit('shared-level');
    await repository.create(original);

    // Act
    const create = repository.create(sort('shared-level'));

    // Assert
    await expect(create).rejects.toThrow(
      new DomainError(ErrorCode.LevelIdTaken),
    );
    expect((await repository.findById(original.id)).get()).toStrictEqual(
      original,
    );
    expect(await model.countDocuments().exec()).toBe(1);
  });

  it('should_reject_a_unique_id_when_its_order_is_occupied_in_the_same_game', async () => {
    // Arrange
    const first = fit('first', 1);
    const conflicting = fit('second', 1);
    await repository.create(first);

    // Act
    const create = repository.create(conflicting);

    // Assert
    await expect(create).rejects.toThrow(
      new DomainError(ErrorCode.LevelOrderTaken),
    );
    expect((await repository.findById(conflicting.id)).isPresent()).toBe(false);
    expect((await repository.findById(first.id)).get()).toStrictEqual(first);
  });

  it('should_allow_same_order_when_games_differ', async () => {
    // Arrange
    const first = fit('fit-first', 1);
    const second = sort();
    await repository.create(first);

    // Act
    await repository.create(second);

    // Assert
    expect((await repository.findById(first.id)).get()).toStrictEqual(first);
    expect((await repository.findById(second.id)).get()).toStrictEqual(second);
  });

  it('should_persist_one_winner_when_creates_compete_for_the_same_order', async () => {
    // Arrange
    const first = fit('candidate-a', 1);
    const second = fit('candidate-b', 1);

    // Act
    const outcomes = await Promise.allSettled([
      repository.create(first),
      repository.create(second),
    ]);

    // Assert
    expect(
      outcomes.filter((outcome) => outcome.status === 'fulfilled'),
    ).toHaveLength(1);
    const failures = outcomes.filter(
      (outcome) => outcome.status === 'rejected',
    );
    expect(failures).toHaveLength(1);
    expect(failures[0].reason).toEqual(
      new DomainError(ErrorCode.LevelOrderTaken),
    );
    const winner = outcomes[0].status === 'fulfilled' ? first : second;
    expect(await repository.list(first.gameId)).toStrictEqual([winner]);
  });

  it('should_replace_all_fields_when_a_known_level_loses_its_optional_seed', async () => {
    // Arrange
    const original = sort('replace-sort', 1, Optional.of(Seed.of(0)));
    const replacement = sort('replace-sort', 2);
    await repository.create(original);

    // Act
    const changed = await repository.replace(replacement);
    const identical = await repository.replace(replacement);

    // Assert
    expect(changed).toBe(true);
    expect(identical).toBe(true);
    expect((await repository.findById(replacement.id)).get()).toStrictEqual(
      replacement,
    );
    expect(await model.countDocuments().exec()).toBe(1);
  });

  it('should_not_insert_when_replacing_a_missing_level', async () => {
    // Arrange
    const level = fit();

    // Act
    const result = await repository.replace(level);

    // Assert
    expect(result).toBe(false);
    expect((await repository.findById(level.id)).isPresent()).toBe(false);
  });

  it('should_not_store_a_level_when_create_receives_an_invalid_piece_area', async () => {
    // Arrange
    const invalid = fitWithInvalidPieceArea('invalid-fit');

    // Act
    const create = repository.create(invalid);

    // Assert
    await expect(create).rejects.toThrow(
      new DomainError(ErrorCode.InvalidFitSection),
    );
    expect(await model.countDocuments().exec()).toBe(0);
  });

  it('should_leave_the_document_unchanged_when_replace_receives_an_invalid_piece_area', async () => {
    // Arrange
    const original = fit();
    await repository.create(original);
    const id = original.id.toString();
    const before = await model.findById(id).lean<LevelDocument>().exec();

    // Act
    const replace = repository.replace(fitWithInvalidPieceArea(id));

    // Assert
    await expect(replace).rejects.toThrow(
      new DomainError(ErrorCode.InvalidFitSection),
    );
    expect(before).not.toBeNull();
    expect(await model.findById(id).lean<LevelDocument>().exec()).toStrictEqual(
      before,
    );
    expect(await model.countDocuments().exec()).toBe(1);
  });

  it('should_preserve_both_levels_when_replacement_uses_an_occupied_order', async () => {
    // Arrange
    const first = fit('first', 1);
    const second = fit('second', 2);
    await repository.create(first);
    await repository.create(second);

    // Act
    const replace = repository.replace(fit('second', 1));

    // Assert
    await expect(replace).rejects.toThrow(
      new DomainError(ErrorCode.LevelOrderTaken),
    );
    expect(await repository.list(first.gameId)).toStrictEqual([first, second]);
  });

  it('should_report_removal_only_when_the_level_exists', async () => {
    // Arrange
    const level = fit();
    await repository.create(level);

    // Act
    const removed = await repository.delete(level.id);
    const removedAgain = await repository.delete(level.id);

    // Assert
    expect(removed).toBe(true);
    expect(removedAgain).toBe(false);
    expect((await repository.findById(level.id)).isPresent()).toBe(false);
  });

  it.each([
    { key: 'sort', payload: {} },
    { key: 'fit', payload: { pieces: [], stars: [] } },
  ])(
    'should_reject_rehydration_when_a_stored_section_is_invalid_%#',
    async (section) => {
      // Arrange
      const level = fit();
      await repository.create(level);
      await model
        .updateOne({ _id: level.id.toString() }, { $set: { section } })
        .exec();

      // Act
      const read = repository.findById(level.id);

      // Assert
      await expect(read).rejects.toThrow('Invalid stored level');
      expect(await model.countDocuments().exec()).toBe(1);
    },
  );

  it('should_persist_one_winner_when_creates_compete_for_the_same_id', async () => {
    // Arrange
    const levels = Array.from({ length: 3 }, (_, index) =>
      fit('same-id', index + 1),
    );

    // Act
    const results = await Promise.allSettled(
      levels.map((level) => repository.create(level)),
    );

    // Assert
    const winnerIndex = results.findIndex(
      (result) => result.status === 'fulfilled',
    );
    expect(winnerIndex).toBeGreaterThanOrEqual(0);
    const failures = results.filter((result) => result.status === 'rejected');
    expect(failures).toHaveLength(2);
    for (const failure of failures) {
      expect(failure.reason).toEqual(new DomainError(ErrorCode.LevelIdTaken));
    }
    const winner = levels[winnerIndex];
    expect((await repository.findById(winner.id)).get()).toStrictEqual(winner);
    expect(await model.countDocuments().exec()).toBe(1);
  });

  it('should_preserve_the_rejected_document_when_replacements_compete_for_one_order', async () => {
    // Arrange
    const originals = [fit('first', 1), fit('second', 2)];
    for (const level of originals) await repository.create(level);
    const before = await model
      .find()
      .sort({ _id: 1 })
      .lean<LevelDocument[]>()
      .exec();
    const replacements = [fit('first', 3), fit('second', 3)];

    // Act
    const results = await Promise.allSettled(
      replacements.map((level) => repository.replace(level)),
    );

    // Assert
    const loserIndex = results.findIndex(
      (result) => result.status === 'rejected',
    );
    const winnerIndex = results.findIndex(
      (result) => result.status === 'fulfilled',
    );
    expect(loserIndex).toBeGreaterThanOrEqual(0);
    expect(winnerIndex).toBeGreaterThanOrEqual(0);
    expect(results[loserIndex]).toMatchObject({
      status: 'rejected',
      reason: new DomainError(ErrorCode.LevelOrderTaken),
    });
    expect(results[winnerIndex]).toEqual({ status: 'fulfilled', value: true });
    const loser = await model
      .findById(originals[loserIndex].id.toString())
      .lean<LevelDocument>()
      .exec();
    expect(loser).toStrictEqual(before[loserIndex]);
    expect(await repository.list(originals[0].gameId)).toStrictEqual([
      originals[loserIndex],
      replacements[winnerIndex],
    ]);
  });
});
