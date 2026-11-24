import type { Level } from '../../domain/level/level.js';
import { DomainError } from '../../domain/shared/domain-error.js';
import { ErrorCode } from '../../domain/shared/error-code.js';
import type { ILevelRepository } from '../ports/level-repository.js';
import type { ILevelWriteReadiness } from '../ports/level-write-readiness.js';

export class ReplaceLevelUseCase {
  constructor(
    private readonly levels: ILevelRepository,
    private readonly readiness: ILevelWriteReadiness,
  ) {}

  async execute(level: Level): Promise<Level> {
    await this.readiness.assertReady();
    if (!(await this.levels.replace(level))) {
      throw new DomainError(ErrorCode.LevelNotFound);
    }
    return level;
  }
}
