import type { User } from '../../domain/user/user.js';
import type { UserId } from '../../domain/user/user-id.js';

export type InitialAdministratorResult =
  | 'created'
  | 'administrator-exists'
  | 'username-taken'
  | 'identity-conflict'
  | 'username-index-not-ready';

export interface IInitialAdministratorRepository {
  firstAdministratorId(): UserId;
  createFirstAdministrator(user: User): Promise<InitialAdministratorResult>;
}
