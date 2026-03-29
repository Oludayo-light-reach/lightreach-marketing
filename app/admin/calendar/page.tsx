"use client";

import { chipClassForPlatform, PLATFORMS } from "@/lib/platforms";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";

type ContentItem = {
  id: string;
  userId: string;
  user: { name: string; email: string } | null;
  platform?: string;
  timestamp: string;
  text: { body: string };
};

export default function AdminCalendarPage() {
  const [view, setView] = useState(() => new Date());
  const [platform, setPlatform] = useState<string>("");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const start = startOfMonth(view);
    const end = endOfMonth(view);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [view]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        from: range.from,
        to: range.to,
      });
      const res = await fetch(`/api/content?${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!platform) return items;
    return items.filter((c) => c.platform === platform);
  }, [items, platform]);

  const byDay = useMemo(() => {
    const map = new Map<string, ContentItem[]>();
    for (const c of filtered) {
      const key = format(new Date(c.timestamp), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    }
    return map;
  }, [filtered]);

  const monthStart = startOfMonth(view);
  const monthEnd = endOfMonth(view);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Content calendar
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Monthly view of scheduled content. Chips are colored by platform;
          multiple posts per day stack vertically.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView((d) => subMonths(d, 1))}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            aria-label="Previous month"
          >
            ←
          </button>
          <span className="min-w-[10rem] text-center text-sm font-medium text-zinc-200">
            {format(view, "MMMM yyyy")}
          </span>
          <button
            type="button"
            onClick={() => setView((d) => addMonths(d, 1))}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            aria-label="Next month"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => setView(new Date())}
            className="ml-2 rounded-lg bg-zinc-800 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-700"
          >
            Today
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          Platform
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">All platforms</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading calendar…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="grid grid-cols-7 gap-px rounded-lg bg-zinc-800 min-w-[640px]">
            {weekDays.map((wd) => (
              <div
                key={wd}
                className="bg-zinc-950 px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-zinc-500"
              >
                {wd}
              </div>
            ))}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayItems = byDay.get(key) ?? [];
              const inMonth = isSameMonth(day, view);
              return (
                <div
                  key={key}
                  className={`min-h-[120px] bg-zinc-950/90 p-1.5 ${
                    inMonth ? "" : "opacity-40"
                  }`}
                >
                  <div className="mb-1 text-right text-xs tabular-nums text-zinc-500">
                    {format(day, "d")}
                  </div>
                  <div className="flex max-h-[88px] flex-col gap-1 overflow-y-auto">
                    {dayItems.map((c) => (
                      <div
                        key={c.id}
                        title={`${c.user?.name ?? "User"} · ${c.text.body.slice(0, 120)}`}
                        className={`truncate rounded border px-1.5 py-0.5 text-[10px] leading-tight ${chipClassForPlatform(c.platform)}`}
                      >
                        <span className="font-medium text-zinc-200">
                          {c.user?.name ?? "—"}
                        </span>
                        <span className="text-zinc-500"> · </span>
                        {c.text.body.slice(0, 36)}
                        {c.text.body.length > 36 ? "…" : ""}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
