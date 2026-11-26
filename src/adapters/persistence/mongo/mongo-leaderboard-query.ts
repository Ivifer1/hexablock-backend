import type { mongo } from 'mongoose';
import type { ILeaderboardQuery, LeaderboardCandidate } from '../../../application/ports/leaderboard-query.js';
import type { RankingScope } from '../../../domain/score/ranking-scope.js';
import type { Count } from '../../../domain/shared/count.js';
import { Username } from '../../../domain/user/username.js';
import { PersonalBestMapper } from './personal-best.mapper.js';
import { PERSONAL_BEST_COLLECTION, PERSONAL_BEST_COLLATION, type PersonalBestDocument } from './personal-best.schema.js';
import { USER_COLLECTION, type UserDocument } from './user.schema.js';

export class MongoLeaderboardQuery implements ILeaderboardQuery {
  constructor(private readonly db: mongo.Db) {}

  async read(scope: RankingScope, limit: Count): Promise<readonly LeaderboardCandidate[]> {
    if (limit.toNumber() < 1 || limit.toNumber() > 100) throw new Error('Invalid leaderboard limit');
    const levelId = scope.levelId.isPresent() ? scope.levelId.get().toString() : null;
    const rows = await this.db.collection<PersonalBestDocument>(PERSONAL_BEST_COLLECTION)
      .find({ gameId: scope.gameId.toString(), levelId: { $eq: levelId, $exists: true } }, { collation: PERSONAL_BEST_COLLATION, readPreference: 'primary' })
      .sort({ score: -1, achievedAt: 1, userId: 1 }).limit(limit.toNumber()).toArray();
    if (rows.length === 0) return [];
    const records = rows.map(row => PersonalBestMapper.toDomain(row));
    const users = await this.db.collection<UserDocument>(USER_COLLECTION)
      .find({ _id: { $in: records.map(record => record.playerId.toString()) } }, { projection: { _id: 1, username: 1 }, collation: PERSONAL_BEST_COLLATION, readPreference: 'primary' }).toArray();
    const names = new Map(users.map(user => [user._id, user.username]));
    return records.map(record => {
      const rawName = names.get(record.playerId.toString());
      if (typeof rawName !== 'string') throw new Error('Invalid stored leaderboard username');
      try {
        return { username: Username.of(rawName), score: record.score, achievedAt: record.achievedAt };
      } catch (cause) {
        throw new Error('Invalid stored leaderboard username', { cause });
      }
    });
  }
}
