import mongoose, { Schema } from "mongoose";

export type UserRole = "borrower" | "admin";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["borrower", "admin"] as UserRole[],
      required: true,
      default: "borrower",
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
  },
);

export const User = mongoose.model<IUser>("User", userSchema);
