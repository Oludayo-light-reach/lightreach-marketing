import Link from "next/link";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
      <div className="flex flex-col gap-3 border-b border-[rgba(255,255,255,0.06)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#e4e4e7]">
            Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#71717a]">
            Live summary from your content database. Use Analytics for full
            filters and tables, or Content to manage posts.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/analytics"
            className="inline-flex items-center gap-1.5 rounded-[9px] border border-violet-500/30 bg-violet-500/10 px-3.5 py-1.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/20"
          >
            Analytics →
          </Link>
          <Link
            href="/admin/content"
            className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#38bdf8] px-3.5 py-1.5 text-xs font-semibold text-[#0c1a2b] shadow-[0_0_20px_rgba(56,189,248,0.2)] transition hover:bg-[#7dd3fc] hover:shadow-[0_0_28px_rgba(56,189,248,0.35)]"
          >
            Content
          </Link>
        </div>
      </div>

      <AdminDashboard />
    </div>
  );
}
