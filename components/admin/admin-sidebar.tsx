"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, LayoutDashboard, Settings } from "lucide-react";
import { GrAnalytics } from "react-icons/gr";
import { MdContentCut } from "react-icons/md";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeHot?: boolean;
};

const overview: NavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: (
      <svg className="h-[15px] w-[15px]" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 10a8 8 0 1116 0A8 8 0 012 10zm5-2.25A.75.75 0 018.75 7h2.5a.75.75 0 010 1.5H9.56l.94.94a.75.75 0 11-1.06 1.06l-2.25-2.25a.75.75 0 010-1.06L9.44 7.19A.75.75 0 0110 7h.25z" />
      </svg>
    ),
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: <GrAnalytics className="h-[15px] w-[15px]" />,
    badge: "New",
  },
];

const content: NavItem[] = [
  {
    href: "/admin/content",
    label: "Content",
    icon: <MdContentCut className="h-[15px] w-[15px]" />,
  },
  {
    href: "/admin/calendar",
    label: "Calendar",
    icon: <Calendar className="h-[15px] w-[15px]" strokeWidth={1.75} />,
  },
];

const team: NavItem[] = [
  {
    href: "/admin/users",
    label: "Users",
    icon: (
      <svg className="h-[15px] w-[15px]" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
      </svg>
    ),
  },
];

const settingsNav: NavItem[] = [
  {
    href: "/admin/settings",
    label: "Settings",
    icon: <Settings className="h-[15px] w-[15px]" strokeWidth={1.75} />,
  },
];

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div className="mb-1">
      <div className="px-[18px] pb-1 pt-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[#3f3f46]">
        {label}
      </div>
      {items.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin" || pathname === "/admin/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`pulse-nav-item relative flex w-full items-center gap-2.5 border-0 bg-transparent px-[18px] py-2 text-left text-[13px] transition-colors ${
              active
                ? "font-medium text-[#e4e4e7] bg-[rgba(56,189,248,0.08)] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:rounded-r before:bg-[#38bdf8] before:content-['']"
                : "font-normal text-[#71717a] hover:bg-white/[0.04] hover:text-[#e4e4e7]"
            }`}
          >
            <span
              className={`shrink-0 opacity-70 ${active ? "opacity-100" : ""}`}
            >
              {item.icon}
            </span>
            {item.label}
            {item.badge && (
              <span
                className={`ml-auto min-w-[20px] rounded-full border px-1.5 py-px text-center font-mono text-[10px] font-semibold ${
                  item.badgeHot
                    ? "border-orange-500/20 bg-orange-500/[0.12] text-orange-400"
                    : "border-[rgba(255,255,255,0.07)] bg-[#18181b] text-[#71717a]"
                }`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden border-b border-[rgba(255,255,255,0.07)] bg-[#111113] md:h-full md:w-56 md:border-b-0 md:border-r">
      <div className="flex h-[60px] shrink-0 items-center gap-2.5 border-b border-[rgba(255,255,255,0.07)] px-[18px]">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#38bdf8] to-[#818cf8] text-[13px] font-bold text-white shadow-[0_0_16px_rgba(56,189,248,0.3)]">
          L
        </div>
        <span className="text-[15px] font-bold tracking-tight text-[#e4e4e7]">
          Light Reach
        </span>
        <span className="ml-auto rounded-full border border-sky-400/20 bg-sky-400/[0.12] px-[7px] py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#38bdf8]">
          Pro
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        <NavGroup label="Overview" items={overview} pathname={pathname} />
        <NavGroup label="Content" items={content} pathname={pathname} />
        <NavGroup label="Team" items={team} pathname={pathname} />
        <NavGroup label="Settings" items={settingsNav} pathname={pathname} />
      </div>

      <div className="shrink-0 border-t border-[rgba(255,255,255,0.07)] p-3">
        <Link
          href="/"
          className="mb-2 flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#18181b] px-2.5 py-2 transition hover:border-[#3f3f46]"
        >
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-[11px] font-bold text-white">
            LR
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-[#e4e4e7]">
              Marketing site
            </div>
            <div className="text-[10px] text-[#71717a]">View public pages</div>
          </div>
          <svg
            className="h-3 w-3 shrink-0 text-[#3f3f46]"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
        <Link
          href="/admin/content"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[rgba(255,255,255,0.07)] bg-transparent py-2 text-xs font-medium text-[#71717a] transition hover:border-[#3f3f46] hover:text-[#e4e4e7]"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Quick: Content
        </Link>
      </div>
    </aside>
  );
}
