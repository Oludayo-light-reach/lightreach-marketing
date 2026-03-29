import mongoose, { Document, Schema, Types } from "mongoose";
import User, { type Platform } from "./User";

// Re-export Platform (same list as User / schema enum below)
export type { Platform };

// ─────────────────────────────────────────────
// ENUMS (controlled values for consistency)
// ─────────────────────────────────────────────

export type PrimaryJob =
  | "Explain"
  | "Prove"
  | "Convert"
  | "Invite"
  | "Relate"
  | "React"
  | "Predict"
  | "Show"
  | "Discover";

export type ContentObject =
  | "single_post"
  | "short_video"
  | "carousel"
  | "thread"
  | "quote_post";

export type InteractionMode =
  | "passive_consumption"
  | "comment_debate"
  | "reply_generation"
  | "click_intent"
  | "save_reference";

export type RetrievalMode = "feed" | "community";

export type AuthorshipMode = "founder" | "creator_partner" | "operator";

export type EvidenceMode =
  | "reasoned"
  | "process_evidence"
  | "result_evidence"
  | "lived_experience"
  | "implicit";

export type TopicDomain =
  | "developer_tools"
  | "design_tools"
  | "technology"
  | "future_of_work"
  | "product_development"
  | "brand_design"
  | "creator_identity"
  | "creator_growth"
  | "creator_culture"
  | "work_culture"
  | "career"
  | "business"
  | "travel"
  | "daily_life"
  | "lifestyle"
  | "data_engineering"
  | "generational_behavior"
  | "society"
  | "platform_behavior";

/** Flexible dimensions */
export type AttentionHook = string;
export type OutcomeDriver = string;
export type FormatMechanic = string;

export type ContentType =
  | "post"
  | "reply"
  | "quote"
  | "thread"
  | "reel"
  | string;

// ─────────────────────────────────────────────
// Metrics (no nulls — default 0 in schema)
// ─────────────────────────────────────────────

export interface Metrics {
  impressions: number;
  likes: number;
  replies: number;
  reposts: number;
  saves: number;
  followerGain: number;
}

/** Legacy category block (optional; prefer topic_domain + strategy fields) */
export interface IContentCategory {
  category?: string;
  subtype?: string;
  performanceDriver?: string;
  categoryReason?: string;
}

export interface IContentText {
  body: string;
  url: string;
  driveLink?: string;
}

export interface IContentMedia {
  urls?: string[];
}

export interface IContentMetrics extends Metrics {
  /** @deprecated Prefer `saves`; kept for reads of older documents */
  saved?: number;
}

export interface IContentMeta {
  rawType?: string;
  sent?: number;
  extra?: Record<string, unknown>;
}

/** Serializable content shape (API / analytics); `date` is ISO day string */
export interface ContentItem {
  id: string;
  platform: Platform;
  date: string;

  primary_job: PrimaryJob;
  secondary_jobs: PrimaryJob[];

  content_object: ContentObject;
  primary_format_mechanic: FormatMechanic;
  secondary_format_mechanics: FormatMechanic[];

  interaction_mode: InteractionMode;
  retrieval_mode: RetrievalMode;

  authorship_mode: AuthorshipMode;
  evidence_mode: EvidenceMode[];

  topic_domain: TopicDomain;

  attention_hook: AttentionHook[];
  outcome_driver: OutcomeDriver[];

  pattern_notes: string;

  text: string;
  media_url?: string;
  drive_link?: string;
  post_link: string;

  metrics: Metrics;

  /** Publishing / distribution type (kept alongside strategy layer) */
  type: ContentType;
}

/** Mongoose document: strategy fields + legacy `content` + nested `text` */
export interface IContent extends Document {
  user: Types.ObjectId;

  platform?: Platform | string;
  type?: ContentType;
  externalId?: string;

  timestamp: Date;

  primary_job?: PrimaryJob;
  secondary_jobs?: PrimaryJob[];

  content_object?: ContentObject;
  primary_format_mechanic?: FormatMechanic;
  secondary_format_mechanics?: FormatMechanic[];

  interaction_mode?: InteractionMode;
  retrieval_mode?: RetrievalMode;

  authorship_mode?: AuthorshipMode;
  evidence_mode?: EvidenceMode[];

  topic_domain?: TopicDomain;

  attention_hook?: AttentionHook[];
  outcome_driver?: OutcomeDriver[];

  pattern_notes?: string;

  /** Primary asset URL (optional; additional URLs may live in `media`) */
  media_url?: string;

  content?: IContentCategory;
  text: IContentText;
  media?: IContentMedia;
  metrics: IContentMetrics;
  meta?: IContentMeta;

  createdAt: Date;
  updatedAt: Date;
}

const PLATFORM_ENUM = [
  "X",
  "LinkedIn",
  "Threads",
  "TikTok",
  "Instagram",
  "Facebook",
  "YouTube",
  "Twitch",
  "Discord",
  "Reddit",
  "Telegram",
  "WhatsApp",
  "Signal",
  "Email",
  "SMS",
  "Phone",
  "Other",
] as const;

const PRIMARY_JOB_ENUM = [
  "Explain",
  "Prove",
  "Convert",
  "Invite",
  "Relate",
  "React",
  "Predict",
  "Show",
  "Discover",
] as const;

const CONTENT_OBJECT_ENUM = [
  "single_post",
  "short_video",
  "carousel",
  "thread",
  "quote_post",
] as const;

const INTERACTION_MODE_ENUM = [
  "passive_consumption",
  "comment_debate",
  "reply_generation",
  "click_intent",
  "save_reference",
] as const;

