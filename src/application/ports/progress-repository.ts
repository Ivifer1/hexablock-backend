import type { GameId } from '../../domain/game/game-id.js';
import type { Progress } from '../../domain/progress/progress.js';
import type { Optional } from '../../domain/shared/optional.js';
import type { UserId } from '../../domain/user/user-id.js';

export interface IProgressRepository {
  find(userId: UserId, gameId: GameId): Promise<Optional<Progress>>;
  listForUser(userId: UserId): Promise<readonly Progress[]>;
  saveBest(snapshot: Progress): Promise<Progress>;
}
