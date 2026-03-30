/**
 * Maps a CSV row (column headers from spreadsheet export) to the JSON body
 * accepted by `createContentDocument` / POST /api/content.
 *
 * Headers are matched case-insensitively; spaces → underscores.
 * List fields use `|` between values (e.g. secondary_jobs: "Invite | Prove").
 *
 * Supported spreadsheet aliases (e.g. Book1 export): `id` → externalId,
 * `urls` → url, `media_urls` → media_url.
 */

export function normalizeCsvHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

function findValue(
  row: Record<string, string>,
  ...aliases: string[]
): string | undefined {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const target = normalizeCsvHeader(alias);
    const k = keys.find((key) => normalizeCsvHeader(key) === target);
    if (k != null) {
      const v = row[k];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
  }
  return undefined;
}

function splitLists(s: string | undefined): string[] | undefined {
  if (!s?.trim()) return undefined;
  return s
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseNum(s: string | undefined, fallback = 0): number {
  if (s == null || s === "") return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeMediaUrlField(
  s: string | undefined,
  externalId: string | undefined,
): string | undefined {
  if (!s?.trim()) return undefined;
  const t = s.trim();
  if (externalId != null && t === String(externalId).trim()) return undefined;
  if (t.includes("|")) {
    return t
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean)
      .join(" | ");
  }
  return t;
}

/**
 * Build one API payload from a CSV row. Pass `defaultUserId` when the sheet
 * has no per-row `userId` column.
 */
export function csvRowToContentBody(
  row: Record<string, string>,
  defaultUserId: string,
): Record<string, unknown> {
  const userId = findValue(row, "userId", "user_id") ?? defaultUserId;

  const secondaryJobs = splitLists(
    findValue(row, "secondary_jobs", "secondary jobs"),
  );
  const secondaryMechanics = splitLists(
    findValue(row, "secondary_format_mechanics", "secondary format mechanics"),
  );
  const evidenceMode = splitLists(findValue(row, "evidence_mode", "evidence mode"));
  const attentionHook = splitLists(findValue(row, "attention_hook", "attention hook"));
  const outcomeDriver = splitLists(findValue(row, "outcome_driver", "outcome driver"));

  const externalId =
    findValue(row, "externalId", "external_id", "post_id") ??
    findValue(row, "id");

  const mediaUrlRaw = findValue(
    row,
    "media_url",
    "media url",
    "media_urls",
    "media urls",
  );

  const mediaUrl = normalizeMediaUrlField(mediaUrlRaw, externalId);

  return {
    userId,
    platform: findValue(row, "platform"),
    externalId,
    date:
      findValue(row, "date", "posted_at", "posted at", "timestamp") ??
      new Date().toISOString(),
    text: findValue(row, "text", "body", "content", "caption") ?? "",
    url:
      findValue(
        row,
        "url",
        "urls",
        "link",
        "post_url",
        "post url",
        "permalink",
      ) ?? "",
    impressions: parseNum(findValue(row, "impressions", "views")),
    likes: parseNum(findValue(row, "likes")),
    replies: parseNum(findValue(row, "replies", "comments")),
    reposts: parseNum(findValue(row, "reposts", "retweets")),
    saves: parseNum(findValue(row, "saves")),
    followerGain: parseNum(findValue(row, "followerGain", "follower_gain")),
    sent: parseNum(findValue(row, "sent")),
    primary_job: findValue(row, "primary_job", "primary job"),
    ...(secondaryJobs?.length ? { secondary_jobs: secondaryJobs } : {}),
    content_object: findValue(row, "content_object", "content object"),
    primary_format_mechanic: findValue(
      row,
      "primary_format_mechanic",
      "primary format mechanic",
    ),
    ...(secondaryMechanics?.length
      ? { secondary_format_mechanics: secondaryMechanics }
      : {}),
    interaction_mode: findValue(row, "interaction_mode", "interaction mode"),
    retrieval_mode: findValue(row, "retrieval_mode", "retrieval mode"),
    authorship_mode: findValue(row, "authorship_mode", "authorship mode"),
    ...(evidenceMode?.length ? { evidence_mode: evidenceMode } : {}),
    topic_domain: findValue(row, "topic_domain", "topic domain"),
    ...(attentionHook?.length ? { attention_hook: attentionHook } : {}),
    ...(outcomeDriver?.length ? { outcome_driver: outcomeDriver } : {}),
    pattern_notes: findValue(row, "pattern_notes", "pattern notes"),
    ...(mediaUrl ? { media_url: mediaUrl } : {}),
  };
}

/** Column order aligned with Book1 spreadsheet bulk import; `id` maps to externalId. */
export const CONTENT_CSV_TEMPLATE_HEADERS = [
  "id",
  "userId",
  "platform",
  "date",
  "primary_job",
  "secondary_jobs",
  "content_object",
  "primary_format_mechanic",
  "secondary_format_mechanics",
  "interaction_mode",
  "retrieval_mode",
  "authorship_mode",
  "evidence_mode",
  "topic_domain",
  "attention_hook",
  "outcome_driver",
  "pattern_notes",
  "text",
  "media_urls",
  "impressions",
  "likes",
  "replies",
  "reposts",
  "saves",
  "followerGain",
  "sent",
  "urls",
] as const;