const RETRIEVAL_MODE_ENUM = ["feed", "community"] as const;

const AUTHORSHIP_MODE_ENUM = ["founder", "creator_partner", "operator"] as const;

const EVIDENCE_MODE_ENUM = [
  "reasoned",
  "process_evidence",
  "result_evidence",
  "lived_experience",
  "implicit",
] as const;

const TOPIC_DOMAIN_ENUM = [
  "developer_tools",
  "design_tools",
  "technology",
  "future_of_work",
  "product_development",
  "brand_design",
  "creator_identity",
  "creator_growth",
  "creator_culture",
  "work_culture",
  "career",
  "business",
  "travel",
  "daily_life",
  "lifestyle",
  "data_engineering",
  "generational_behavior",
  "society",
  "platform_behavior",
] as const;

const MetricsSubSchema = {
  impressions: { type: Number, default: 0, min: 0 },
  likes: { type: Number, default: 0, min: 0 },
  replies: { type: Number, default: 0, min: 0 },
  reposts: { type: Number, default: 0, min: 0 },
  saves: { type: Number, default: 0, min: 0 },
  followerGain: { type: Number, default: 0 },
};

const ContentSchema = new Schema<IContent>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    platform: {
      type: String,
      enum: [...PLATFORM_ENUM],
    },

    type: {
      type: String,
      enum: ["post", "reply", "quote", "thread", "reel"],
    },

    externalId: {
      type: String,
      sparse: true,
    },

    timestamp: {
      type: Date,
      required: true,
      index: true,
    },

    primary_job: { type: String, enum: [...PRIMARY_JOB_ENUM] },
    secondary_jobs: [{ type: String, enum: [...PRIMARY_JOB_ENUM] }],

    content_object: { type: String, enum: [...CONTENT_OBJECT_ENUM] },
    primary_format_mechanic: { type: String },
    secondary_format_mechanics: [{ type: String }],

    interaction_mode: { type: String, enum: [...INTERACTION_MODE_ENUM] },
    retrieval_mode: { type: String, enum: [...RETRIEVAL_MODE_ENUM] },

    authorship_mode: { type: String, enum: [...AUTHORSHIP_MODE_ENUM] },
    evidence_mode: [{ type: String, enum: [...EVIDENCE_MODE_ENUM] }],

    topic_domain: { type: String, enum: [...TOPIC_DOMAIN_ENUM] },

    attention_hook: [{ type: String }],
    outcome_driver: [{ type: String }],

    pattern_notes: { type: String },

    media_url: { type: String },

    content: {
      category: String,
      subtype: String,
      performanceDriver: String,
      categoryReason: String,
    },

    text: {
      body: { type: String, required: true },
      url: { type: String, required: true },
      driveLink: String,
    },

    media: {
      urls: [String],
    },

    metrics: MetricsSubSchema,

    meta: {
      rawType: String,
      sent: { type: Number, default: 0, min: 0 },
      extra: { type: Schema.Types.Mixed },
    },
  },
  { timestamps: true },
);

ContentSchema.index({ user: 1, timestamp: -1 });
ContentSchema.index({ user: 1, platform: 1 });
ContentSchema.index(
  { externalId: 1, platform: 1 },
  { unique: true, sparse: true },
);

ContentSchema.post("save", async function (doc: IContent) {
  const gain = doc.metrics?.followerGain;
  const platform = doc.platform as Platform | undefined;

  if (!gain || !platform || !doc.user) return;

  try {
    const user = await User.findById(doc.user);
    if (user) await user.incrementFollowers(platform, gain);
  } catch (err) {
    console.error("[Content] Failed to sync followerGain to User:", err);
  }
});

ContentSchema.post("findOneAndUpdate", async function (doc: IContent | null) {
  if (!doc) return;

  const update = this.getUpdate() as {
    $set?: Record<string, unknown>;
    $inc?: Record<string, unknown>;
  } | null;
  const newGain: number | undefined =
    (update?.$set?.["metrics.followerGain"] as number | undefined) ??
    (update?.$inc?.["metrics.followerGain"] as number | undefined);

  if (newGain == null || !doc.platform || !doc.user) return;

  try {
    const user = await User.findById(doc.user);
    if (user) await user.incrementFollowers(doc.platform as Platform, newGain);
  } catch (err) {
    console.error("[Content] Failed to sync followerGain delta to User:", err);
  }
});

export function parseMetric(value: string | number | undefined | null): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Math.round(value);

  const lower = value.trim().toLowerCase();

  if (lower.endsWith("k")) return Math.round(parseFloat(lower) * 1_000);
  if (lower.endsWith("m")) return Math.round(parseFloat(lower) * 1_000_000);
  if (lower.endsWith("b")) return Math.round(parseFloat(lower) * 1_000_000_000);

  return Math.round(parseFloat(lower)) || 0;
}

/** Normalize metrics for API: always numbers, never null */
export function normalizeMetrics(m: Partial<IContentMetrics> | Record<string, unknown> | undefined): Metrics {
  const x = m ?? {};
  return {
    impressions: Number(x.impressions ?? 0) || 0,
    likes: Number(x.likes ?? 0) || 0,
    replies: Number(x.replies ?? 0) || 0,
    reposts: Number(x.reposts ?? 0) || 0,
    saves: Number(x.saves ?? x.saved ?? 0) || 0,
    followerGain: Number(x.followerGain ?? 0) || 0,
  };
}

export default mongoose.model<IContent>("Content", ContentSchema);
