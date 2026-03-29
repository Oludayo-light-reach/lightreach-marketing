import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Content, { normalizeMetrics } from "@/app/Content";
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
  const c = doc as Record<string, unknown>;
  const user = c.user;
  const u =
    user && typeof user === "object"
      ? (user as { name?: string; email?: string })
      : null;
  return {
    id: String(c._id),
    userId: userIdFromLean(c as { user: unknown }),
    user:
      u && (u.name != null || u.email != null)
        ? { name: u.name ?? "", email: u.email ?? "" }
        : null,
    platform: c.platform,
    type: c.type,
    externalId: c.externalId,
    timestamp: c.timestamp,
    content: c.content,
    text: c.text,
    media: c.media,
    metrics: normalizeMetrics(c.metrics as unknown as Record<string, unknown>),
    meta: c.meta,
    primary_job: c.primary_job,
    secondary_jobs: c.secondary_jobs,
    content_object: c.content_object,
    primary_format_mechanic: c.primary_format_mechanic,
    secondary_format_mechanics: c.secondary_format_mechanics,
    interaction_mode: c.interaction_mode,
    retrieval_mode: c.retrieval_mode,
    authorship_mode: c.authorship_mode,
    evidence_mode: c.evidence_mode,
    topic_domain: c.topic_domain,
    attention_hook: c.attention_hook,
    outcome_driver: c.outcome_driver,
    pattern_notes: c.pattern_notes,
    media_url: c.media_url,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
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
      type,
      externalId,
      timestamp,
      content,
      text,
      media,
      metrics,
      meta,
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
    if (type !== undefined) existing.type = type as string | undefined;
    if (externalId !== undefined) existing.externalId = externalId ? String(externalId) : undefined;
    if (timestamp !== undefined) {
      const ts = new Date(String(timestamp));
      if (Number.isNaN(ts.getTime())) {
        return NextResponse.json({ error: "Invalid timestamp" }, { status: 400 });
      }
      existing.timestamp = ts;
    }
    if (content !== undefined) existing.content = content as typeof existing.content;
    if (text !== undefined) {
      const t = text as { body?: string; url?: string; driveLink?: string };
      if (t.body !== undefined) existing.text.body = String(t.body).trim();
      if (t.url !== undefined) existing.text.url = String(t.url).trim();
      if (t.driveLink !== undefined) {
        existing.text.driveLink = t.driveLink ? String(t.driveLink).trim() : undefined;
      }
    }
    if (media !== undefined) existing.media = media as typeof existing.media;
    if (metrics !== undefined) {
      const cur = existing.toObject().metrics as unknown as
        | Record<string, unknown>
        | undefined;
      existing.metrics = normalizeMetrics({
        ...cur,
        ...(metrics as Record<string, unknown>),
      }) as typeof existing.metrics;
      existing.markModified("metrics");
    }
    if (meta !== undefined) existing.meta = meta as typeof existing.meta;

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
