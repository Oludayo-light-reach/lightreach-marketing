import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { createContentDocument } from "@/lib/content-create";

export const runtime = "nodejs";

const MAX_ROWS = 500;

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = (await req.json()) as {
      defaultUserId?: string;
      rows?: Record<string, unknown>[];
    };

    const { defaultUserId, rows } = body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "rows array is required and must not be empty" },
        { status: 400 },
      );
    }
    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `At most ${MAX_ROWS} rows per import` },
        { status: 400 },
      );
    }

    if (
      defaultUserId != null &&
      defaultUserId !== "" &&
      !mongoose.isValidObjectId(String(defaultUserId))
    ) {
      return NextResponse.json({ error: "Invalid defaultUserId" }, { status: 400 });
    }

    const created: string[] = [];
    const failed: { index: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as Record<string, unknown>;
      const uid =
        (row.userId != null && String(row.userId).trim() !== ""
          ? String(row.userId)
          : null) ??
        (defaultUserId != null && String(defaultUserId).trim() !== ""
          ? String(defaultUserId)
          : null);

      if (!uid || !mongoose.isValidObjectId(uid)) {
        failed.push({ index: i, error: "Missing or invalid userId" });
        continue;
      }

      const result = await createContentDocument(uid, row);
      if (result.ok) {
        created.push(result.content.id);
      } else {
        failed.push({ index: i, error: result.error });
      }
    }

    return NextResponse.json({
      created: created.length,
      ids: created,
      failed,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to import content" },
      { status: 500 },
    );
  }
}
