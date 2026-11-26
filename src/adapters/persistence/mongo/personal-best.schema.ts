import { Schema } from 'mongoose';

export interface PersonalBestDocument {
  gameId: string;
  levelId: string | null;
  userId: string;
  score: number;
  achievedAt: Date;
}

export const PERSONAL_BEST_MODEL = 'PersonalBest';
export const PERSONAL_BEST_COLLECTION = 'personal_bests';
export const PERSONAL_BEST_KEY = { gameId: 1, levelId: 1, userId: 1 } as const;
export const PERSONAL_BEST_COLLATION = { locale: 'simple' } as const;
export const LEADERBOARD_ORDER_KEY = { gameId: 1, levelId: 1, score: -1, achievedAt: 1, userId: 1 } as const;

export const PersonalBestSchema = new Schema<PersonalBestDocument>(
  {
    gameId: { type: String, required: true },
    levelId: { type: String, default: null },
    userId: { type: String, required: true },
    score: { type: Number, required: true },
    achievedAt: { type: Date, required: true },
  },
  {
    collection: PERSONAL_BEST_COLLECTION,
    versionKey: false,
    autoCreate: false,
    autoIndex: false,
  },
);

PersonalBestSchema.index(PERSONAL_BEST_KEY, {
  unique: true,
  collation: PERSONAL_BEST_COLLATION,
});

// Provision explicitly outside request handling; autoIndex remains disabled.
PersonalBestSchema.index(LEADERBOARD_ORDER_KEY, {
  name: 'leaderboard_order',
  collation: PERSONAL_BEST_COLLATION,
});
