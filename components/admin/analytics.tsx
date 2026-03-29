"use client";

import { DateFieldModal } from "@/components/date-field-modal";
import { PLATFORMS, chipClassForPlatform } from "@/lib/platforms";
import { format, subDays } from "date-fns";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CONTENT_TYPES = ["post", "reply", "quote", "thread", "reel"] as const;

const chartTooltip = {
  contentStyle: {
    backgroundColor: "#09090b",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "10px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    padding: "10px 14px",
  },
  labelStyle: {
    color: "#71717a",
    fontSize: 11,
    fontWeight: 500,
    marginBottom: 4,
  },
  itemStyle: { color: "#e4e4e7", fontSize: 12 },
  cursor: { fill: "rgba(255,255,255,0.03)" },
};

const PIE_COLORS = ["#f472b6", "#fb923c", "#2dd4bf"];

export type AnalyticsProps = {
  title: string;
  description?: string;
};

type AnalyticsPayload = {
  range: { from: string; to: string };
  filters: {
    platforms: string[] | null;
    userId: string | null;
    type: string | null;
    minImpressions: number | null;
    compareWithPrevious: boolean;
    topLimit: number;
  };
  totals: {
    totalImpressions: number;
    totalLikes: number;
    totalReplies: number;
    totalReposts: number;
    totalSaves: number;
    engagementRate: number;
    saveRate: number;
    followerGrowthFromContent: number;
    postCount: number;
    totalFollowerSnapshot: number;
    avgImpressionsPerPost: number;
    avgEngagementActionsPerPost: number;
  };
  daily: {
    date: string;
    impressions: number;
    likes: number;
    replies: number;
    reposts: number;
    saves: number;
    engagement: number;
    followerGain: number;
    posts: number;
  }[];
  byPlatform: {
    platform: string;
    impressions: number;
    posts: number;
    likes: number;
    replies: number;
    reposts: number;
    saves: number;
    engagement: number;
    followerGain: number;
    engagementRate: number;
    avgImpressionsPerPost: number;
  }[];
  byUser: {
    userId: string;
    name: string;
    impressions: number;
    posts: number;
    engagement: number;
    followerGain: number;
    engagementRate: number;
    avgImpressionsPerPost: number;
  }[];
  byContentType: {
    type: string;
    impressions: number;
    posts: number;
    engagement: number;
    engagementRate: number;
  }[];
  byDayOfWeek: {
    dayIndex: number;
    dayLabel: string;
    impressions: number;
    posts: number;
    engagement: number;
  }[];
  byHour: { hour: number; label: string; impressions: number; posts: number }[];
  topPosts: {
    id: string;
    title: string;
    impressions: number;
    likes: number;
    replies: number;
    reposts: number;
    saves: number;
    platform?: string;
    type?: string;
    timestamp: string;
    userName?: string;
  }[];
  comparison: {
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
  } | null;
};

function buildQuery(params: {
  from: string;
  to: string;
  platforms: string[];
  userId: string;
  contentType: string;
  minImpressions: string;
  compare: boolean;
  topLimit: number;
}) {
  const q = new URLSearchParams({ from: params.from, to: params.to });
  if (params.platforms.length > 0)
    q.set("platform", params.platforms.join(","));
  if (params.userId) q.set("userId", params.userId);
  if (params.contentType) q.set("type", params.contentType);
  if (params.minImpressions.trim())
    q.set("minImpressions", params.minImpressions.trim());
  if (params.compare) q.set("compare", "1");
  q.set("topLimit", String(params.topLimit));
  return q.toString();
}

function fmtDeltaPct(v: number | null): {
  text: string;
  positive: boolean | null;
} {
  if (v === null) return { text: "—", positive: null };
  return { text: `${v > 0 ? "+" : ""}${v.toFixed(1)}%`, positive: v > 0 };
}

