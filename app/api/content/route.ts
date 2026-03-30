import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Content, { contentLeanToApiPayload } from "@/app/Content";
import User from "@/app/User";
import { createContentDocument } from "@/lib/content-create";

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
      const exprParts: Record<string, unknown>[] = [];
      if (from) {
        exprParts.push({
          $gte: [{ $ifNull: ["$date", "$timestamp"] }, new Date(from)],
        });
      }
      if (to) {
        exprParts.push({
          $lte: [{ $ifNull: ["$date", "$timestamp"] }, new Date(to)],
        });
      }
      andConditions.push({ $expr: { $and: exprParts } });
    }
    if (platform) {
      andConditions.push({ platform });
    }
    if (userId && mongoose.isValidObjectId(userId)) {
      andConditions.push({ user: new mongoose.Types.ObjectId(userId) });
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
        { text: rx },
        { "text.body": rx },
        { url: rx },
        { "text.url": rx },
        { platform: rx },
        { externalId: rx },
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
      .sort({ date: -1, timestamp: -1 } as Record<string, 1 | -1>)
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      content: items.map((c) => {
        const raw = c as unknown as Record<string, unknown>;
        const pu =
          raw.user && typeof raw.user === "object"
            ? (raw.user as { name?: string; email?: string })
            : null;
        return contentLeanToApiPayload(raw, {
          userId: userIdFromLean(c as { user: unknown }),
          user:
            pu && (pu.name != null || pu.email != null)
              ? { name: pu.name ?? "", email: pu.email ?? "" }
              : null,
        });
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
    const body = (await req.json()) as Record<string, unknown>;
    const userId = body.userId;
    if (!userId || !mongoose.isValidObjectId(String(userId))) {
      return NextResponse.json({ error: "valid userId is required" }, { status: 400 });
    }

    const result = await createContentDocument(String(userId), body);
    if (!result.ok) {
      const status =
        result.error === "User not found"
          ? 404
          : result.error === "Failed to load created content"
            ? 500
            : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({ content: result.content });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create content" },
      { status: 500 },
    );
  }
}
