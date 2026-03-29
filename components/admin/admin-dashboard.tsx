"use client";

import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Tab = "7d" | "30d" | "90d";

type PlatformRow = {
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
};

type AnalyticsResponse = {
  range: { from: string; to: string };
  totals: {
    totalImpressions: number;
    engagementRate: number;
    followerGrowthFromContent: number;
    postCount: number;
    avgImpressionsPerPost: number;
  };
  daily: {
    date: string;
    impressions: number;
    likes: number;
    replies: number;
    reposts: number;
    saves: number;
  }[];
  byPlatform: PlatformRow[];
  byContentType: {
    type: string;
    impressions: number;
    posts: number;
    engagement: number;
    engagementRate: number;
  }[];
  byDayOfWeek: {
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
    reposts: number;
    platform?: string;
    type?: string;
    timestamp: string;
  }[];
  comparison: {
    delta: {
      impressionsPct: number | null;
      engagementRatePts: number | null;
      postsPct: number | null;
      followerGrowthPct: number | null;
    };
  } | null;
  dailyByPlatform: Record<string, string | number>[];
  weeklyFollowerByPlatform: Record<string, string | number>[];
  byCategory: { category: string; posts: number; avgImpression: number }[];
  followersByPlatform: Record<string, number>;
};

const CHART_PLATFORMS = ["X", "LinkedIn", "Instagram", "Threads"] as const;
const TYPE_COLORS: Record<string, string> = {
  post: "#a78bfa",
  thread: "#38bdf8",
  reel: "#34d399",
  reply: "#fb923c",
  quote: "#f472b6",
};
const LINE_COLORS: Record<string, string> = {
  X: "#38bdf8",
  LinkedIn: "#60a5fa",
  Instagram: "#f472b6",
  Threads: "#a78bfa",
};

function formatCompact(n: number): string {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDeltaPct(v: number | null): string {
  if (v === null) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function formatDeltaPts(v: number | null): string {
  if (v === null) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(2)} pts`;
}

function StatCard({
  label,
  value,
  sub,
  accent,
  delta,
  deltaPositive,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  delta?: string;
  deltaPositive?: boolean | null;
}) {
  const positive = deltaPositive === true;
  const negative = deltaPositive === false;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-sm transition-all duration-300 hover:border-white/10 hover:bg-white/[0.05]">
      <div
        className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10 blur-2xl"
        style={{ background: accent }}
      />
      <p className="mb-1 text-xs font-medium uppercase tracking-widest text-white/40">
        {label}
      </p>
      <p className="mb-0.5 font-mono text-3xl font-bold tracking-tight text-white">
        {value}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/30">{sub}</span>
        {delta && delta !== "—" && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              positive
                ? "bg-emerald-400/10 text-emerald-400"
                : negative
                  ? "bg-rose-400/10 text-rose-400"
                  : "bg-white/5 text-white/40"
            }`}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-white/70">
        {title}
      </h2>
      {sub && <p className="mt-0.5 text-xs text-white/30">{sub}</p>}
    </div>
  );
}

