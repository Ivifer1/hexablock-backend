import { GameId } from '../../../src/domain/game/game-id.js';
import { LevelId } from '../../../src/domain/level/level-id.js';
import { AchievedAt } from '../../../src/domain/score/achieved-at.js';
import { PersonalBest } from '../../../src/domain/score/personal-best.js';
import { RankingScope } from '../../../src/domain/score/ranking-scope.js';
import { Score } from '../../../src/domain/score/score.js';
import { DomainError } from '../../../src/domain/shared/domain-error.js';
import { UserId } from '../../../src/domain/user/user-id.js';

const firstTime = '2026-11-25T12:00:00.000Z';
const nextTime = '2026-11-25T12:01:00.000Z';
const player = UserId.of('player-1');
const game = GameId.of('fake-game');
const scope = RankingScope.forGame(game);

function firstRecord(score: number): PersonalBest {
  return PersonalBest.record(
    player,
    scope,
    Score.of(score),
    AchievedAt.of(new Date(firstTime)),
  );
}

describe('UC-010 PersonalBest', () => {
  it('should_keep_zero_and_its_time_when_it_is_the_first_score', () => {
    // Arrange
    const score = Score.of(0);
    const achievedAt = AchievedAt.of(new Date(firstTime));

    // Act
    const best = PersonalBest.record(player, scope, score, achievedAt);

    // Assert
    expect(best.score.toNumber()).toBe(0);
    expect(best.achievedAt.toDate().toISOString()).toBe(firstTime);
    expect(best.scope.levelId.isPresent()).toBe(false);
  });

  it.each([
    { condition: 'equal', score: 120 },
    { condition: 'lower', score: 80 },
  ])(
    'should_keep_the_original_score_and_time_when_the_attempt_is_$condition',
    ({ score }) => {
      // Arrange
      const best = firstRecord(120);
      const attempt = Score.of(score);
      const attemptedAt = AchievedAt.of(new Date(nextTime));

      // Act
      const retained = best.consider(attempt, attemptedAt);

      // Assert
      expect(retained).toBe(best);
      expect(retained.score.toNumber()).toBe(120);
      expect(retained.achievedAt.toDate().toISOString()).toBe(firstTime);
    },
  );

  it('should_preserve_ranking_and_player_when_the_score_improves', () => {
    // Arrange
    const level = LevelId.of('demo-001');
    const scoped = RankingScope.forLevel(game, level);
    const best = PersonalBest.record(
      player,
      scoped,
      Score.of(120),
      AchievedAt.of(new Date(firstTime)),
    );

    // Act
    const improved = best.consider(
      Score.of(130),
      AchievedAt.of(new Date(nextTime)),
    );

    // Assert
    expect(improved).not.toBe(best);
    expect(improved.playerId).toBe(player);
    expect(improved.scope).toBe(scoped);
    expect(improved.scope.gameId).toBe(game);
    expect(improved.scope.levelId.get()).toBe(level);
    expect(improved.score.toNumber()).toBe(130);
    expect(improved.achievedAt.toDate().toISOString()).toBe(nextTime);
    expect(best.score.toNumber()).toBe(120);
    expect(best.achievedAt.toDate().toISOString()).toBe(firstTime);
  });

  it('should_preserve_the_achievement_time_when_input_and_output_dates_are_mutated', () => {
    // Arrange
    const input = new Date(firstTime);
    const at = AchievedAt.of(input);

    // Act
    input.setTime(0);
    at.toDate().setTime(1);

    // Assert
    expect(at.toDate().toISOString()).toBe(firstTime);
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'should_reject_an_invalid_score_when_given_%s',
    (value) => {
      expect(() => Score.of(value)).toThrow(DomainError);
    },
  );
});
