import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { normalizeFollowersInput } from "@/lib/user-followers";
import Content from "@/app/Content";
import User from "@/app/User";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const u = await User.findById(id).lean();
    if (!u) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      user: {
        id: String(u._id),
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        followers: u.followers,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
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
    const { name, email, avatar, followers } = body as {
      name?: string;
      email?: string;
      avatar?: string | null;
      followers?: unknown;
    };

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = String(name).trim();
    if (email !== undefined) update.email = String(email).trim().toLowerCase();
    if (avatar !== undefined) update.avatar = avatar === null ? undefined : String(avatar).trim();
    if (followers !== undefined) {
      const normalized = normalizeFollowersInput(followers);
      if (normalized === undefined) {
        return NextResponse.json(
          { error: "followers must be an array" },
          { status: 400 },
        );
      }
      update.followers = normalized;
    }

    const user = await User.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        followers: user.followers,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e ? (e as { code?: number }).code : undefined;
    if (code === 11000) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await Content.deleteMany({ user: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
