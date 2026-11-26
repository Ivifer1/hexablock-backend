import type { UserId } from '../../domain/user/user-id.js';
import type { IProgressRepository } from '../ports/progress-repository.js';
import {
  toProgressView,
  type ProgressView,
} from '../progress/progress-view.js';

export class ListPlayerProgressUseCase {
  constructor(private readonly progress: IProgressRepository) {}

  async execute(user: UserId): Promise<readonly ProgressView[]> {
    return (await this.progress.listForUser(user)).map(toProgressView);
  }
}
