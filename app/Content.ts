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
  | "professional_skills"
  | "generational_behavior"
  | "society"
  | "platform_behavior";

/** Flexible dimensions */
export type AttentionHook = string;
export type OutcomeDriver = string;
export type FormatMechanic = string;

/** Flat metric fields (no nested `metrics` object) */
export interface ContentMetrics {
  impressions: number;
  likes: number;
  replies: number;
  reposts: number;
  saves: number;
  followerGain: number;
}

/** @deprecated Use ContentMetrics */
export type Metrics = ContentMetrics;

/**
 * Content record shape (DB + API), excluding tenancy:
 * externalId, platform, date, strategy fields, text, url, flat metrics, sent, media_url.
 * `user` is required in MongoDB for ownership.
 */
export interface ContentFields {
  externalId?: string;
  platform?: Platform | string;
  date: Date;

  /** Suggested values in `PrimaryJob`; any string is stored */
  primary_job?: string;
  secondary_jobs?: string[];

  content_object?: string;
  primary_format_mechanic?: FormatMechanic;
  secondary_format_mechanics?: FormatMechanic[];

  interaction_mode?: string;
  retrieval_mode?: string;

  authorship_mode?: string;
  evidence_mode?: string[];

  topic_domain?: string;

  attention_hook?: AttentionHook[];
  outcome_driver?: OutcomeDriver[];

  pattern_notes?: string;

  text: string;
  url: string;

  impressions: number;
  likes: number;
  replies: number;
  reposts: number;
  saves: number;
  followerGain: number;

  sent: number;

  media_url?: string;
}

/** Serializable content shape (API); `date` is ISO string */
export type ContentItem = ContentFields & {
  id: string;
  date: string;
};

export interface IContent extends Document, ContentFields {
  user: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const metricFieldSchema = {
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
    },

    externalId: {
      type: String,
      sparse: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    primary_job: { type: String },
    secondary_jobs: [{ type: String }],

    content_object: { type: String },
    primary_format_mechanic: { type: String },
    secondary_format_mechanics: [{ type: String }],

    interaction_mode: { type: String },
    retrieval_mode: { type: String },

    authorship_mode: { type: String },
    evidence_mode: [{ type: String }],

    topic_domain: { type: String },

    attention_hook: [{ type: String }],
    outcome_driver: [{ type: String }],

    pattern_notes: { type: String },

    text: { type: String, required: true },
    url: { type: String, required: true },

    ...metricFieldSchema,

    sent: { type: Number, default: 0, min: 0 },

    media_url: { type: String },
  },
  { timestamps: true },
);

ContentSchema.index({ user: 1, date: -1 });
ContentSchema.index({ user: 1, platform: 1 });
// Not unique: the same platform post id may appear on multiple rows (e.g. per user or re-imports).
ContentSchema.index({ externalId: 1, platform: 1 }, { sparse: true });

