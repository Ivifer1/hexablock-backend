import type { Level } from '../../domain/level/level.js';
import type { ILevelRepository } from '../ports/level-repository.js';
import type { ILevelWriteReadiness } from '../ports/level-write-readiness.js';

export class CreateLevelUseCase {
  constructor(
    private readonly levels: ILevelRepository,
    private readonly readiness: ILevelWriteReadiness,
  ) {}

  async execute(level: Level): Promise<Level> {
    await this.readiness.assertReady();
    await this.levels.create(level);
    return level;
  }
}
