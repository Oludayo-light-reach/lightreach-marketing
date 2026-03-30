import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Content, {
  contentLeanToApiPayload,
  normalizeMetrics,
} from "@/app/Content";
import User from "@/app/User";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function userIdFromLean(c: { user: unknown }) {
  const u = c.user;
  if (u && typeof u === "object" && "_id" in u) {
    return String((u as { _id: unknown })._id);
  }
  return String(u);
}

function serialize(doc: unknown) {
  const c = doc as unknown as Record<string, unknown>;
  const user = c.user;
  const u =
    user && typeof user === "object"
      ? (user as { name?: string; email?: string })
      : null;
  return contentLeanToApiPayload(c, {
    userId: userIdFromLean(c as { user: unknown }),
    user:
      u && (u.name != null || u.email != null)
        ? { name: u.name ?? "", email: u.email ?? "" }
        : null,
  });
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const c = await Content.findById(id).populate("user", "name email").lean();
    if (!c) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ content: serialize(c) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load content" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const body = await req.json();
    const {
      userId,
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
    } = body as Record<string, unknown>;

    const existing = await Content.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (userId !== undefined) {
      if (!mongoose.isValidObjectId(String(userId))) {
        return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
      }
      const owner = await User.findById(String(userId));
      if (!owner) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      existing.user = new mongoose.Types.ObjectId(String(userId));
    }
    if (platform !== undefined) existing.platform = platform as string | undefined;
    if (externalId !== undefined) existing.externalId = externalId ? String(externalId) : undefined;

    const dateInput = dateRaw !== undefined ? dateRaw : timestamp;
    if (dateInput !== undefined) {
      const ts = new Date(String(dateInput));
      if (Number.isNaN(ts.getTime())) {
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      }
      existing.date = ts;
    }

    if (text !== undefined) existing.text = String(text).trim();
    if (url !== undefined) existing.url = String(url).trim();

    const metricKeys = [
      "impressions",
      "likes",
      "replies",
      "reposts",
      "saves",
      "followerGain",
    ] as const;
    const anyMetric = metricKeys.some((k) => body[k] !== undefined);
    if (anyMetric) {
      const cur = existing.toObject() as unknown as Record<string, unknown>;
      const merged = normalizeMetrics({
        ...cur,
        impressions: impressions ?? cur.impressions,
        likes: likes ?? cur.likes,
        replies: replies ?? cur.replies,
        reposts: reposts ?? cur.reposts,
        saves: saves ?? cur.saves,
        followerGain: followerGain ?? cur.followerGain,
        metrics: cur.metrics,
      });
      existing.impressions = merged.impressions;
      existing.likes = merged.likes;
      existing.replies = merged.replies;
      existing.reposts = merged.reposts;
      existing.saves = merged.saves;
      existing.followerGain = merged.followerGain;
    }

    if (sent !== undefined) {
      existing.sent = typeof sent === "number" ? sent : Number(sent ?? 0) || 0;
    }

    if (primary_job !== undefined) existing.primary_job = primary_job as typeof existing.primary_job;
    if (secondary_jobs !== undefined)
      existing.secondary_jobs = secondary_jobs as typeof existing.secondary_jobs;
    if (content_object !== undefined)
      existing.content_object = content_object as typeof existing.content_object;
    if (primary_format_mechanic !== undefined)
      existing.primary_format_mechanic = primary_format_mechanic as typeof existing.primary_format_mechanic;
    if (secondary_format_mechanics !== undefined)
      existing.secondary_format_mechanics = secondary_format_mechanics as typeof existing.secondary_format_mechanics;
    if (interaction_mode !== undefined)
      existing.interaction_mode = interaction_mode as typeof existing.interaction_mode;
    if (retrieval_mode !== undefined)
      existing.retrieval_mode = retrieval_mode as typeof existing.retrieval_mode;
    if (authorship_mode !== undefined)
      existing.authorship_mode = authorship_mode as typeof existing.authorship_mode;
    if (evidence_mode !== undefined) existing.evidence_mode = evidence_mode as typeof existing.evidence_mode;
    if (topic_domain !== undefined) existing.topic_domain = topic_domain as typeof existing.topic_domain;
    if (attention_hook !== undefined)
      existing.attention_hook = attention_hook as typeof existing.attention_hook;
    if (outcome_driver !== undefined)
      existing.outcome_driver = outcome_driver as typeof existing.outcome_driver;
    if (pattern_notes !== undefined)
      existing.pattern_notes = pattern_notes ? String(pattern_notes) : undefined;
    if (media_url !== undefined)
      existing.media_url = media_url ? String(media_url) : undefined;

    await existing.save();

    const c = await Content.findById(id).populate("user", "name email").lean();
    return NextResponse.json({ content: serialize(c) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const deleted = await Content.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete content" }, { status: 500 });
  }
}
