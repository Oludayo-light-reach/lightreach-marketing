import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Content, { normalizeMetrics } from "@/app/Content";
import User from "@/app/User";

export const runtime = "nodejs";

/** Posted-at: `date` (new) or legacy `timestamp` */
const D = { $ifNull: ["$date", "$timestamp"] };

/** Flat metrics (new) or legacy nested `metrics` */
const IMP = { $ifNull: ["$impressions", { $ifNull: ["$metrics.impressions", 0] }] };
const LIK = { $ifNull: ["$likes", { $ifNull: ["$metrics.likes", 0] }] };
const REP = { $ifNull: ["$replies", { $ifNull: ["$metrics.replies", 0] }] };
const REPST = { $ifNull: ["$reposts", { $ifNull: ["$metrics.reposts", 0] }] };
const FG = { $ifNull: ["$followerGain", { $ifNull: ["$metrics.followerGain", 0] }] };
const METRIC_SAVES = {
  $ifNull: [
    "$saves",
    { $ifNull: ["$metrics.saves", { $ifNull: ["$metrics.saved", 0] }] },
  ],
};

const CONTENT_OBJECT_VALUES = new Set([
  "single_post",
  "short_video",
  "carousel",
  "thread",
  "quote_post",
]);

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function mongoDayIndexToLabel(day: number): string {
  const idx = day >= 1 && day <= 7 ? day - 1 : 0;
  return DAY_LABELS[idx] ?? "?";
}

type MatchFilter = {
  from: Date;
  to: Date;
  platforms?: string[];
  userId?: string;
  contentObject?: string;
  minImpressions?: number;
};

function buildMatch(f: MatchFilter): Record<string, unknown> {
  const exprParts: Record<string, unknown>[] = [
    { $gte: [D, f.from] },
    { $lte: [D, f.to] },
  ];
  if (f.minImpressions != null && f.minImpressions > 0) {
    exprParts.push({
      $gte: [IMP, f.minImpressions],
    });
  }
  const match: Record<string, unknown> = {
    $expr: { $and: exprParts },
  };
  if (f.platforms?.length) {
    match.platform = { $in: f.platforms };
  }
  if (f.userId) {
    match.user = new Types.ObjectId(f.userId);
  }
  if (f.contentObject) {
    match.content_object = f.contentObject;
  }
  return match;
}

async function aggregateTotals(match: Record<string, unknown>) {
  const [agg] = await Content.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalImpressions: { $sum: IMP },
        totalLikes: { $sum: LIK },
        totalReplies: { $sum: REP },
        totalReposts: { $sum: REPST },
        totalSaves: { $sum: METRIC_SAVES },
        followerGrowth: { $sum: FG },
        postCount: { $sum: 1 },
      },
    },
  ]);
  return agg;
}

