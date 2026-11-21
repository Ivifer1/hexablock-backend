import type { Level } from '../../domain/level/level.js';
import type { LevelId } from '../../domain/level/level-id.js';
import { DomainError } from '../../domain/shared/domain-error.js';
import { ErrorCode } from '../../domain/shared/error-code.js';
import type { ILevelRepository } from '../ports/level-repository.js';

export class GetLevelUseCase {
  constructor(private readonly levels: ILevelRepository) {}

  async execute(id: LevelId): Promise<Level> {
    const level = await this.levels.findById(id);
    if (!level.isPresent()) {
      throw new DomainError(ErrorCode.LevelNotFound);
    }
    return level.get();
  }
}
