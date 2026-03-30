import type { Metadata } from "next";
import { AdminToaster } from "@/components/admin/admin-toaster";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";

export const metadata: Metadata = {
  title: "Admin | Light Reach",
  description: "Admin dashboard and content management",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className="flex min-h-0 h-dvh flex-col overflow-hidden bg-[#09090b] text-[#e4e4e7] md:flex-row"
      style={{ fontFamily: "var(--font-sora), system-ui, sans-serif" }}
    >
      <AdminSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AdminTopbar />
        <AdminToaster />
        <main className="pulse-admin-page min-h-0 flex-1 overflow-y-auto px-5 py-6 pb-12 sm:px-7 sm:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
