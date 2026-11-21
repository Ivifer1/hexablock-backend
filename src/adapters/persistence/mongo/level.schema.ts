import { Schema } from 'mongoose';

export interface LevelDocument {
  _id: string;
  schemaVersion: number;
  gameId: string;
  order: number;
  name: { es: string; en: string };
  board: { topology: string; cells: readonly (readonly number[])[] };
  section: { key: string; payload: unknown };
}

export const LEVEL_MODEL = 'Level';

export const LevelSchema = new Schema<LevelDocument>(
  {
    _id: { type: String, required: true },
    schemaVersion: { type: Number, required: true },
    gameId: { type: String, required: true },
    order: { type: Number, required: true },
    name: {
      es: { type: String, required: true },
      en: { type: String, required: true },
    },
    board: {
      topology: { type: String, required: true },
      cells: { type: [[Number]], required: true },
    },
    section: {
      key: { type: String, required: true },
      payload: { type: Schema.Types.Mixed, required: true },
    },
  },
  { collection: 'levels', versionKey: false, minimize: false },
);

LevelSchema.index({ gameId: 1, order: 1 }, { unique: true });
