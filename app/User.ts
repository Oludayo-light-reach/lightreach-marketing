import mongoose, { Document, Schema } from "mongoose";
import { USER_FOLLOWER_PLATFORMS } from "@/lib/platforms";

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

export type Platform =
  | "X"
  | "LinkedIn"
  | "Threads"
  | "TikTok"
  | "Instagram"
  | "Facebook"
  | "YouTube"
  | "Twitch"
  | "Discord"
  | "Reddit"
  | "Telegram"
  | "WhatsApp"
  | "Signal"
  | "Email"
  | "SMS"
  | "Phone"
  | "Other";

export interface IPlatformFollowers {
  platform: Platform;
  count: number;
  lastUpdated: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  avatar?: string;

  /** Per-platform follower counts, updated automatically when content gains followers */
  followers: IPlatformFollowers[];

  createdAt: Date;
  updatedAt: Date;

  /** Helper: get follower count for a specific platform */
  getFollowerCount(platform: Platform): number;

  /** Helper: increment follower count for a specific platform */
  incrementFollowers(platform: Platform, delta: number): Promise<IUser>;
}

// ─────────────────────────────────────────────
//  Sub-schema
// ─────────────────────────────────────────────

const PlatformFollowersSchema = new Schema<IPlatformFollowers>(
  {
    platform: {
      type: String,
      required: true,
      enum: [...USER_FOLLOWER_PLATFORMS] as Platform[],
    },
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

// ─────────────────────────────────────────────
//  Main schema
// ─────────────────────────────────────────────

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    avatar: { type: String },
    followers: {
      type: [PlatformFollowersSchema],
      default: [],
    },
  },
  { timestamps: true },
);

// ─────────────────────────────────────────────
//  Instance methods
// ─────────────────────────────────────────────

UserSchema.methods.getFollowerCount = function (
  this: IUser,
  platform: Platform,
): number {
  return this.followers.find((f) => f.platform === platform)?.count ?? 0;
};

UserSchema.methods.incrementFollowers = async function (
  this: IUser,
  platform: Platform,
  delta: number,
): Promise<IUser> {
  const entry = this.followers.find((f) => f.platform === platform);

  if (entry) {
    entry.count = Math.max(0, entry.count + delta);
    entry.lastUpdated = new Date();
  } else {
    this.followers.push({
      platform,
      count: Math.max(0, delta),
      lastUpdated: new Date(),
    });
  }

  return this.save();
};

// ─────────────────────────────────────────────
//  Indexes
// ─────────────────────────────────────────────

UserSchema.index({ email: 1 });

export default mongoose.model<IUser>("User", UserSchema);
