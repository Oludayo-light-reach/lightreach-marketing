/**
 * Seeds Content documents from the bundled sample rows.
 *
 * Usage (from repo root):
 *   MONGODB_URI="mongodb+srv://..." npx tsx scripts/seed-content-sample.ts
 *
 * If `.env` exists and `MONGODB_URI` is unset, KEY=value lines are loaded from it.
 */

import { existsSync, readFileSync } from "fs";
import mongoose from "mongoose";
import { resolve } from "path";

import Content, { normalizeMetrics, type IContent } from "../app/Content";
import { connectDB } from "../lib/mongodb";

const USER_ID = "69c7054cad219c3ff8dae97b";

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
  platform: "LinkedIn" | "X";
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
  tweet_text: string;
  drive_link: string | null;
  impressions: number | null;
  likes: number | null;
  replies: number | null;
  reposts: number | null;
  post_link: string;
};

const ROWS: SampleRow[] = [
  {
    id: 1,
    platform: "X",
    date: "2026-03-23",
    primary_job: "Prove",
    secondary_jobs: ["Invite", "Convert"],
    content_object: "short_video",
    primary_format_mechanic: "build_in_public",
    secondary_format_mechanics: [
      "product_demo",
      "workflow_walkthrough",
      "tutorial_tease",
    ],
    interaction_mode: "reply_generation",
    retrieval_mode: "feed",
    authorship_mode: "creator_partner",
    evidence_mode: ["process_evidence", "result_evidence"],
    topic_domain: "design_tools",
    attention_hook: ["novelty", "proof", "transparency", "contrast"],
    outcome_driver: ["replies", "profile_clicks", "trust_building"],
    pattern_notes:
      "Shows a functioning design-to-product workflow replacement built in two days with Claude Code and Codex.",
    tweet_text: "kinda bittersweet but its time to say goodbye to figma...",
    drive_link:
      "https://drive.google.com/drive/folders/1lr9DhrUt5su83h-coHtPIhpQocxiNdff?usp=share_link",
    impressions: 66,
    likes: 1,
    replies: null,
    reposts: null,
    post_link: "https://x.com/levisdesign/status/2036064711901659496?s=20",
  },
  {
    id: 2,
    platform: "X",
    date: "2026-03-24",
    primary_job: "React",
    secondary_jobs: [],
    content_object: "single_post",
    primary_format_mechanic: "positive_reaction",
    secondary_format_mechanics: ["affirmation"],
    interaction_mode: "passive_consumption",
    retrieval_mode: "feed",
    authorship_mode: "creator_partner",
    evidence_mode: [],
    topic_domain: "design_tools",
    attention_hook: ["agreement", "simplicity"],
    outcome_driver: ["likes"],
    pattern_notes: "Pure approval signal with no added insight.",
    tweet_text: "looks really clean!",
    drive_link:
      "https://drive.google.com/drive/folders/1lwjc419rvLRF11aI_E0uJnEn9RAKob6b?usp=sharing",
    impressions: 257,
    likes: null,
    replies: null,
    reposts: null,
    post_link: "https://x.com/levisdesign/status/2036393661072818528?s=20",
  },
  {
    id: 3,
    platform: "X",
    date: "2026-03-24",
    primary_job: "Convert",
    secondary_jobs: ["Explain", "Prove"],
    content_object: "single_post",
    primary_format_mechanic: "problem_solution_pitch",
    secondary_format_mechanics: [
      "workflow_reframe",
      "product_demo",
      "creator_positioning",
    ],
    interaction_mode: "click_intent",
    retrieval_mode: "feed",
    authorship_mode: "creator_partner",
    evidence_mode: ["process_evidence", "result_evidence"],
    topic_domain: "developer_tools",
    attention_hook: ["contrast", "specificity", "proof", "pain_relief"],
    outcome_driver: ["follows", "profile_clicks", "clicks"],
    pattern_notes:
      "Reframes design/dev workflow speed and AI-cost efficiency using Claude Code and Codex.",
    tweet_text: "what used to take 2–3 weeks in figma now takes a day...",
    drive_link:
      "https://drive.google.com/drive/folders/137f03AjRJxuZln7P4vd4lVRvdrMIWkdo?usp=sharing",
    impressions: 77,
    likes: null,
    replies: null,
    reposts: null,
    post_link: "https://x.com/levisdesign/status/2036399776217047091?s=20",
  },
  {
    id: 6,
    platform: "X",
    date: "2026-03-24",
    primary_job: "Invite",
    secondary_jobs: ["Predict"],
    content_object: "single_post",
    primary_format_mechanic: "provocative_question",
    secondary_format_mechanics: ["future_reframe"],
    interaction_mode: "comment_debate",
    retrieval_mode: "feed",
    authorship_mode: "creator_partner",
    evidence_mode: ["reasoned"],
    topic_domain: "future_of_work",
    attention_hook: ["friction", "stakes", "novelty"],
    outcome_driver: ["replies", "reposts"],
    pattern_notes:
      "Future-oriented question about shift from tools to agents in design workflows.",
    tweet_text:
      "in the future, are we still designing in figma, or designing through agents?",
    drive_link: null,
    impressions: 28800,
    likes: 84,
    replies: 17,
    reposts: 4,
    post_link: "https://x.com/levisdesign/status/2036448428209873177?s=20",
  },
  {
    id: 8,
    platform: "X",
    date: "2026-03-25",
    primary_job: "Invite",
    secondary_jobs: ["Prove", "Relate"],
    content_object: "single_post",
    primary_format_mechanic: "feedback_request",
    secondary_format_mechanics: [
      "brand_refresh_showcase",
      "teaser_preview",
      "aesthetic_reveal",
    ],
    interaction_mode: "reply_generation",
    retrieval_mode: "feed",
    authorship_mode: "creator_partner",
    evidence_mode: ["process_evidence", "result_evidence"],
    topic_domain: "brand_design",
    attention_hook: ["curiosity", "aesthetic", "access", "novelty"],
    outcome_driver: ["comments", "profile_clicks", "follows"],
    pattern_notes:
      "Teaser post asking for engagement in exchange for workflow reveal.",
    tweet_text: "ran brand refresh experiments for a client today...",
    drive_link:
      "https://drive.google.com/drive/folders/1_ueCflgzHDPhCCuVU9d7mQTdo-FCvylg?usp=sharing",
    impressions: 19,
    likes: null,
    replies: null,
    reposts: null,
    post_link: "https://x.com/levisdesign/status/2036763838058741947?s=20",
  },
  {
    id: 9,
    platform: "X",
    date: "2026-03-25",
    primary_job: "Convert",
    secondary_jobs: ["React", "Prove", "Predict"],
    content_object: "quote_post",
    primary_format_mechanic: "quote_commentary",
    secondary_format_mechanics: [
      "product_demo",
      "build_in_public",
      "workflow_reframe",
    ],
    interaction_mode: "click_intent",
    retrieval_mode: "feed",
    authorship_mode: "founder",
    evidence_mode: ["process_evidence", "result_evidence"],
    topic_domain: "product_development",
    attention_hook: ["timeliness", "authority", "stakes", "proof"],
    outcome_driver: ["follows", "profile_clicks", "clicks"],
    pattern_notes:
      "Uses Linear update as validation for execution-first product thesis and introduces Foundry.",
    tweet_text: "linear’s latest update makes one thing clear...",
    drive_link:
      "https://drive.google.com/drive/folders/1z3lOi0Ctk1O0s30brnD0jYZZO7tyFJHd?usp=share_link",
    impressions: 44,
    likes: 1,
    replies: null,
    reposts: null,
    post_link: "https://x.com/levisdesign/status/2036767137105432578?s=20",
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
  });

  return {
    user: userId,
    platform: row.platform,
    externalId: String(row.id),
    date: new Date(`${row.date}T12:00:00.000Z`),
    primary_job: row.primary_job as IContent["primary_job"],
    secondary_jobs: row.secondary_jobs as IContent["secondary_jobs"],
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
    text: row.tweet_text,
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
