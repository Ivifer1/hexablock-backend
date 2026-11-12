import { Schema } from 'mongoose';

// Stored shape of a user. Only this adapter knows it; the domain User has no
// persistence annotations. `_id` holds the UserId as a string.
export interface UserDocument {
  _id: string;
  username: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
}

// Name under which the model is registered in Mongoose.
export const USER_MODEL = 'User';

export const UserSchema = new Schema<UserDocument>(
  {
    _id: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true },
    createdAt: { type: Date, required: true },
  },
  { collection: 'users', versionKey: false },
);