function fmtDeltaPts(v: number | null): {
  text: string;
  positive: boolean | null;
} {
  if (v === null) return { text: "—", positive: null };
  return { text: `${v > 0 ? "+" : ""}${v.toFixed(2)} pts`, positive: v > 0 };
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconEye() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconHeart() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function IconMessageCircle() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function IconRepeat() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
function IconBookmark() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconTrendingUp() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
function IconBarChart() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}
function IconActivity() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminAnalytics({ title, description }: AnalyticsProps) {
  const today = useMemo(() => new Date(), []);
  const defaultTo = format(today, "yyyy-MM-dd");
  const defaultFrom = format(subDays(today, 29), "yyyy-MM-dd");

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [userId, setUserId] = useState("");
  const [contentType, setContentType] = useState("");
  const [minImpressions, setMinImpressions] = useState("");
  const [compare, setCompare] = useState(false);
  const [topLimit, setTopLimit] = useState(20);

  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/users");
        const json = (await res.json()) as {
          users?: { id: string; name: string }[];
        };
        if (res.ok && json.users) setUsers(json.users);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQuery({
        from,
        to,
        platforms,
        userId,
        contentType,
        minImpressions,
        compare,
        topLimit,
      });
      const res = await fetch(`/api/analytics?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load analytics");
      setData(json as AnalyticsPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [
    from,
    to,
    platforms,
    userId,
    contentType,
    minImpressions,
    compare,
    topLimit,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const onPlatformMultiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPlatforms(Array.from(e.target.selectedOptions).map((o) => o.value));
  };

  const lineData = data?.daily ?? [];
  const barData = data?.byPlatform ?? [];

  const filterPanel = (
    <div className="w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#111113] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#3f3f46]">
          Filters &amp; controls
        </p>
        <div className="mx-2 h-px min-w-8 flex-1 bg-[rgba(255,255,255,0.06)]" />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg bg-[#38bdf8] px-4 py-1.5 text-xs font-semibold text-[#0c1a2b] shadow-[0_0_20px_rgba(56,189,248,0.2)] transition hover:bg-[#7dd3fc] active:scale-[0.98]"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              setFrom(defaultFrom);
              setTo(defaultTo);
              setPlatforms([]);
              setUserId("");
              setContentType("");
              setMinImpressions("");
              setCompare(false);
              setTopLimit(20);
            }}
            className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#18181b] px-4 py-1.5 text-xs text-[#71717a] transition hover:border-[#3f3f46] hover:text-[#e4e4e7]"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <FilterField label="From">
          <DateFieldModal
            label="From"
            mode="date"
            value={from}
            onChange={setFrom}
          />
        </FilterField>
        <FilterField label="To">
          <DateFieldModal label="To" mode="date" value={to} onChange={setTo} />
        </FilterField>
        <FilterField label="User">
          <StyledSelect
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </StyledSelect>
        </FilterField>
        <FilterField label="Content type">
          <StyledSelect
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
          >
            <option value="">All types</option>
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </StyledSelect>
        </FilterField>
        <FilterField label="Min impressions">
          <input
            type="number"
            min={0}
            placeholder="No minimum"
            value={minImpressions}
            onChange={(e) => setMinImpressions(e.target.value)}
            className="w-full rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#18181b] px-3 py-2 text-sm text-[#e4e4e7] placeholder:text-[#52525b] focus:border-sky-400/40 focus:outline-none focus:ring-1 focus:ring-sky-400/25 transition"
          />
        </FilterField>
        <FilterField label="Top posts count">
          <StyledSelect
            value={topLimit}
            onChange={(e) => setTopLimit(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </StyledSelect>
        </FilterField>
        <div className="sm:col-span-2 xl:col-span-2">
          <FilterField label="Platforms (hold ⌘ / Ctrl for multi-select)">
            <select
              multiple
              value={platforms}
              onChange={onPlatformMultiChange}
              className="w-full rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#18181b] px-2 py-1.5 text-sm text-[#e4e4e7] focus:border-sky-400/40 focus:outline-none focus:ring-1 focus:ring-sky-400/25 transition"
              size={4}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </FilterField>
        </div>
        <div className="flex items-end pb-1">
          <label className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#18181b]/80 px-3 py-2 transition hover:border-[#3f3f46]">
            <div className="relative">
              <input
                type="checkbox"
                checked={compare}
                onChange={(e) => setCompare(e.target.checked)}
                className="peer sr-only"
              />
              <div className="flex h-4 w-4 items-center justify-center rounded border border-[#52525b] bg-[#18181b] transition peer-checked:border-[#38bdf8] peer-checked:bg-[#38bdf8]">
                {compare && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="white"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-xs leading-tight text-[#a1a1aa]">
              Compare to previous period
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  const errorBlock = error && (
    <div className="flex items-start gap-3 rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 shrink-0 text-red-400"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {error}
    </div>
  );

  const loadingBlock = loading && (
    <div className="flex items-center gap-2 text-sm text-[#71717a]">
      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#3f3f46] border-t-[#38bdf8]" />
      Loading analytics…
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-7">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(255,255,255,0.06)] pb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-violet-300">
              Analytics
            </span>
            <h1 className="text-xl font-bold tracking-tight text-[#e4e4e7] sm:text-[22px]">
              Data explorer
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#71717a]">
            {description ?? title}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="font-dm-mono rounded-md border border-[rgba(255,255,255,0.08)] bg-[#18181b] px-2.5 py-1 text-[11px] text-[#a1a1aa]">
              {from} → {to}
            </span>
            <span className="text-[11px] text-[#52525b]">
              UTC · filters apply to all sections below
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-[9px] border border-[rgba(255,255,255,0.07)] bg-[#18181b] px-3.5 py-1.5 text-xs font-semibold text-[#a1a1aa] transition hover:border-[#3f3f46] hover:text-[#e4e4e7]"
          >
            ← Overview
          </Link> */}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-[9px] border border-[rgba(255,255,255,0.07)] bg-[#18181b] px-3.5 py-1.5 text-xs font-semibold text-[#71717a] transition hover:border-[#3f3f46] hover:text-[#e4e4e7]"
            disabled
            title="Coming soon"
          >
            Export
          </button>
        </div>
      </div>

      {filterPanel}

      <div className="rounded-2xl border border-violet-500/20 bg-[linear-gradient(165deg,rgba(139,92,246,0.08)_0%,rgba(17,17,19,0.98)_42%)] p-5 sm:p-6 lg:p-8">
        {errorBlock}
        {loadingBlock}
        {data && !loading && (
          <AnalyticsMainColumn
            data={data}
            lineData={lineData}
            barData={barData}
            topLimit={topLimit}
          />
        )}
      </div>
    </div>
  );
}

function AnalyticsMainColumn({
  data,
  lineData,
  barData,
  topLimit,
}: {
  data: AnalyticsPayload;
  lineData: AnalyticsPayload["daily"];
  barData: AnalyticsPayload["byPlatform"];
  topLimit: number;
}) {
  const lineWithRates = useMemo(
    () =>
      lineData.map((d) => ({
        ...d,
        engagementRate:
          d.impressions > 0
            ? ((d.likes + d.replies + d.reposts) / d.impressions) * 100
            : 0,
      })),
    [lineData],
  );

  const engagementMix = useMemo(() => {
    const t = data.totals;
    return [
      { name: "Likes", value: t.totalLikes },
      { name: "Replies", value: t.totalReplies },
      { name: "Reposts", value: t.totalReposts },
    ].filter((r) => r.value > 0);
  }, [data.totals]);

  const bestDay = useMemo(() => {
    if (!data.byDayOfWeek.length) return null;
    return data.byDayOfWeek.reduce((a, b) =>
      b.impressions > a.impressions ? b : a,
    );
  }, [data.byDayOfWeek]);

  const peakHour = useMemo(() => {
    if (!data.byHour.length) return null;
    return data.byHour.reduce((a, b) => (b.posts > a.posts ? b : a));
  }, [data.byHour]);

  const topUsersChart = useMemo(
    () =>
      data.byUser.slice(0, 10).map((u) => ({
        shortName: u.name.length > 20 ? `${u.name.slice(0, 18)}…` : u.name,
        impressions: u.impressions,
        engagementRate: u.engagementRate,
      })),
    [data.byUser],
  );

  const t = data.totals;
  const imp = t.totalImpressions;
  const likeRate = imp > 0 ? (t.totalLikes / imp) * 100 : 0;
  const replyRate = imp > 0 ? (t.totalReplies / imp) * 100 : 0;
  const repostRate = imp > 0 ? (t.totalReposts / imp) * 100 : 0;
  const savesPerPost = t.postCount > 0 ? t.totalSaves / t.postCount : 0;
  const avgPostsPerDay =
    lineData.length > 0 ? t.postCount / lineData.length : 0;

  return (
    <div className="flex flex-col gap-8">
      {/* ── Comparison Banner ── */}
      {data.comparison && (
        <div className="rounded-xl border border-[rgba(167,139,250,0.15)] bg-gradient-to-r from-violet-500/[0.06] to-sky-500/[0.06] p-5 sm:p-6">
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-500/15 text-violet-300">
              <IconTrendingUp />
            </div>
            <h2 className="text-sm font-semibold text-[#e4e4e7]">
              vs previous period
            </h2>
          </div>
          <p className="mb-4 ml-7 text-xs text-[#71717a]">
            {format(new Date(data.comparison.previousRange.from), "PP")} –{" "}
            {format(new Date(data.comparison.previousRange.to), "PP")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Impressions",
                ...fmtDeltaPct(data.comparison.delta.impressionsPct),
              },
              {
                label: "Engagement rate",
                ...fmtDeltaPts(data.comparison.delta.engagementRatePts),
              },
              {
                label: "Posts",
                ...fmtDeltaPct(data.comparison.delta.postsPct),
              },
              {
                label: "Follower growth",
                ...fmtDeltaPct(data.comparison.delta.followerGrowthPct),
              },
            ].map((d) => (
              <div
                key={d.label}
                className="rounded-[10px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)] px-3.5 py-3"
              >
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#71717a]">
                  {d.label}
                </p>
                <p
                  className={`font-dm-mono text-base font-bold ${d.positive === null ? "text-[#71717a]" : d.positive ? "text-emerald-400" : "text-red-400"}`}
                >
                  {d.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KPI Grid ── */}
      <section className="space-y-3">
        <SectionLabel
          icon={<IconBarChart />}
          label="Key metrics"
          hint="Totals and rates for the selected range"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <MetricCard
            label="Total impressions"
            value={data.totals.totalImpressions.toLocaleString()}
            icon={<IconEye />}
            color="sky"
          />
          <MetricCard
            label="Engagement rate"
            value={`${data.totals.engagementRate.toFixed(2)}%`}
            hint="(likes + replies + reposts) / imp."
            icon={<IconActivity />}
            color="violet"
          />
          <MetricCard
            label="Save rate"
            value={`${data.totals.saveRate.toFixed(2)}%`}
            hint="saves / impressions"
            icon={<IconBookmark />}
            color="amber"
          />
          <MetricCard
            label="Posts published"
            value={data.totals.postCount.toLocaleString()}
            icon={<IconBarChart />}
            color="indigo"
          />
          <MetricCard
            label="Total likes"
            value={data.totals.totalLikes.toLocaleString()}
            icon={<IconHeart />}
            color="pink"
          />
          <MetricCard
            label="Total replies"
            value={data.totals.totalReplies.toLocaleString()}
            icon={<IconMessageCircle />}
            color="orange"
          />
          <MetricCard
            label="Total reposts"
            value={data.totals.totalReposts.toLocaleString()}
            icon={<IconRepeat />}
            color="teal"
          />
          <MetricCard
            label="Total saves"
            value={data.totals.totalSaves.toLocaleString()}
            icon={<IconBookmark />}
            color="yellow"
          />
          <MetricCard
            label="Follower growth"
            value={`${data.totals.followerGrowthFromContent >= 0 ? "+" : ""}${data.totals.followerGrowthFromContent.toLocaleString()}`}
            icon={<IconUsers />}
            color="emerald"
            accent
          />
          <MetricCard
            label="Follower snapshot"
            value={data.totals.totalFollowerSnapshot.toLocaleString()}
            hint="Sum of user follower counts"
            icon={<IconUsers />}
            color="zinc"
          />
          <MetricCard
            label="Avg imp. / post"
            value={data.totals.avgImpressionsPerPost.toFixed(1)}
            icon={<IconEye />}
            color="cyan"
          />
          <MetricCard
            label="Avg engagement / post"
            value={data.totals.avgEngagementActionsPerPost.toFixed(2)}
            icon={<IconActivity />}
            color="fuchsia"
          />
          <MetricCard
            label="Like rate"
            value={`${likeRate.toFixed(2)}%`}
            hint="likes ÷ impressions"
            icon={<IconHeart />}
            color="pink"
          />
          <MetricCard
            label="Reply rate"
            value={`${replyRate.toFixed(2)}%`}
            hint="replies ÷ impressions"
            icon={<IconMessageCircle />}
            color="orange"
          />
          <MetricCard
            label="Repost rate"
            value={`${repostRate.toFixed(2)}%`}
            hint="reposts ÷ impressions"
            icon={<IconRepeat />}
            color="teal"
          />
          <MetricCard
            label="Saves per post"
            value={savesPerPost.toFixed(2)}
            hint="total saves ÷ posts"
            icon={<IconBookmark />}
            color="amber"
          />
        </div>
      </section>

      {/* ── Quick highlights ── */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#111113] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#52525b]">
            Best day (reach)
          </p>
          <p className="mt-1.5 text-lg font-semibold text-[#e4e4e7]">
            {bestDay?.dayLabel ?? "—"}
          </p>
          <p className="mt-0.5 text-[11px] text-[#71717a]">
            {bestDay
              ? `${bestDay.impressions.toLocaleString()} impressions`
              : "No data"}
          </p>
        </div>
        <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#111113] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#52525b]">
            Peak posting hour (UTC)
          </p>
          <p className="mt-1.5 text-lg font-semibold text-[#e4e4e7]">
            {peakHour?.label ?? "—"}
          </p>
          <p className="mt-0.5 text-[11px] text-[#71717a]">
            {peakHour ? `${peakHour.posts} posts in this hour` : "No data"}
          </p>
        </div>
        <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#111113] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#52525b]">
            Active platforms
          </p>
          <p className="mt-1.5 text-lg font-semibold text-[#e4e4e7]">
            {barData.length}
          </p>
          <p className="mt-0.5 text-[11px] text-[#71717a]">
            With content in range
          </p>
        </div>
        <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#111113] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#52525b]">
            Avg posts / day
          </p>
          <p className="mt-1.5 text-lg font-semibold text-[#e4e4e7]">
            {avgPostsPerDay.toFixed(2)}
          </p>
          <p className="mt-0.5 text-[11px] text-[#71717a]">
            Over {lineData.length} day{lineData.length === 1 ? "" : "s"} in
            range
          </p>
        </div>
      </section>

      {/* ── Composition & mix ── */}
      <section className="space-y-4">
        <SectionLabel
          icon={<IconActivity />}
          label="Composition"
          hint="How engagement and formats split"
        />
        <div className="grid gap-5 lg:grid-cols-2">
          <ChartCard
            title="Engagement mix"
            subtitle="Share of likes, replies, and reposts (volume)"
          >
            {engagementMix.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[#71717a]">
                No engagement actions in range
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={engagementMix}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {engagementMix.map((entry, i) => (
                      <Cell
                        key={`${entry.name}-${i}`}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltip} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard
            title="Impressions by content type"
            subtitle="Which formats drive reach"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.byContentType}
                layout="vertical"
                margin={{ left: 4, right: 12, top: 4, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="#27272a"
                  strokeDasharray="4 4"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="type"
                  width={72}
                  tick={{ fill: "#71717a", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...chartTooltip} />
                <Bar
                  dataKey="impressions"
                  name="Impressions"
                  fill="#8b5cf6"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        {topUsersChart.length > 0 && (
          <ChartCard
            title="Top users by impressions"
            subtitle="Up to 10 creators in this range"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topUsersChart}
                layout="vertical"
                margin={{ left: 4, right: 12, top: 4, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="#27272a"
                  strokeDasharray="4 4"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  width={100}
                  tick={{ fill: "#71717a", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...chartTooltip} />
                <Bar
                  dataKey="impressions"
                  name="Impressions"
                  fill="#38bdf8"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </section>

      {/* ── Daily rates & saves ── */}
      <section className="space-y-4">
        <SectionLabel
          icon={<IconTrendingUp />}
          label="Daily rates & saves"
          hint="Per-day engagement rate and bookmark activity"
        />
        <div className="grid gap-5 lg:grid-cols-2">
          <ChartCard
            title="Engagement rate over time"
            subtitle="(likes + replies + reposts) ÷ impressions, %"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={lineWithRates}
                margin={{ left: -10, right: 4, top: 4, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="#27272a"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                />
                <Tooltip
                  {...chartTooltip}
                  formatter={(v) =>
                    typeof v === "number" ? `${v.toFixed(2)}%` : String(v ?? "")
                  }
                />
                <Line
                  type="monotone"
                  dataKey="engagementRate"
                  name="Eng. rate"
                  stroke="#c084fc"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard
            title="Saves over time"
            subtitle="Bookmark actions per day"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={lineData}
                margin={{ left: -10, right: 4, top: 4, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="#27272a"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...chartTooltip} />
                <Line
                  type="monotone"
                  dataKey="saves"
                  name="Saves"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </section>

      {/* ── Time Series Charts ── */}
      <section className="space-y-4">
        <SectionLabel icon={<IconActivity />} label="Performance over time" />
        <div className="grid gap-5 lg:grid-cols-2">
          <ChartCard
            title="Impressions & engagement"
            subtitle="Daily totals over selected period"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={lineData}
                margin={{ left: -10, right: 4, top: 4, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gImp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#27272a"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...chartTooltip} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Line
                  type="monotone"
                  dataKey="impressions"
                  name="Impressions"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="engagement"
                  name="Engagement"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Follower gain from content"
            subtitle="New followers attributed to content daily"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={lineData}
                margin={{ left: -10, right: 4, top: 4, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="#27272a"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...chartTooltip} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Line
                  type="monotone"
                  dataKey="followerGain"
                  name="Follower gain"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <ChartCard
            title="Likes, replies & reposts"
            subtitle="Daily action breakdown"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={lineData}
                margin={{ left: -10, right: 4, top: 4, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="#27272a"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...chartTooltip} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Line
                  type="monotone"
                  dataKey="likes"
                  name="Likes"
                  stroke="#f472b6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="replies"
                  name="Replies"
                  stroke="#fb923c"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="reposts"
                  name="Reposts"
                  stroke="#2dd4bf"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Posts per day" subtitle="Publishing cadence">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={lineData}
                margin={{ left: -10, right: 4, top: 4, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="#27272a"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...chartTooltip} />
                <Bar
                  dataKey="posts"
                  name="Posts"
                  fill="#6366f1"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </section>

      {/* ── Platform Charts ── */}
      <section className="space-y-4">
        <SectionLabel icon={<IconBarChart />} label="Platform breakdown" />
        <div className="grid gap-5 lg:grid-cols-2">
          <ChartCard
            title="Impressions by platform"
            subtitle="Total reach per channel"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ left: 0, right: 16, top: 4, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="#27272a"
                  strokeDasharray="4 4"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="platform"
                  width={90}
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...chartTooltip} />
                <Bar
                  dataKey="impressions"
                  name="Impressions"
                  fill="#38bdf8"
                  radius={[0, 3, 3, 0]}
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Engagement rate by platform"
            subtitle="(likes + replies + reposts) / impressions"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ left: 0, right: 16, top: 4, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="#27272a"
                  strokeDasharray="4 4"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                />
                <YAxis
                  type="category"
                  dataKey="platform"
                  width={90}
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  {...chartTooltip}
                  formatter={(v) =>
                    typeof v === "number" ? `${v.toFixed(2)}%` : String(v ?? "")
                  }
                />
                <Bar
                  dataKey="engagementRate"
                  name="Engagement %"
                  fill="#a78bfa"
                  radius={[0, 3, 3, 0]}
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </section>

      {/* ── Timing Charts ── */}
      <section className="space-y-4">
        <SectionLabel icon={<IconActivity />} label="Timing insights" />
        <div className="grid gap-5 lg:grid-cols-2">
          <ChartCard
            title="Posts by hour of day"
            subtitle="UTC — when your content is published"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.byHour}
                margin={{ left: -10, right: 4, top: 4, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="#27272a"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#52525b", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...chartTooltip} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar
                  dataKey="posts"
                  name="Posts"
                  fill="#22c55e"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={20}
                />
                <Bar
                  dataKey="impressions"
                  name="Impressions"
                  fill="#0ea5e9"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Activity by weekday"
            subtitle="Which days drive the most reach"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.byDayOfWeek}
                margin={{ left: -10, right: 4, top: 4, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="#27272a"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="dayLabel"
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...chartTooltip} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar
                  dataKey="impressions"
                  name="Impressions"
                  fill="#eab308"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="posts"
                  name="Posts"
                  fill="#57534e"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </section>

      {/* ── Detailed breakdowns (tables) ── */}
      <section className="space-y-7 border-t border-[rgba(255,255,255,0.06)] pt-8">
        <SectionLabel
          icon={<IconBarChart />}
          label="Detailed breakdowns"
          hint="Full rows for export and spot-checks"
        />

        <div>
          <SectionLabel icon={<IconBarChart />} label="Content type analysis" />
          <DataTable
            headers={[
              "Type",
              "Posts",
              "Impressions",
              "Engagement",
              "Eng. rate",
            ]}
            alignRight={[false, true, true, true, true]}
            empty={data.byContentType.length === 0}
          >
            {data.byContentType.map((row) => (
              <tr
                key={row.type}
                className="group border-b border-[rgba(255,255,255,0.04)] transition hover:bg-white/[0.02]"
              >
                <td className="py-3 pr-4">
                  <span className="rounded-md border border-[rgba(255,255,255,0.06)] bg-[#18181b] px-2.5 py-1 text-xs font-medium text-[#d4d4d8]">
                    {row.type}
                  </span>
                </td>
                <Td right>{row.posts.toLocaleString()}</Td>
                <Td right bright>
                  {row.impressions.toLocaleString()}
                </Td>
                <Td right>{row.engagement.toLocaleString()}</Td>
                <Td right>{row.engagementRate.toFixed(2)}%</Td>
              </tr>
            ))}
          </DataTable>
        </div>

        <div>
          <SectionLabel
            icon={<IconUsers />}
            label="Top users by impressions"
            hint="Top 25 in range (respects filters)"
          />
          <DataTable
            headers={[
              "User",
              "Posts",
              "Impressions",
              "Engagement",
              "Eng. rate",
              "Avg imp./post",
              "Follower Δ",
            ]}
            alignRight={[false, true, true, true, true, true, true]}
            empty={data.byUser.length === 0}
          >
            {data.byUser.map((row, i) => (
              <tr
                key={row.userId}
                className="group border-b border-[rgba(255,255,255,0.04)] transition hover:bg-white/[0.02]"
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#18181b] text-[10px] font-bold text-[#71717a]">
                      {i + 1}
                    </span>
                    <span className="max-w-[160px] truncate text-sm text-[#d4d4d8]">
                      {row.name}
                    </span>
                  </div>
                </td>
                <Td right>{row.posts.toLocaleString()}</Td>
                <Td right bright>
                  {row.impressions.toLocaleString()}
                </Td>
                <Td right>{row.engagement.toLocaleString()}</Td>
                <Td right>{row.engagementRate.toFixed(2)}%</Td>
                <Td right>{row.avgImpressionsPerPost.toFixed(1)}</Td>
                <td
                  className={`py-3 text-right tabular-nums text-sm font-medium ${row.followerGain >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {row.followerGain >= 0 ? "+" : ""}
                  {row.followerGain.toLocaleString()}
                </td>
              </tr>
            ))}
          </DataTable>
        </div>

        <div>
          <SectionLabel icon={<IconBarChart />} label="Platform detail" />
          <DataTable
            headers={[
              "Platform",
              "Posts",
              "Impressions",
              "Likes",
              "Replies",
              "Reposts",
              "Saves",
              "Follower Δ",
              "Avg imp./post",
            ]}
            alignRight={[false, true, true, true, true, true, true, true, true]}
            empty={barData.length === 0}
          >
            {barData.map((row) => (
              <tr
                key={row.platform}
                className="group border-b border-[rgba(255,255,255,0.04)] transition hover:bg-white/[0.02]"
              >
                <td className="py-3 pr-4">
                  <span
                    className={`inline-block rounded-md border px-2.5 py-0.5 text-xs font-medium ${chipClassForPlatform(row.platform)}`}
                  >
                    {row.platform}
                  </span>
                </td>
                <Td right>{row.posts.toLocaleString()}</Td>
                <Td right bright>
                  {row.impressions.toLocaleString()}
                </Td>
                <Td right>{row.likes.toLocaleString()}</Td>
                <Td right>{row.replies.toLocaleString()}</Td>
                <Td right>{row.reposts.toLocaleString()}</Td>
                <Td right>{row.saves.toLocaleString()}</Td>
                <td
                  className={`py-3 pr-4 text-right tabular-nums text-sm font-medium ${row.followerGain >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {row.followerGain >= 0 ? "+" : ""}
                  {row.followerGain.toLocaleString()}
                </td>
                <Td right>{row.avgImpressionsPerPost.toFixed(1)}</Td>
              </tr>
            ))}
          </DataTable>
        </div>

        <div>
          <SectionLabel
            icon={<IconTrendingUp />}
            label="Top performing posts"
            hint={`Showing top ${topLimit} by impressions`}
          />
          <DataTable
            headers={[
              "Preview",
              "User",
              "Platform",
              "Type",
              "Imp.",
              "Likes",
              "Replies",
              "Reposts",
              "Saves",
            ]}
            alignRight={[
              false,
              false,
              false,
              false,
              true,
              true,
              true,
              true,
              true,
            ]}
            empty={data.topPosts.length === 0}
            emptyMsg="No posts in this range."
          >
            {data.topPosts.map((p, i) => (
              <tr
                key={p.id}
                className="group border-b border-[rgba(255,255,255,0.04)] transition hover:bg-white/2 p-6"
              >
                <td className="max-w-xs py-3 pr-4">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 w-4 shrink-0 text-[10px] font-bold tabular-nums text-[#52525b]">
                      {i + 1}
                    </span>
                    <span className="line-clamp-2 text-xs leading-relaxed text-[#d4d4d8]">
                      {p.title}
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap py-3 pr-4 text-xs text-[#a1a1aa]">
                  {p.userName ?? "—"}
                </td>
                <td className="py-3 pr-4 text-xs text-[#71717a]">
                  {p.platform ?? "—"}
                </td>
                <td className="py-3 pr-4">
                  {p.type ? (
                    <span className="rounded border border-[rgba(255,255,255,0.06)] bg-[#18181b] px-1.5 py-0.5 text-[10px] text-[#a1a1aa]">
                      {p.type}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <Td right bright>
                  {p.impressions.toLocaleString()}
                </Td>
                <Td right>{p.likes.toLocaleString()}</Td>
                <Td right>{p.replies.toLocaleString()}</Td>
                <Td right>{p.reposts.toLocaleString()}</Td>
                <Td right>{p.saves.toLocaleString()}</Td>
              </tr>
            ))}
          </DataTable>
        </div>
      </section>

      {/* ── Footer ── */}
      <p className="border-t border-[rgba(255,255,255,0.06)] pt-4 text-[11px] text-[#52525b]">
        Range: {format(new Date(data.range.from), "PPpp")} —{" "}
        {format(new Date(data.range.to), "PPpp")}
      </p>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  sky: "text-sky-400 bg-sky-500/10 ring-sky-500/20",
  violet: "text-violet-400 bg-violet-500/10 ring-violet-500/20",
  amber: "text-amber-400 bg-amber-500/10 ring-amber-500/20",
  indigo: "text-indigo-400 bg-indigo-500/10 ring-indigo-500/20",
  pink: "text-pink-400 bg-pink-500/10 ring-pink-500/20",
  orange: "text-orange-400 bg-orange-500/10 ring-orange-500/20",
  teal: "text-teal-400 bg-teal-500/10 ring-teal-500/20",
  yellow: "text-yellow-400 bg-yellow-500/10 ring-yellow-500/20",
  emerald: "text-emerald-400 bg-emerald-500/10 ring-emerald-500/20",
  zinc: "text-zinc-400 bg-zinc-500/10 ring-zinc-500/20",
  cyan: "text-cyan-400 bg-cyan-500/10 ring-cyan-500/20",
  fuchsia: "text-fuchsia-400 bg-fuchsia-500/10 ring-fuchsia-500/20",
};

function MetricCard({
  label,
  value,
  hint,
  accent,
  icon,
  color = "sky",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  icon?: ReactNode;
  color?: string;
}) {
  const iconClasses = COLOR_MAP[color] ?? COLOR_MAP.sky;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#111113] p-5 transition hover:border-[#3f3f46] hover:[transform:translateY(-1px)]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.015] to-transparent" />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#71717a]">
          {label}
        </p>
        {icon && (
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${iconClasses}`}
          >
            {icon}
          </div>
        )}
      </div>
      <p
        className={`font-dm-mono relative mt-3.5 text-[28px] font-bold leading-none tracking-tight ${accent ? "text-emerald-400" : "text-[#e4e4e7]"}`}
      >
        {value}
      </p>
      {hint && (
        <p className="relative mt-2 text-[10px] leading-relaxed text-[#52525b]">
          {hint}
        </p>
      )}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#111113]">
      <div className="border-b border-[rgba(255,255,255,0.07)] px-5 py-4">
        <h2 className="text-[13px] font-semibold text-[#e4e4e7]">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-[11px] text-[#71717a]">{subtitle}</p>
        )}
      </div>
      <div className="min-h-0 w-full px-5 pb-5 pt-4">
        <div className="h-64 w-full min-w-0">{children}</div>
      </div>
    </div>
  );
}

