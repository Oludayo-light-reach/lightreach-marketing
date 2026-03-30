/**
 * Seeds Content documents for user 69c69acb2908f5cfb4b29dd3 (bundled rows).
 *
 * Usage (from repo root):
 *   MONGODB_URI="mongodb+srv://..." npx tsx scripts/seed-content-mbr.ts
 *
 * If `.env` exists and `MONGODB_URI` is unset, KEY=value lines are loaded from it.
 */

import { existsSync, readFileSync } from "fs";
import mongoose from "mongoose";
import { resolve } from "path";

import Content, {
  normalizeMetrics,
  Platform,
  type IContent,
} from "../app/Content";
import { connectDB } from "../lib/mongodb";

const USER_ID = "69c69a6e2908f5cfb4b29dcd";

function loadEnvLocalIfNeeded(): void {
  if (process.env.MONGODB_URI) return;
  const p = resolve(process.cwd(), ".env");
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = val;
  }
}

type SampleRow = {
  id: number;
  platform: Platform;
  date: string;
  primary_job: string;
  secondary_jobs: string[];
  content_object: string;
  primary_format_mechanic: string;
  secondary_format_mechanics: string[];
  interaction_mode: string;
  retrieval_mode: string;
  authorship_mode: string;
  evidence_mode: string[];
  topic_domain: string;
  attention_hook: string[];
  outcome_driver: string[];
  pattern_notes: string;
  text: string;
  impressions: number | null;
  likes: number | null;
  replies: number | null;
  reposts: number | null;
  post_link: string;
  drive_link: string | null;
  saves: number | null;
};

const ROWS: SampleRow[] = [
  {
    id: 1,
    platform: "X",
    date: "2026-03-25",
    primary_job: "Explain",
    secondary_jobs: ["React"],
    content_object: "single_post",
    primary_format_mechanic: "contrarian_take",
    secondary_format_mechanics: ["mental_model", "aphoristic_reframe"],
    interaction_mode: "comment_debate",
    retrieval_mode: "feed",
    authorship_mode: "creator_partner",
    evidence_mode: ["reasoned"],
    topic_domain: "technology",
    attention_hook: ["novelty", "friction", "clarity", "compression"],
    outcome_driver: ["replies", "reposts"],
    pattern_notes:
      "Rejects a common AI assumption and compresses the alternative into a memorable conceptual line: 'Intelligence is making sense.'",
    text: "One of the laziest ideas in AI: intelligence is just more data in... Intelligence is making sense.",
    drive_link: null,
    post_link: "https://x.com/_lranth/status/2036745844834410599?s=20",
    impressions: 10,
    likes: null,
    replies: null,
    reposts: null,
    saves: null,
  },
  {
    id: 2,
    platform: "X",
    date: "2026-03-26",
    primary_job: "Explain",
    secondary_jobs: [],
    content_object: "single_post",
    primary_format_mechanic: "mental_model",
    secondary_format_mechanics: [
      "explanatory_reframe",
      "concept_clarification",
    ],
    interaction_mode: "save_reference",
    retrieval_mode: "feed",
    authorship_mode: "creator_partner",
    evidence_mode: ["reasoned"],
    topic_domain: "technology",
    attention_hook: ["clarity", "specificity", "contrast"],
    outcome_driver: ["saves", "reposts"],
    pattern_notes:
      "Expands the contrarian claim into a structured explanation around structure, organization, and filtering.",
    text: "If more data isn’t the leap in AI, what is? Structure. Raw input is noise...",
    drive_link: null,
    post_link: "https://x.com/_lranth/status/2037063979777077380?s=20",
    impressions: 5,
    likes: null,
    replies: null,
    reposts: null,
    saves: null,
  },
];

function rowToPayload(
  userId: mongoose.Types.ObjectId,
  row: SampleRow,
): Partial<IContent> {
  const metrics = normalizeMetrics({
    impressions: row.impressions ?? undefined,
    likes: row.likes ?? undefined,
    replies: row.replies ?? undefined,
    reposts: row.reposts ?? undefined,
    saves: row.saves ?? undefined,
  });

  return {
    user: userId,
    platform: row.platform,
    externalId: String(row.id),
    date: new Date(`${row.date}T12:00:00.000Z`),
    primary_job: row.primary_job as IContent["primary_job"],
    secondary_jobs: (row.secondary_jobs ?? []) as IContent["secondary_jobs"],
    content_object: row.content_object as IContent["content_object"],
    primary_format_mechanic: row.primary_format_mechanic,
    secondary_format_mechanics: row.secondary_format_mechanics,
    interaction_mode: row.interaction_mode as IContent["interaction_mode"],
    retrieval_mode: row.retrieval_mode as IContent["retrieval_mode"],
    authorship_mode: row.authorship_mode as IContent["authorship_mode"],
    evidence_mode: row.evidence_mode as IContent["evidence_mode"],
    topic_domain: row.topic_domain as IContent["topic_domain"],
    attention_hook: row.attention_hook,
    outcome_driver: row.outcome_driver,
    pattern_notes: row.pattern_notes,
    text: row.text,
    url: row.post_link,
    impressions: metrics.impressions,
    likes: metrics.likes,
    replies: metrics.replies,
    reposts: metrics.reposts,
    saves: metrics.saves,
    followerGain: metrics.followerGain,
    sent: 0,
  };
}

async function main(): Promise<void> {
  loadEnvLocalIfNeeded();

  const userId = new mongoose.Types.ObjectId(USER_ID);
  await connectDB();

  for (const row of ROWS) {
    const payload = rowToPayload(userId, row);
    const doc = await Content.findOneAndUpdate(
      { externalId: String(row.id), platform: row.platform },
      { $set: payload },
      { upsert: true, new: true },
    );
    console.log(
      `Upserted Content externalId=${row.id} platform=${row.platform} _id=${doc?._id?.toString()}`,
    );
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
