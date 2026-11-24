import type { LevelId } from '../../domain/level/level-id.js';
import { DomainError } from '../../domain/shared/domain-error.js';
import { ErrorCode } from '../../domain/shared/error-code.js';
import type { ILevelRepository } from '../ports/level-repository.js';
import type { ILevelWriteReadiness } from '../ports/level-write-readiness.js';

export class DeleteLevelUseCase {
  constructor(
    private readonly levels: ILevelRepository,
    private readonly readiness: ILevelWriteReadiness,
  ) {}

  async execute(id: LevelId): Promise<void> {
    await this.readiness.assertReady();
    if (!(await this.levels.delete(id))) {
      throw new DomainError(ErrorCode.LevelNotFound);
    }
  }
}