const platformColors: Record<string, string> = {
  X: "bg-sky-400/10 text-sky-300 border-sky-400/20",
  LinkedIn: "bg-blue-400/10 text-blue-300 border-blue-400/20",
  Instagram: "bg-pink-400/10 text-pink-300 border-pink-400/20",
  Threads: "bg-purple-400/10 text-purple-300 border-purple-400/20",
};

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${platformColors[platform] ?? "bg-white/10 text-white/60"}`}
    >
      {platform}
    </span>
  );
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0a0a]/90 p-3 text-xs backdrop-blur-md">
      <p className="mb-2 font-semibold text-white/60">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-white/50">{p.name}:</span>
          <span className="font-mono font-semibold text-white">
            {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

function engagementMonthsFromDaily(
  daily: AnalyticsResponse["daily"],
): { month: string; likes: number; replies: number; reposts: number; saves: number }[] {
  const map = new Map<
    string,
    { likes: number; replies: number; reposts: number; saves: number }
  >();
  for (const row of daily) {
    const d = new Date(row.date + "T12:00:00Z");
    if (Number.isNaN(d.getTime())) continue;
    const key = format(d, "MMM yyyy");
    const cur = map.get(key) ?? { likes: 0, replies: 0, reposts: 0, saves: 0 };
    cur.likes += row.likes;
    cur.replies += row.replies;
    cur.reposts += row.reposts;
    cur.saves += row.saves;
    map.set(key, cur);
  }
  return Array.from(map.entries()).map(([month, v]) => ({ month, ...v }));
}

function radarRows(platforms: PlatformRow[]) {
  const pick = (p: string) => platforms.find((x) => x.platform === p);
  const vals = (fn: (r: PlatformRow) => number) =>
    CHART_PLATFORMS.map((pl) => {
      const r = pick(pl);
      return r ? fn(r) : 0;
    });
  const norm = (arr: number[]) => {
    const m = Math.max(...arr, 1);
    return arr.map((v) => Math.round((v / m) * 100));
  };

  const impressions = norm(vals((r) => r.impressions));
  const engagement = norm(vals((r) => r.engagementRate));
  const fg = norm(vals((r) => r.followerGain));
  const saves = norm(vals((r) => r.saves));
  const reposts = norm(vals((r) => r.reposts));
  const replies = norm(vals((r) => r.replies));

  const labels = [
    "Impressions",
    "Engagement",
    "Follower Growth",
    "Saves",
    "Reposts",
    "Replies",
  ];
  const rows = [impressions, engagement, fg, saves, reposts, replies];

  return labels.map((platform, i) => ({
    platform,
    X: rows[i][0] ?? 0,
    LinkedIn: rows[i][1] ?? 0,
    Instagram: rows[i][2] ?? 0,
    Threads: rows[i][3] ?? 0,
  }));
}

function tabToDays(t: Tab): number {
  if (t === "7d") return 7;
  if (t === "30d") return 30;
  return 90;
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("30d");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const days = tabToDays(activeTab);
    const to = endOfDay(new Date());
    const from = startOfDay(subDays(to, days - 1));
    const qs = new URLSearchParams({
      from: format(from, "yyyy-MM-dd"),
      to: format(to, "yyyy-MM-dd"),
      compare: "1",
      topLimit: "4",
    });
    try {
      const res = await fetch(`/api/analytics?${qs}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Failed to load analytics");
      }
      const json = (await res.json()) as AnalyticsResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void load();
  }, [load]);

  const engagementByMonth = useMemo(
    () => (data ? engagementMonthsFromDaily(data.daily) : []),
    [data],
  );

  const contentTypePie = useMemo(() => {
    if (!data?.byContentType?.length) return [];
    const total = data.byContentType.reduce((s, t) => s + t.posts, 0) || 1;
    return data.byContentType.map((t, i) => ({
      name: t.type ? t.type.charAt(0).toUpperCase() + t.type.slice(1) : "Unknown",
      value: Math.round((t.posts / total) * 100),
      color: TYPE_COLORS[t.type] ?? `hsl(${(i * 47) % 360}, 70%, 65%)`,
      posts: t.posts,
    }));
  }, [data]);

  const platformRadar = useMemo(
    () => (data?.byPlatform ? radarRows(data.byPlatform) : []),
    [data],
  );

  const topPlatforms = useMemo(() => {
    if (!data?.byPlatform?.length) return [];
    return [...data.byPlatform]
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 3);
  }, [data]);

  const bestDay = useMemo(() => {
    if (!data?.byDayOfWeek?.length) return "—";
    const best = [...data.byDayOfWeek].sort((a, b) => b.impressions - a.impressions)[0];
    return best?.dayLabel ?? "—";
  }, [data]);

  const peakHour = useMemo(() => {
    if (!data?.byHour?.length) return "—";
    const best = [...data.byHour].sort(
      (a, b) => b.impressions + b.posts * 100 - (a.impressions + a.posts * 100),
    )[0];
    if (!best) return "—";
    const next = Math.min(23, best.hour + 1);
    return `${String(best.hour).padStart(2, "0")}:00–${String(next).padStart(2, "0")}:00`;
  }, [data]);

  const contentVelocity = useMemo(() => {
    if (!data?.range || !data.totals) return "—";
    const ms =
      new Date(data.range.to).getTime() - new Date(data.range.from).getTime();
    const weeks = ms / (7 * 24 * 60 * 60 * 1000) || 1;
    const v = data.totals.postCount / weeks;
    return `${v.toFixed(1)}/wk`;
  }, [data]);

  const updatedLabel = useMemo(() => {
    return `Range · ${data ? format(new Date(data.range.from), "MMM d") : "…"} – ${data ? format(new Date(data.range.to), "MMM d, yyyy") : "…"}`;
  }, [data]);

  const d = data?.comparison?.delta;

  return (
    <div className="relative -mx-5 -mt-2 min-h-[60vh] px-5 pb-8 font-sans text-white sm:-mx-7 sm:px-7">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-3">
              <div className="pulse-live-dot h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-white/30">
                Live Analytics
              </span>
            </div>
            <h1
              className="text-3xl font-black tracking-tight text-white sm:text-4xl"
              style={{
                fontFamily: "var(--font-sora), system-ui, sans-serif",
                letterSpacing: "0.02em",
              }}
            >
              CONTENT INTELLIGENCE
            </h1>
            <p className="mt-1 text-xs text-white/30">{updatedLabel}</p>
          </div>

          <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
            {(["7d", "30d", "90d"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTab(t)}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold uppercase tracking-widest transition-all ${
                  activeTab === t
                    ? "bg-white text-black"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-white/[0.04]"
              />
            ))}
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard
                label="Total Impressions"
                value={formatCompact(data.totals.totalImpressions)}
                sub="across all platforms"
                accent="#a78bfa"
                delta={formatDeltaPct(d?.impressionsPct ?? null)}
                deltaPositive={
                  d?.impressionsPct === null
                    ? null
                    : (d?.impressionsPct ?? 0) >= 0
                }
              />
              <StatCard
                label="Engagement Rate"
                value={`${data.totals.engagementRate.toFixed(1)}%`}
                sub="likes + replies + reposts / impressions"
                accent="#38bdf8"
                delta={formatDeltaPts(d?.engagementRatePts ?? null)}
                deltaPositive={
                  d?.engagementRatePts === null
                    ? null
                    : (d?.engagementRatePts ?? 0) >= 0
                }
              />
              <StatCard
                label="Follower Growth"
                value={
                  data.totals.followerGrowthFromContent >= 0
                    ? `+${formatCompact(data.totals.followerGrowthFromContent)}`
                    : formatCompact(data.totals.followerGrowthFromContent)
                }
                sub="from content (period)"
                accent="#34d399"
                delta={formatDeltaPct(d?.followerGrowthPct ?? null)}
                deltaPositive={
                  d?.followerGrowthPct === null
                    ? null
                    : (d?.followerGrowthPct ?? 0) >= 0
                }
              />
              <StatCard
                label="Content Published"
                value={String(data.totals.postCount)}
                sub="posts in range"
                accent="#fb923c"
                delta={formatDeltaPct(d?.postsPct ?? null)}
                deltaPositive={
                  d?.postsPct === null ? null : (d?.postsPct ?? 0) >= 0
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {topPlatforms.map((p) => {
                const followers = data.followersByPlatform?.[p.platform] ?? 0;
                return (
                  <div
                    key={p.platform}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-white">
                        {p.platform}
                      </span>
                      <div
                        className="h-2 w-8 rounded-full"
                        style={{
                          background: LINE_COLORS[p.platform] ?? "#71717a",
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="font-mono text-base font-bold text-white">
                          {formatCompact(followers)}
                        </p>
                        <p className="text-[10px] text-white/30">Followers</p>
                      </div>
                      <div>
                        <p className="font-mono text-base font-bold text-white">
                          {p.posts}
                        </p>
                        <p className="text-[10px] text-white/30">Posts</p>
                      </div>
                      <div>
                        <p className="font-mono text-base font-bold text-white">
                          {formatCompact(p.impressions)}
                        </p>
                        <p className="text-[10px] text-white/30">Impressions</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {topPlatforms.length === 0 && (
                <p className="col-span-full text-center text-sm text-white/30">
                  No platform breakdown yet — add content with platforms set.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
              <SectionHeader
                title="Impressions Over Time"
                sub="Daily reach by platform"
              />
              {data.dailyByPlatform.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={data.dailyByPlatform}>
                    <defs>
                      {CHART_PLATFORMS.map((id) => (
                        <linearGradient
                          key={id}
                          id={`g${id}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={LINE_COLORS[id]}
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="100%"
                            stopColor={LINE_COLORS[id]}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.04)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
                      }
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.4)",
                      }}
                    />
                    {CHART_PLATFORMS.map((id) => (
                      <Area
                        key={id}
                        type="monotone"
                        dataKey={id}
                        stroke={LINE_COLORS[id]}
                        fill={`url(#g${id})`}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-12 text-center text-sm text-white/30">
                  No impressions in this date range.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 lg:col-span-2">
                <SectionHeader
                  title="Engagement Breakdown"
                  sub="Likes · Replies · Reposts · Saves (by month in range)"
                />
                {engagementByMonth.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={engagementByMonth} barSize={28}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        tick={{
                          fill: "rgba(255,255,255,0.3)",
                          fontSize: 10,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{
                          fill: "rgba(255,255,255,0.3)",
                          fontSize: 10,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="likes"
                        stackId="a"
                        fill="#a78bfa"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar dataKey="reposts" stackId="a" fill="#38bdf8" />
                      <Bar dataKey="replies" stackId="a" fill="#34d399" />
                      <Bar
                        dataKey="saves"
                        stackId="a"
                        fill="#fb923c"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-10 text-center text-sm text-white/30">
                    No engagement data in range.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
                <SectionHeader title="Content Mix" sub="Share of posts by type" />
                {contentTypePie.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={contentTypePie}
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={72}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {contentTypePie.map((entry, index) => (
                            <Cell
                              key={index}
                              fill={entry.color}
                              stroke="transparent"
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 space-y-1.5">
                      {contentTypePie.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ background: item.color }}
                            />
                            <span className="text-xs text-white/50">
                              {item.name}
                            </span>
                          </div>
                          <span className="font-mono text-xs font-bold text-white">
                            {item.value}% ({item.posts})
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="py-10 text-center text-sm text-white/30">
                    No types in range.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 lg:col-span-3">
                <SectionHeader
                  title="Follower Growth Velocity"
                  sub="Net new followers from content · ISO week buckets"
                />
                {data.weeklyFollowerByPlatform.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data.weeklyFollowerByPlatform}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                      />
                      <XAxis
                        dataKey="week"
                        tick={{
                          fill: "rgba(255,255,255,0.3)",
                          fontSize: 10,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{
                          fill: "rgba(255,255,255,0.3)",
                          fontSize: 10,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        wrapperStyle={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.4)",
                        }}
                      />
                      {CHART_PLATFORMS.map((id) => (
                        <Line
                          key={id}
                          type="monotone"
                          dataKey={id}
                          stroke={LINE_COLORS[id]}
                          strokeWidth={2}
                          dot={{ r: 3, fill: LINE_COLORS[id] }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-10 text-center text-sm text-white/30">
                    No follower gain recorded in this range.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 lg:col-span-2">
                <SectionHeader
                  title="Platform Strength"
                  sub="Normalized relative scores (0–100)"
                />
                {platformRadar.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart data={platformRadar}>
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis
                        dataKey="platform"
                        tick={{
                          fill: "rgba(255,255,255,0.35)",
                          fontSize: 9,
                        }}
                      />
                      <Radar
                        name="X"
                        dataKey="X"
                        stroke="#38bdf8"
                        fill="#38bdf8"
                        fillOpacity={0.12}
                        strokeWidth={2}
                      />
                      <Radar
                        name="LinkedIn"
                        dataKey="LinkedIn"
                        stroke="#60a5fa"
                        fill="#60a5fa"
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                      <Radar
                        name="Instagram"
                        dataKey="Instagram"
                        stroke="#f472b6"
                        fill="#f472b6"
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                      <Radar
                        name="Threads"
                        dataKey="Threads"
                        stroke="#a78bfa"
                        fill="#a78bfa"
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                      <Legend
                        wrapperStyle={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.4)",
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-10 text-center text-sm text-white/30">
                    No platform data.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
              <SectionHeader
                title="Category Performance"
                sub="Avg impressions per category (from content labels)"
              />
              {data.byCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(200, data.byCategory.length * 36)}>
                  <BarChart
                    data={data.byCategory}
                    layout="vertical"
                    barSize={14}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.04)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{
                        fill: "rgba(255,255,255,0.3)",
                        fontSize: 10,
                      }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      tick={{
                        fill: "rgba(255,255,255,0.4)",
                        fontSize: 11,
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={120}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="avgImpression" name="Avg Impressions" radius={[0, 6, 6, 0]}>
                      {data.byCategory.map((_, i) => (
                        <Cell
                          key={i}
                          fill={`hsl(${200 + i * 20}, 80%, 65%)`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-10 text-center text-sm text-white/30">
                  No categories — set `topic_domain` or legacy `content.category`.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
              <SectionHeader
                title="Top Performing Content"
                sub="Ranked by impressions in this range"
              />
              <div className="space-y-3">
                {data.topPosts.map((item, i) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 transition-all hover:border-white/10 hover:bg-white/[0.04] sm:flex-row sm:items-start"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] font-mono text-sm font-bold text-white/30">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <PlatformBadge platform={item.platform ?? "?"} />
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/30">
                          {item.type ?? "—"}
                        </span>
                        <span className="text-[10px] text-white/20">
                          {format(new Date(item.timestamp), "MMM d")}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm text-white/60">
                        {item.title}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-6 text-right sm:justify-end">
                      {[
                        ["Impressions", item.impressions.toLocaleString()],
                        ["Likes", item.likes.toLocaleString()],
                        ["Reposts", item.reposts.toLocaleString()],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <p className="font-mono text-sm font-bold text-white">
                            {v}
                          </p>
                          <p className="text-[10px] text-white/25">{k}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {data.topPosts.length === 0 && (
                  <p className="py-6 text-center text-sm text-white/30">
                    No posts in this range.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: "Avg Impressions/Post",
                  value: formatCompact(data.totals.avgImpressionsPerPost),
                  color: "#a78bfa",
                },
                {
                  label: "Best Performing Day",
                  value: bestDay,
                  color: "#38bdf8",
                },
                {
                  label: "Peak Impressions Hour",
                  value: peakHour,
                  color: "#34d399",
                },
                {
                  label: "Content Velocity",
                  value: contentVelocity,
                  color: "#fb923c",
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-center"
                >
                  <div
                    className="mx-auto mb-2 h-0.5 w-8 rounded-full"
                    style={{ background: m.color }}
                  />
                  <p className="font-mono text-lg font-black text-white sm:text-xl">
                    {m.value}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-white/30">
                    {m.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="pb-2 text-center text-[10px] uppercase tracking-widest text-white/15">
              Content Intelligence · All platforms ·{" "}
              {format(new Date(), "MMMM yyyy")}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
