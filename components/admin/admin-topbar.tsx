"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function segmentTitle(pathname: string): string {
  if (pathname === "/admin" || pathname === "/admin/") return "Dashboard";
  const seg = pathname.replace(/^\/admin\/?/, "").split("/")[0];
  if (!seg) return "Dashboard";
  return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
}

export function AdminTopbar() {
  const pathname = usePathname();
  const current = segmentTitle(pathname);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const dateChip = useMemo(
    () =>
      now.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [now],
  );

  return (
    <header className="pulse-topbar flex h-[60px] shrink-0 items-center gap-3 border-b border-[rgba(255,255,255,0.07)] bg-[#111113] px-4 sm:px-6">
      <nav
        className="flex min-w-0 items-center gap-1.5 text-xs text-[#71717a]"
        aria-label="Breadcrumb"
      >
        <Link href="/admin" className="truncate hover:text-[#e4e4e7]">
          Light Reach
        </Link>
        <span className="shrink-0 text-[#3f3f46]">›</span>
        <span className="truncate font-medium text-[#e4e4e7]">{current}</span>
      </nav>
      <div className="flex-1" />
      <div className="pulse-live hidden items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-500/[0.08] px-2.5 py-1 text-[10px] font-semibold text-emerald-400 sm:flex">
        <span className="pulse-live-dot h-[5px] w-[5px] rounded-full bg-emerald-400" />
        Live
      </div>
      <label className="pulse-search hidden max-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#18181b] px-3 py-1.5 transition focus-within:border-sky-400/30 focus-within:shadow-[0_0_0_3px_rgba(56,189,248,0.06)] sm:flex">
        <svg
          className="h-[13px] w-[13px] shrink-0 text-[#3f3f46]"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="search"
          placeholder="Search posts, users…"
          className="min-w-0 flex-1 border-0 bg-transparent text-xs text-[#e4e4e7] outline-none placeholder:text-[#3f3f46]"
          aria-label="Search"
        />
      </label>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="pulse-topbar-btn relative flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#18181b] text-[#71717a] transition hover:border-[#3f3f46] hover:bg-[#111113] hover:text-[#e4e4e7]"
          aria-label="Notifications"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
          <span className="absolute right-1.5 top-1.5 h-[5px] w-[5px] rounded-full border border-[#111113] bg-[#38bdf8]" />
        </button>
        <button
          type="button"
          className="pulse-topbar-btn flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#18181b] text-[#71717a] transition hover:border-[#3f3f46] hover:bg-[#111113] hover:text-[#e4e4e7]"
          aria-label="Help"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <span className="hidden font-mono text-[11px] text-[#71717a] sm:inline-flex items-center rounded-md border border-[rgba(255,255,255,0.07)] bg-[#18181b] px-2.5 py-1">
          {dateChip}
        </span>
      </div>
    </header>
  );
}
