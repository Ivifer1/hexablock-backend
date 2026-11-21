import type { ILevelRepository } from '../../src/application/ports/level-repository.js';
import { GetLevelUseCase } from '../../src/application/use-cases/get-level.use-case.js';
import { ListLevelsUseCase } from '../../src/application/use-cases/list-levels.use-case.js';
import { GameId } from '../../src/domain/game/game-id.js';
import { LevelId } from '../../src/domain/level/level-id.js';
import { ErrorCode } from '../../src/domain/shared/error-code.js';
import { Optional } from '../../src/domain/shared/optional.js';
import { createLevelValidator } from '../../src/infrastructure/levels/create-level-validator.js';

function fakeRepository() {
  return {
    list: vi.fn<ILevelRepository['list']>().mockResolvedValue([]),
    findById: vi
      .fn<ILevelRepository['findById']>()
      .mockResolvedValue(Optional.empty()),
    create: vi.fn<ILevelRepository['create']>(),
    replace: vi.fn<ILevelRepository['replace']>(),
    delete: vi.fn<ILevelRepository['delete']>(),
  } satisfies ILevelRepository;
}

describe('Public level use cases (UC-004)', () => {
  it('should_not_query_repository_when_game_does_not_support_levels', async () => {
    // Arrange
    const repository = fakeRepository();
    const useCase = new ListLevelsUseCase(repository, createLevelValidator());

    // Act
    const read = useCase.execute(GameId.of('hexa-lines'));

    // Assert
    await expect(read).rejects.toMatchObject({ code: ErrorCode.UnknownGame });
    expect(repository.list).not.toHaveBeenCalled();
  });

  it('should_propagate_unexpected_failure_when_repository_read_fails', async () => {
    // Arrange
    const repository = fakeRepository();
    const failure = new Error('storage unavailable');
    repository.list.mockRejectedValue(failure);
    repository.findById.mockRejectedValue(failure);

    // Act
    const listed = new ListLevelsUseCase(
      repository,
      createLevelValidator(),
    ).execute(GameId.of('hexa-fit'));
    const found = new GetLevelUseCase(repository).execute(
      LevelId.of('fit-001'),
    );

    // Assert
    await expect(listed).rejects.toBe(failure);
    await expect(found).rejects.toBe(failure);
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.replace).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