function SectionLabel({
  icon,
  label,
  hint,
}: {
  icon?: ReactNode;
  label: string;
  hint?: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {icon && (
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#18181b] text-[#71717a]">
          {icon}
        </div>
      )}
      <h2 className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#3f3f46]">
        {label}
      </h2>
      {hint && <span className="text-[11px] text-[#52525b]">· {hint}</span>}
      <div className="h-px flex-1 bg-[rgba(255,255,255,0.06)]" />
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#3f3f46]">
        {label}
      </label>
      {children}
    </div>
  );
}

function StyledSelect({
  children,
  value,
  onChange,
}: {
  children: ReactNode;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#18181b] px-3 py-2 text-sm text-[#e4e4e7] focus:border-sky-400/40 focus:outline-none focus:ring-1 focus:ring-sky-400/25 transition"
    >
      {children}
    </select>
  );
}

function DataTable({
  headers,
  alignRight,
  children,
  empty,
  emptyMsg,
}: {
  headers: string[];
  alignRight: boolean[];
  children: ReactNode;
  empty: boolean;
  emptyMsg?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#111113]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.07)]">
              {headers.map((h, i) => (
                <th
                  key={h}
                  className={`px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-[#3f3f46] ${alignRight[i] ? "text-right" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empty ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-8 py-10 text-center text-sm text-[#71717a]"
                >
                  {emptyMsg ?? "No rows for this filter."}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Td({
  children,
  right,
  bright,
}: {
  children: ReactNode;
  right?: boolean;
  bright?: boolean;
}) {
  return (
    <td
      className={`border-b border-[rgba(255,255,255,0.04)] px-3 py-2.5 text-xs tabular-nums ${right ? "text-right" : ""} ${bright ? "font-medium text-[#e4e4e7]" : "text-[#71717a]"}`}
    >
      {children}
    </td>
  );
}