ContentSchema.post("save", async function (doc: IContent) {
  const gain = doc.followerGain;
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
    (update?.$set?.followerGain as number | undefined) ??
    (update?.$inc?.followerGain as number | undefined) ??
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

type LegacyText = { body?: string; url?: string; driveLink?: string };
type LegacyMeta = { sent?: number };

/** Normalize flat metrics; supports legacy nested `metrics` on plain objects */
export function normalizeMetrics(
  m: Partial<ContentMetrics> | Record<string, unknown> | undefined,
): ContentMetrics {
  const x = m ?? {};
  const nested =
    typeof (x as { metrics?: unknown }).metrics === "object" &&
    (x as { metrics?: unknown }).metrics !== null
      ? ((x as { metrics: Record<string, unknown> }).metrics as Record<string, unknown>)
      : {};
  const src: Record<string, unknown> = { ...nested, ...(x as Record<string, unknown>) };
  return {
    impressions: Number(src.impressions ?? 0) || 0,
    likes: Number(src.likes ?? 0) || 0,
    replies: Number(src.replies ?? 0) || 0,
    reposts: Number(src.reposts ?? 0) || 0,
    saves: Number(src.saves ?? src.saved ?? 0) || 0,
    followerGain: Number(src.followerGain ?? 0) || 0,
  };
}

function legacyTextBody(c: Record<string, unknown>): string {
  const t = c.text;
  if (typeof t === "string") return t;
  if (t && typeof t === "object" && "body" in t) {
    return String((t as LegacyText).body ?? "");
  }
  return "";
}

function legacyUrl(c: Record<string, unknown>): string {
  if (typeof c.url === "string") return c.url;
  const t = c.text;
  if (t && typeof t === "object" && "url" in t) {
    return String((t as LegacyText).url ?? "");
  }
  return "";
}

function legacyDate(c: Record<string, unknown>): Date {
  const d = c.date ?? c.timestamp;
  if (d instanceof Date) return d;
  return new Date(String(d));
}

function legacySent(c: Record<string, unknown>): number {
  if (typeof c.sent === "number") return c.sent;
  const meta = c.meta;
  if (meta && typeof meta === "object" && "sent" in meta) {
    return Number((meta as LegacyMeta).sent ?? 0) || 0;
  }
  return 0;
}

/** Shape returned by list/detail content APIs (includes tenancy + timestamps) */
export type ContentApiPayload = {
  id: string;
  userId: string;
  user: { name: string; email: string } | null;
  externalId?: string;
  platform?: string;
  date: string;
  primary_job?: string;
  secondary_jobs?: string[];
  content_object?: string;
  primary_format_mechanic?: FormatMechanic;
  secondary_format_mechanics?: FormatMechanic[];
  interaction_mode?: string;
  retrieval_mode?: string;
  authorship_mode?: string;
  evidence_mode?: string[];
  topic_domain?: string;
  attention_hook?: AttentionHook[];
  outcome_driver?: OutcomeDriver[];
  pattern_notes?: string;
  text: string;
  url: string;
  impressions: number;
  likes: number;
  replies: number;
  reposts: number;
  saves: number;
  followerGain: number;
  sent: number;
  media_url?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function contentLeanToApiPayload(
  c: Record<string, unknown>,
  opts: {
    userId: string;
    user: { name: string; email: string } | null;
  },
): ContentApiPayload {
  const metrics = normalizeMetrics(c);
  const rawDate = legacyDate(c);
  return {
    id: String(c._id),
    userId: opts.userId,
    user: opts.user,
    externalId: c.externalId as string | undefined,
    platform: c.platform as string | undefined,
    date: Number.isNaN(rawDate.getTime()) ? new Date(0).toISOString() : rawDate.toISOString(),
    primary_job: c.primary_job as string | undefined,
    secondary_jobs: c.secondary_jobs as string[] | undefined,
    content_object: c.content_object as string | undefined,
    primary_format_mechanic: c.primary_format_mechanic as string | undefined,
    secondary_format_mechanics: c.secondary_format_mechanics as string[] | undefined,
    interaction_mode: c.interaction_mode as string | undefined,
    retrieval_mode: c.retrieval_mode as string | undefined,
    authorship_mode: c.authorship_mode as string | undefined,
    evidence_mode: c.evidence_mode as string[] | undefined,
    topic_domain: c.topic_domain as string | undefined,
    attention_hook: c.attention_hook as string[] | undefined,
    outcome_driver: c.outcome_driver as string[] | undefined,
    pattern_notes: c.pattern_notes as string | undefined,
    text: legacyTextBody(c),
    url: legacyUrl(c),
    ...metrics,
    sent: legacySent(c),
    media_url: c.media_url as string | undefined,
    createdAt:
      c.createdAt instanceof Date
        ? c.createdAt.toISOString()
        : c.createdAt != null
          ? String(c.createdAt)
          : undefined,
    updatedAt:
      c.updatedAt instanceof Date
        ? c.updatedAt.toISOString()
        : c.updatedAt != null
          ? String(c.updatedAt)
          : undefined,
  };
}

export default mongoose.model<IContent>("Content", ContentSchema);
