import type { IPlatformFollowers, Platform } from "@/app/User";
import { USER_FOLLOWER_PLATFORMS } from "@/lib/platforms";

const ALLOWED = new Set<string>(USER_FOLLOWER_PLATFORMS);

/** Parse API/body input into valid follower rows for User.create / $set. */
export function normalizeFollowersInput(
  input: unknown,
): IPlatformFollowers[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const out: IPlatformFollowers[] = [];
  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const r = row as {
      platform?: string;
      count?: unknown;
    };
    if (!r.platform || !ALLOWED.has(r.platform)) continue;
    const count = Number(r.count);
    if (!Number.isFinite(count) || count < 0) continue;
    out.push({
      platform: r.platform as Platform,
      count: Math.floor(count),
      lastUpdated: new Date(),
    });
  }
  return out;
}
