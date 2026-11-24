import type { Model } from 'mongoose';
import type { ILevelWriteReadiness } from '../../../application/ports/level-write-readiness.js';
import type { LevelDocument } from './level.schema.js';

export class MongoLevelWriteReadiness implements ILevelWriteReadiness {
  constructor(private readonly model: Model<LevelDocument>) {}

  async assertReady(): Promise<void> {
    const indexes = await this.model.db
      .getClient()
      .db(this.model.db.name)
      .collection(this.model.collection.name)
      .listIndexes({ readPreference: 'primary' })
      .toArray();
    const required = indexes.some((index) => {
      const entries = Object.entries(index.key);
      return (
        index.unique === true &&
        index.sparse !== true &&
        !Object.hasOwn(index, 'partialFilterExpression') &&
        (index.collation === undefined ||
          index.collation.locale === 'simple') &&
        entries.length === 2 &&
        entries[0]?.[0] === 'gameId' &&
        entries[0]?.[1] === 1 &&
        entries[1]?.[0] === 'order' &&
        entries[1]?.[1] === 1
      );
    });
    if (!required) throw new Error('Required level order index is unavailable');
  }
}
