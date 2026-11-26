import { GameId } from '../../../src/domain/game/game-id.js';
import { LevelId } from '../../../src/domain/level/level-id.js';
import { LevelProgress } from '../../../src/domain/progress/level-progress.js';
import { Progress } from '../../../src/domain/progress/progress.js';
import { Count } from '../../../src/domain/shared/count.js';
import { DomainError } from '../../../src/domain/shared/domain-error.js';
import { ErrorCode } from '../../../src/domain/shared/error-code.js';
import { UserId } from '../../../src/domain/user/user-id.js';

const player = () => UserId.of('player-1');
const game = () => GameId.of('hexa-fit');
const instant = () => new Date('2026-11-25T00:00:00.000Z');

function level(id: string, completed: boolean, stars: number, score: number) {
  return LevelProgress.of(
    LevelId.of(id),
    completed,
    Count.of(stars),
    Count.of(score),
  );
}

function levels(progress: Progress) {
  return progress.levels.map((row) => ({
    id: row.levelId.toString(),
    completed: row.completed,
    stars: row.stars.toNumber(),
    score: row.bestScore.toNumber(),
  }));
}

describe('Progress (UC-008)', () => {
  it('should_keep_the_correct_shape_when_progress_is_created', () => {
    // Arrange
    const scoreGame = GameId.of('hexa-lines');

    // Act
    const score = Progress.forScore(
      player(),
      scoreGame,
      Count.of(0),
      instant(),
    );
    const empty = Progress.forLevels(player(), game(), [], instant());

    // Assert
    expect(score.bestScore.get().toNumber()).toBe(0);
    expect(score.levels).toEqual([]);
    expect(empty.bestScore.isPresent()).toBe(false);
    expect(empty.levels).toEqual([]);
  });

  it('should_reject_progress_when_stars_are_out_of_range_or_level_ids_repeat', () => {
    // Arrange
    const duplicates = [
      level('fit-001', true, 1, 9),
      level('fit-001', true, 2, 8),
    ];

    // Act and assert
    const invalid = new DomainError(ErrorCode.InvalidProgress);
    expect(() => level('fit-001', true, 4, 0)).toThrow(invalid);
    expect(() =>
      Progress.forLevels(player(), game(), duplicates, instant()),
    ).toThrow(invalid);
  });

  it('should_keep_independent_best_fields_when_progress_is_merged', () => {
    // Arrange
    const left = Progress.forLevels(
      player(),
      game(),
      [level('fit-001', true, 1, 120), level('fit-002', false, 0, 30)],
      instant(),
    );
    const right = Progress.forLevels(
      player(),
      game(),
      [level('fit-001', false, 3, 80), level('fit-003', true, 2, 40)],
      instant(),
    );
    const low = Progress.forScore(
      player(),
      GameId.of('hexa-lines'),
      Count.of(80),
      instant(),
    );
    const high = Progress.forScore(
      player(),
      GameId.of('hexa-lines'),
      Count.of(120),
      instant(),
    );

    // Act
    const merged = left.mergedWith(right);

    // Assert
    const expected = [
      { id: 'fit-001', completed: true, stars: 3, score: 120 },
      { id: 'fit-002', completed: false, stars: 0, score: 30 },
      { id: 'fit-003', completed: true, stars: 2, score: 40 },
    ];
    expect(levels(merged)).toHaveLength(3);
    expect(levels(merged)).toEqual(expect.arrayContaining(expected));
    expect(levels(right.mergedWith(left))).toEqual(
      expect.arrayContaining(expected),
    );
    expect(levels(merged.mergedWith(right))).toEqual(levels(merged));
    expect(levels(left)).toHaveLength(2);
    expect(low.mergedWith(high).bestScore.get().toNumber()).toBe(120);
    expect(high.mergedWith(low).bestScore.get().toNumber()).toBe(120);
  });

  it('should_reject_merge_when_identity_or_model_differs', () => {
    // Arrange
    const current = Progress.forLevels(player(), game(), [], instant());
    const candidates = [
      Progress.forLevels(UserId.of('another-user'), game(), [], instant()),
      Progress.forLevels(player(), GameId.of('hexa-sort'), [], instant()),
      Progress.forScore(player(), game(), Count.of(0), instant()),
    ];

    // Act and assert
    for (const other of candidates) {
      expect(() => current.mergedWith(other)).toThrow(
        new DomainError(ErrorCode.InvalidProgress),
      );
    }
  });

  it('should_keep_progress_unchanged_when_input_or_exposed_date_is_mutated', () => {
    // Arrange
    const date = instant();
    const input = [level('fit-001', false, 0, 0)];
    const progress = Progress.forLevels(player(), game(), input, date);

    // Act
    input.push(level('fit-002', true, 3, 7));
    date.setUTCFullYear(2000);
    progress.updatedAt.setUTCFullYear(2001);

    // Assert
    expect(progress.updatedAt).toEqual(instant());
    expect(progress.levels).toHaveLength(1);
    expect(Object.isFrozen(progress.levels)).toBe(true);
  });
});
