import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Content, { normalizeMetrics } from "@/app/Content";
import User from "@/app/User";

export const runtime = "nodejs";

const MAX_LIMIT = 500;

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function userIdFromLean(c: { user: unknown }) {
  const u = c.user;
  if (u && typeof u === "object" && "_id" in u) {
    return String((u as { _id: unknown })._id);
  }
  return String(u);
}

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const platform = searchParams.get("platform")?.trim() || "";
    const userId = searchParams.get("userId");
    const type = searchParams.get("type")?.trim() || "";
    const q = searchParams.get("q")?.trim() ?? "";

    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");
    const page = Math.max(1, parseInt(pageRaw || "1", 10) || 1);
    const limitParsed =
      limitRaw != null && limitRaw !== ""
        ? parseInt(limitRaw, 10)
        : MAX_LIMIT;
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.isFinite(limitParsed) ? limitParsed : MAX_LIMIT),
    );

    const andConditions: Record<string, unknown>[] = [];

    if (from || to) {
      const ts: Record<string, Date> = {};
      if (from) ts.$gte = new Date(from);
      if (to) ts.$lte = new Date(to);
      andConditions.push({ timestamp: ts });
    }
    if (platform) {
      andConditions.push({ platform });
    }
    if (userId && mongoose.isValidObjectId(userId)) {
      andConditions.push({ user: new mongoose.Types.ObjectId(userId) });
    }
    if (type) {
      andConditions.push({ type });
    }

    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      const matchingUsers = await User.find({
        $or: [{ name: rx }, { email: rx }],
      })
        .select("_id")
        .lean();
      const userIds = matchingUsers.map((u) => u._id);
      const orClause: Record<string, unknown>[] = [
        { "text.body": rx },
        { platform: rx },
        { externalId: rx },
        { type: rx },
      ];
      if (userIds.length) {
        orClause.push({ user: { $in: userIds } });
      }
      andConditions.push({ $or: orClause });
    }

    const filter: Record<string, unknown> =
      andConditions.length === 0
        ? {}
        : andConditions.length === 1
          ? (andConditions[0] as Record<string, unknown>)
          : { $and: andConditions };

    const total = await Content.countDocuments(filter);
    const skip = (page - 1) * limit;

    const items = await Content.find(filter)
      .populate("user", "name email")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      content: items.map((c) => {
        const pu =
          c.user && typeof c.user === "object"
            ? (c.user as { name?: string; email?: string })
            : null;
        return {
        id: String(c._id),
        userId: userIdFromLean(c),
        user:
          pu && (pu.name != null || pu.email != null)
            ? { name: pu.name ?? "", email: pu.email ?? "" }
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
    }),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to list content" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
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

    if (!userId || !mongoose.isValidObjectId(String(userId))) {
      return NextResponse.json({ error: "valid userId is required" }, { status: 400 });
    }
    const owner = await User.findById(String(userId));
    if (!owner) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const textObj = text as { body?: string; url?: string; driveLink?: string } | undefined;
    if (!textObj?.body?.trim() || !textObj?.url?.trim()) {
      return NextResponse.json(
        { error: "text.body and text.url are required" },
        { status: 400 },
      );
    }

    const ts = timestamp ? new Date(String(timestamp)) : new Date();
    if (Number.isNaN(ts.getTime())) {
      return NextResponse.json({ error: "Invalid timestamp" }, { status: 400 });
    }

    const doc = await Content.create({
      user: new mongoose.Types.ObjectId(String(userId)),
      platform: platform as string | undefined,
      type: type as string | undefined,
      externalId: externalId ? String(externalId) : undefined,
      timestamp: ts,
      content: content as object | undefined,
      text: {
        body: textObj.body.trim(),
        url: textObj.url.trim(),
        driveLink: textObj.driveLink?.trim(),
      },
      media: media as object | undefined,
      metrics: normalizeMetrics(metrics as unknown as Record<string, unknown>),
      meta: meta as object | undefined,
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
      return NextResponse.json({ error: "Failed to load created content" }, { status: 500 });
    }
    const c = populated;
    const pu =
      c.user && typeof c.user === "object"
        ? (c.user as { name?: string; email?: string })
        : null;
    return NextResponse.json({
      content: {
        id: String(c._id),
        userId: userIdFromLean(c as { user: unknown }),
        user:
          pu && (pu.name != null || pu.email != null)
            ? { name: pu.name ?? "", email: pu.email ?? "" }
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
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create content" },
      { status: 500 },
    );
  }
}
