import mongoose from "mongoose";
import Content, {
  contentLeanToApiPayload,
  normalizeMetrics,
  type ContentApiPayload,
} from "@/app/Content";
import User from "@/app/User";

function userIdFromLean(c: { user: unknown }) {
  const u = c.user;
  if (u && typeof u === "object" && "_id" in u) {
    return String((u as { _id: unknown })._id);
  }
  return String(u);
}

/**
 * Shared create logic for POST /api/content and bulk import.
 * `body` matches the JSON shape accepted by the content API.
 */
export async function createContentDocument(
  userId: string,
  body: Record<string, unknown>,
): Promise<
  | { ok: true; content: ContentApiPayload }
  | { ok: false; error: string }
> {
  if (!userId || !mongoose.isValidObjectId(String(userId))) {
    return { ok: false, error: "valid userId is required" };
  }
  const owner = await User.findById(String(userId));
  if (!owner) {
    return { ok: false, error: "User not found" };
  }

  const {
    platform,
    externalId,
    date: dateRaw,
    timestamp,
    text,
    url,
    impressions,
    likes,
    replies,
    reposts,
    saves,
    followerGain,
    sent,
    primary_job,
    secondary_jobs,
    content_object,
    primary_format_mechanic,
    secondary_format_mechanics,
    interaction_mode,
    retrieval_mode,
    authorship_mode,
    evidence_mode,
    topic_domain,
    attention_hook,
    outcome_driver,
    pattern_notes,
    media_url,
  } = body;

  const bodyStr = typeof text === "string" ? text.trim() : "";
  const urlStr = typeof url === "string" ? url.trim() : "";
  if (!bodyStr || !urlStr) {
    return { ok: false, error: "text and url are required" };
  }

  const dateInput = dateRaw ?? timestamp;
  const dt = dateInput ? new Date(String(dateInput)) : new Date();
  if (Number.isNaN(dt.getTime())) {
    return { ok: false, error: "Invalid date" };
  }

  const metrics = normalizeMetrics({
    impressions,
    likes,
    replies,
    reposts,
    saves,
    followerGain,
  });

  const doc = await Content.create({
    user: new mongoose.Types.ObjectId(String(userId)),
    platform: platform as string | undefined,
    externalId: externalId ? String(externalId) : undefined,
    date: dt,
    text: bodyStr,
    url: urlStr,
    impressions: metrics.impressions,
    likes: metrics.likes,
    replies: metrics.replies,
    reposts: metrics.reposts,
    saves: metrics.saves,
    followerGain: metrics.followerGain,
    sent: typeof sent === "number" ? sent : Number(sent ?? 0) || 0,
    primary_job: typeof primary_job === "string" ? primary_job : undefined,
    secondary_jobs: Array.isArray(secondary_jobs)
      ? (secondary_jobs as string[])
      : undefined,
    content_object: typeof content_object === "string" ? content_object : undefined,
    primary_format_mechanic:
      typeof primary_format_mechanic === "string" ? primary_format_mechanic : undefined,
    secondary_format_mechanics: Array.isArray(secondary_format_mechanics)
      ? (secondary_format_mechanics as string[])
      : undefined,
    interaction_mode: typeof interaction_mode === "string" ? interaction_mode : undefined,
    retrieval_mode: typeof retrieval_mode === "string" ? retrieval_mode : undefined,
    authorship_mode: typeof authorship_mode === "string" ? authorship_mode : undefined,
    evidence_mode: Array.isArray(evidence_mode) ? (evidence_mode as string[]) : undefined,
    topic_domain: typeof topic_domain === "string" ? topic_domain : undefined,
    attention_hook: Array.isArray(attention_hook) ? (attention_hook as string[]) : undefined,
    outcome_driver: Array.isArray(outcome_driver) ? (outcome_driver as string[]) : undefined,
    pattern_notes: typeof pattern_notes === "string" ? pattern_notes : undefined,
    media_url: typeof media_url === "string" ? media_url : undefined,
  });

  const populated = await Content.findById(doc._id)
    .populate("user", "name email")
    .lean();

  if (!populated) {
    return { ok: false, error: "Failed to load created content" };
  }

  const c = populated as unknown as Record<string, unknown>;
  const pu =
    c.user && typeof c.user === "object"
      ? (c.user as { name?: string; email?: string })
      : null;

  return {
    ok: true,
    content: contentLeanToApiPayload(c, {
      userId: userIdFromLean(populated as { user: unknown }),
      user:
        pu && (pu.name != null || pu.email != null)
          ? { name: pu.name ?? "", email: pu.email ?? "" }
          : null,
    }),
  };
}
