import { Schema } from 'mongoose';

interface StoredLevelProgress {
  levelId: string;
  completed: boolean;
  stars: number;
  bestScore: number;
}

export interface ProgressDocument {
  userId: string;
  gameId: string;
  bestScore: number | null;
  levels: StoredLevelProgress[];
  updatedAt: Date;
  revision: number;
}

export const PROGRESS_MODEL = 'Progress';
export const PROGRESS_COLLECTION = 'progress';
export const PROGRESS_KEY = { userId: 1, gameId: 1 } as const;
export const PROGRESS_COLLATION = { locale: 'simple' } as const;

const levelProgress = new Schema<StoredLevelProgress>(
  {
    levelId: { type: String, required: true },
    completed: { type: Boolean, required: true },
    stars: { type: Number, required: true },
    bestScore: { type: Number, required: true },
  },
  { _id: false },
);

export const ProgressSchema = new Schema<ProgressDocument>(
  {
    userId: { type: String, required: true },
    gameId: { type: String, required: true },
    bestScore: { type: Number, default: null },
    levels: { type: [levelProgress], required: true },
    updatedAt: { type: Date, required: true },
    revision: { type: Number, required: true },
  },
  {
    collection: PROGRESS_COLLECTION,
    versionKey: false,
    autoCreate: false,
    autoIndex: false,
  },
);

ProgressSchema.index(PROGRESS_KEY, {
  unique: true,
  collation: PROGRESS_COLLATION,
});