function textPreview(c: Record<string, unknown>): string {
  const t = c.text;
  if (typeof t === "string") return t;
  if (t && typeof t === "object" && "body" in t) {
    return String((t as { body?: string }).body ?? "");
  }
  return "";
}

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const to = toParam ? endOfDay(new Date(toParam)) : endOfDay(new Date());
    const from = fromParam
      ? startOfDay(new Date(fromParam))
      : startOfDay(new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000));

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const platformRaw = searchParams.get("platform");
    const platforms = platformRaw
      ? platformRaw
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean)
      : undefined;

    const userId = searchParams.get("userId")?.trim() || undefined;
    if (userId && !Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const contentObject = searchParams.get("contentObject")?.trim() || undefined;
    if (contentObject && !CONTENT_OBJECT_VALUES.has(contentObject)) {
      return NextResponse.json({ error: "Invalid contentObject" }, { status: 400 });
    }

    const minImpressionsRaw = searchParams.get("minImpressions");
    let minImpressions: number | undefined;
    if (minImpressionsRaw != null && minImpressionsRaw !== "") {
      const n = Number(minImpressionsRaw);
      if (Number.isNaN(n) || n < 0) {
        return NextResponse.json({ error: "Invalid minImpressions" }, { status: 400 });
      }
      minImpressions = n;
    }

    const comparePrev =
      searchParams.get("compare") === "1" || searchParams.get("compare") === "true";

    const topLimitRaw = searchParams.get("topLimit");
    let topLimit = 20;
    if (topLimitRaw != null) {
      const n = parseInt(topLimitRaw, 10);
      if (!Number.isFinite(n) || n < 1) {
        return NextResponse.json({ error: "Invalid topLimit" }, { status: 400 });
      }
      topLimit = Math.min(50, n);
    }

    const filter: MatchFilter = {
      from,
      to,
      platforms,
      userId,
      contentObject,
      minImpressions,
    };

    const match = buildMatch(filter);

    const agg = await aggregateTotals(match);
    const totalImpressions = agg?.totalImpressions ?? 0;
    const totalLikes = agg?.totalLikes ?? 0;
    const totalReplies = agg?.totalReplies ?? 0;
    const totalReposts = agg?.totalReposts ?? 0;
    const totalSaves = agg?.totalSaves ?? 0;
    const engagementActions = totalLikes + totalReplies + totalReposts;
    const engagementRate =
      totalImpressions > 0 ? (engagementActions / totalImpressions) * 100 : 0;
    const saveRate = totalImpressions > 0 ? (totalSaves / totalImpressions) * 100 : 0;
    const postCount = agg?.postCount ?? 0;
    const avgImpressionsPerPost = postCount > 0 ? totalImpressions / postCount : 0;
    const avgEngagementActionsPerPost = postCount > 0 ? engagementActions / postCount : 0;

    const daily = await Content.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            y: { $year: D },
            m: { $month: D },
            d: { $dayOfMonth: D },
          },
          impressions: { $sum: IMP },
          likes: { $sum: LIK },
          replies: { $sum: REP },
          reposts: { $sum: REPST },
          saves: { $sum: METRIC_SAVES },
          engagement: {
            $sum: {
              $add: [LIK, REP, REPST],
            },
          },
          followerGain: { $sum: FG },
          posts: { $sum: 1 },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
    ]);

    const dailySeries = daily.map((row) => {
      const { y, m, d } = row._id as { y: number; m: number; d: number };
      const label = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return {
        date: label,
        impressions: row.impressions as number,
        likes: row.likes as number,
        replies: row.replies as number,
        reposts: row.reposts as number,
        saves: row.saves as number,
        engagement: row.engagement as number,
        followerGain: row.followerGain as number,
        posts: row.posts as number,
      };
    });

    const byPlatform = await Content.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$platform",
          impressions: { $sum: IMP },
          likes: { $sum: LIK },
          replies: { $sum: REP },
          reposts: { $sum: REPST },
          saves: { $sum: METRIC_SAVES },
          followerGain: { $sum: FG },
          posts: { $sum: 1 },
          engagement: {
            $sum: {
              $add: [LIK, REP, REPST],
            },
          },
        },
      },
      { $sort: { impressions: -1 } },
    ]);

    const platformBars = byPlatform.map((p) => {
      const impressions = p.impressions as number;
      const eng = p.engagement as number;
      const er = impressions > 0 ? (eng / impressions) * 100 : 0;
      return {
        platform: (p._id as string) ?? "Unknown",
        impressions,
        posts: p.posts as number,
        likes: p.likes as number,
        replies: p.replies as number,
        reposts: p.reposts as number,
        saves: p.saves as number,
        engagement: eng,
        followerGain: p.followerGain as number,
        engagementRate: er,
        avgImpressionsPerPost:
          (p.posts as number) > 0 ? impressions / (p.posts as number) : 0,
      };
    });

    const byUser = await Content.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$user",
          impressions: { $sum: IMP },
          engagement: {
            $sum: {
              $add: [LIK, REP, REPST],
            },
          },
          posts: { $sum: 1 },
          followerGain: { $sum: FG },
        },
      },
      { $sort: { impressions: -1 } },
      { $limit: 25 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDoc",
        },
      },
      {
        $project: {
          userId: { $toString: "$_id" },
          name: {
            $ifNull: [{ $arrayElemAt: ["$userDoc.name", 0] }, "Unknown"],
          },
          impressions: 1,
          engagement: 1,
          posts: 1,
          followerGain: 1,
        },
      },
    ]);

    const byUserRows = byUser.map((u) => {
      const impressions = u.impressions as number;
      const eng = u.engagement as number;
      return {
        userId: u.userId as string,
        name: u.name as string,
        impressions,
        posts: u.posts as number,
        engagement: eng,
        followerGain: u.followerGain as number,
        engagementRate: impressions > 0 ? (eng / impressions) * 100 : 0,
        avgImpressionsPerPost:
          (u.posts as number) > 0 ? impressions / (u.posts as number) : 0,
      };
    });

    const byContentObjectAgg = await Content.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: ["$content_object", "unknown"] },
          impressions: { $sum: IMP },
          posts: { $sum: 1 },
          engagement: {
            $sum: {
              $add: [LIK, REP, REPST],
            },
          },
        },
      },
      { $sort: { impressions: -1 } },
    ]);

    const contentObjectRows = byContentObjectAgg.map((t) => ({
      contentObject: (t._id as string) ?? "unknown",
      impressions: t.impressions as number,
      posts: t.posts as number,
      engagement: t.engagement as number,
      engagementRate:
        (t.impressions as number) > 0
          ? ((t.engagement as number) / (t.impressions as number)) * 100
          : 0,
    }));

    const byDayOfWeek = await Content.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dayOfWeek: D },
          impressions: { $sum: IMP },
          posts: { $sum: 1 },
          engagement: {
            $sum: {
              $add: [LIK, REP, REPST],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dowRows = byDayOfWeek.map((row) => {
      const d = row._id as number;
      return {
        dayIndex: d,
        dayLabel: mongoDayIndexToLabel(d),
        impressions: row.impressions as number,
        posts: row.posts as number,
        engagement: row.engagement as number,
      };
    });

    const byHour = await Content.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $hour: D },
          impressions: { $sum: IMP },
          posts: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const hourRows = Array.from({ length: 24 }, (_, hour) => {
      const found = byHour.find((h) => (h._id as number) === hour);
      return {
        hour,
        label: `${String(hour).padStart(2, "0")}:00`,
        impressions: found ? (found.impressions as number) : 0,
        posts: found ? (found.posts as number) : 0,
      };
    });

    const DASHBOARD_PLATFORMS = ["X", "LinkedIn", "Instagram", "Threads"] as const;

    const dailyPlatRaw = await Content.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            y: { $year: D },
            m: { $month: D },
            d: { $dayOfMonth: D },
            platform: "$platform",
          },
          impressions: { $sum: IMP },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
    ]);

    const dailyByPlatformMap = new Map<string, Record<string, number>>();
    for (const row of dailyPlatRaw) {
      const id = row._id as {
        y: number;
        m: number;
        d: number;
        platform: string | null;
      };
      const iso = `${id.y}-${String(id.m).padStart(2, "0")}-${String(id.d).padStart(2, "0")}`;
      const plat = id.platform ?? "unknown";
      if (!dailyByPlatformMap.has(iso)) dailyByPlatformMap.set(iso, {});
      const o = dailyByPlatformMap.get(iso)!;
      o[plat] = (o[plat] ?? 0) + (row.impressions as number);
    }

    const dailyByPlatform = Array.from(dailyByPlatformMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([isoDate, plats]) => {
        const short = new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const row: Record<string, string | number> = { date: short, isoDate };
        for (const k of DASHBOARD_PLATFORMS) {
          row[k] = plats[k] ?? 0;
        }
        return row;
      });

    const weekRaw = await Content.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            y: { $isoWeekYear: D },
            w: { $isoWeek: D },
            platform: "$platform",
          },
          followerGain: { $sum: FG },
        },
      },
      { $sort: { "_id.y": 1, "_id.w": 1 } },
    ]);

    const weekMap = new Map<string, Record<string, number>>();
    for (const row of weekRaw) {
      const id = row._id as {
        y: number;
        w: number;
        platform: string | null;
      };
      const key = `${id.y}-W${String(id.w).padStart(2, "0")}`;
      const plat = id.platform ?? "unknown";
      if (!weekMap.has(key)) weekMap.set(key, {});
      const o = weekMap.get(key)!;
      o[plat] = (o[plat] ?? 0) + (row.followerGain as number);
    }

    const weeklyFollowerByPlatform = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([isoWeek, plats], idx) => {
        const row: Record<string, string | number> = {
          week: `W${idx + 1}`,
          isoWeek,
        };
        for (const k of DASHBOARD_PLATFORMS) {
          row[k] = plats[k] ?? 0;
        }
        return row;
      });

    const byCategoryRaw = await Content.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: ["$topic_domain", "Uncategorized"] },
          posts: { $sum: 1 },
          impressions: { $sum: IMP },
        },
      },
      { $sort: { impressions: -1 } },
      { $limit: 24 },
    ]);

    const byCategory = byCategoryRaw.map((c) => {
      const posts = c.posts as number;
      const impressions = c.impressions as number;
      return {
        category: String(c._id),
        posts,
        avgImpression: posts > 0 ? impressions / posts : 0,
      };
    });

    const followersAgg = await User.aggregate([
      { $unwind: { path: "$followers", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: "$followers.platform",
          count: { $sum: "$followers.count" },
        },
      },
    ]);

    const followersByPlatform: Record<string, number> = {};
    for (const f of followersAgg) {
      followersByPlatform[String(f._id)] = f.count as number;
    }

    const topPostsRaw = await Content.find(match).populate("user", "name").lean();
    const sortedTop = [...topPostsRaw].sort(
      (a, b) =>
        normalizeMetrics(b as unknown as Record<string, unknown>).impressions -
        normalizeMetrics(a as unknown as Record<string, unknown>).impressions,
    );
    const top = sortedTop.slice(0, topLimit).map((doc) => {
      const c = doc as unknown as Record<string, unknown>;
      const m = normalizeMetrics(c);
      const rawDate = c.date ?? c.timestamp;
      const ts = rawDate instanceof Date ? rawDate : new Date(String(rawDate));
      return {
        id: String(c._id),
        title: textPreview(c).slice(0, 120) || "(no text)",
        impressions: m.impressions,
        likes: m.likes,
        replies: m.replies,
        reposts: m.reposts,
        saves: m.saves,
        platform: c.platform as string | undefined,
        content_object: c.content_object as string | undefined,
        date: Number.isNaN(ts.getTime()) ? new Date(0).toISOString() : ts.toISOString(),
        userName:
          c.user && typeof c.user === "object" && "name" in c.user
            ? (c.user as { name: string }).name
            : undefined,
      };
    });

    const users = await User.find().lean();
    const followerGrowthTotal = users.reduce((acc, u) => {
      const sub = (u.followers ?? []).reduce((a, f) => a + (f.count ?? 0), 0);
      return acc + sub;
    }, 0);

    let comparison: {
      previousRange: { from: string; to: string };
      totals: {
        totalImpressions: number;
        engagementRate: number;
        postCount: number;
        followerGrowthFromContent: number;
      };
      delta: {
        impressionsPct: number | null;
        engagementRatePts: number | null;
        postsPct: number | null;
        followerGrowthPct: number | null;
      };
    } | null = null;

    if (comparePrev) {
      const span = to.getTime() - from.getTime();
      const prevTo = new Date(from.getTime() - 1);
      const prevFrom = new Date(prevTo.getTime() - span);
      const prevMatch = buildMatch({
        ...filter,
        from: prevFrom,
        to: prevTo,
      });
      const prevAgg = await aggregateTotals(prevMatch);
      const pImpressions = prevAgg?.totalImpressions ?? 0;
      const pLikes = prevAgg?.totalLikes ?? 0;
      const pReplies = prevAgg?.totalReplies ?? 0;
      const pReposts = prevAgg?.totalReposts ?? 0;
      const pEng = pLikes + pReplies + pReposts;
      const pER = pImpressions > 0 ? (pEng / pImpressions) * 100 : 0;
      const pPosts = prevAgg?.postCount ?? 0;
      const pFg = prevAgg?.followerGrowth ?? 0;

      const pct = (curr: number, prev: number) =>
        prev === 0 ? (curr === 0 ? 0 : null) : ((curr - prev) / prev) * 100;

      comparison = {
        previousRange: { from: prevFrom.toISOString(), to: prevTo.toISOString() },
        totals: {
          totalImpressions: pImpressions,
          engagementRate: pER,
          postCount: pPosts,
          followerGrowthFromContent: pFg,
        },
        delta: {
          impressionsPct: pct(totalImpressions, pImpressions),
          engagementRatePts:
            pER === 0 && engagementRate === 0
              ? 0
              : engagementRate - pER,
          postsPct: pct(postCount, pPosts),
          followerGrowthPct: pct(agg?.followerGrowth ?? 0, pFg),
        },
      };
    }

    return NextResponse.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      filters: {
        platforms: platforms ?? null,
        userId: userId ?? null,
        contentObject: contentObject ?? null,
        minImpressions: minImpressions ?? null,
        compareWithPrevious: comparePrev,
        topLimit,
      },
      totals: {
        totalImpressions,
        totalLikes,
        totalReplies,
        totalReposts,
        totalSaves,
        engagementRate,
        saveRate,
        followerGrowthFromContent: agg?.followerGrowth ?? 0,
        postCount,
        totalFollowerSnapshot: followerGrowthTotal,
        avgImpressionsPerPost,
        avgEngagementActionsPerPost,
      },
      daily: dailySeries,
      byPlatform: platformBars,
      byUser: byUserRows,
      byContentObject: contentObjectRows,
      byDayOfWeek: dowRows,
      byHour: hourRows,
      topPosts: top,
      comparison,
      dailyByPlatform,
      weeklyFollowerByPlatform,
      byCategory,
      followersByPlatform,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to compute analytics" },
      { status: 500 },
    );
  }
}
