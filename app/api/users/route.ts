import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { normalizeFollowersInput } from "@/lib/user-followers";
import Content from "@/app/Content";
import User from "@/app/User";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectDB();
    const users = await User.find().sort({ updatedAt: -1 }).lean();
    const counts = await Content.aggregate<{ _id: unknown; count: number }>([
      { $group: { _id: "$user", count: { $sum: 1 } } },
    ]);
    const countByUserId = new Map(
      counts.map((c) => [String(c._id), c.count]),
    );
    return NextResponse.json({
      users: users.map((u) => ({
        id: String(u._id),
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        followers: u.followers,
        contentCount: countByUserId.get(String(u._id)) ?? 0,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to list users" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, email, avatar, followers } = body as {
      name?: string;
      email?: string;
      avatar?: string;
      followers?: unknown;
    };

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 },
      );
    }

    const normalizedFollowers = normalizeFollowersInput(followers);

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatar: avatar?.trim() || undefined,
      ...(normalizedFollowers !== undefined
        ? { followers: normalizedFollowers }
        : {}),
    });

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
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}
