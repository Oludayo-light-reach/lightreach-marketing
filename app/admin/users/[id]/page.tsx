"use client";

import { ConfirmDeleteModal } from "@/components/admin/confirm-delete-modal";
import { chipClassForPlatform } from "@/lib/platforms";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type UserDetail = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  followers: Array<{
    platform: string;
    count: number;
    lastUpdated?: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

type ContentSummary = {
  id: string;
  platform?: string;
  date: string;
  text: string;
  impressions: number;
};

function formatIso(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [user, setUser] = useState<UserDetail | null>(null);
  const [contentTotal, setContentTotal] = useState(0);
  const [recentContent, setRecentContent] = useState<ContentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [userRes, contentRes] = await Promise.all([
        fetch(`/api/users/${id}`),
        fetch(
          `/api/content?userId=${encodeURIComponent(id)}&page=1&limit=15`,
        ),
      ]);
      const userData = await userRes.json();
      if (!userRes.ok) {
        throw new Error(userData.error || "Failed to load user");
      }
      setUser(userData.user);

      const contentData = await contentRes.json();
      if (contentRes.ok) {
        setContentTotal(
          typeof contentData.total === "number" ? contentData.total : 0,
        );
        setRecentContent(
          Array.isArray(contentData.content) ? contentData.content : [],
        );
      } else {
        setContentTotal(0);
        setRecentContent([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalFollowers = user?.followers?.length
    ? user.followers.reduce((s, f) => s + (f.count ?? 0), 0)
    : 0;

  async function confirmDelete() {
    if (!id) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      setDeleteOpen(false);
      router.push("/admin/users");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setDeleting(false);
    }
  }

  if (!id) {
    return (
      <div className="text-sm text-red-400">Invalid user id in URL.</div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/users"
            className="text-sm text-sky-400 hover:text-sky-300"
          >
            ← Users
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">
            {loading ? "Loading…" : user?.name ?? "User"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Profile, follower inventory, and linked content.
          </p>
        </div>
        {user && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-950/50"
            >
              Delete user
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <ConfirmDeleteModal
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title="Delete this user?"
        description={`This permanently removes ${user?.name ?? "this user"} (${user?.email ?? "—"}) and all content attached to their account. This cannot be undone.`}
        confirmLabel="Delete user and content"
        loading={deleting}
        onConfirm={confirmDelete}
      />

      {loading && !user ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-12 text-center text-zinc-500">
          Loading profile…
        </div>
      ) : !user ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-12 text-center text-zinc-500">
          User not found.
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
                <div className="flex flex-col items-center text-center">
                  {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar}
                      alt=""
                      className="h-24 w-24 rounded-full border border-zinc-700 object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-2xl font-semibold text-zinc-400">
                      {user.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <p className="mt-4 text-lg font-medium text-zinc-100">
                    {user.name}
                  </p>
                  <p className="mt-1 break-all text-sm text-zinc-500">
                    {user.email}
                  </p>
                </div>
                <dl className="mt-6 space-y-3 border-t border-zinc-800 pt-6 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Content items</dt>
                    <dd className="tabular-nums text-zinc-200">
                      {contentTotal.toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Followers (sum)</dt>
                    <dd className="tabular-nums text-zinc-200">
                      {totalFollowers.toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Platforms tracked</dt>
                    <dd className="text-zinc-200">
                      {user.followers?.length ?? 0}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-2">
              <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
                <h2 className="border-b border-zinc-800 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                  Account
                </h2>
                <dl className="grid gap-4 p-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">
                      User ID
                    </dt>
                    <dd className="mt-1 font-mono text-xs text-zinc-300 break-all">
                      {user.id}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">
                      Email
                    </dt>
                    <dd className="mt-1 text-sm text-zinc-200">{user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">
                      Created
                    </dt>
                    <dd className="mt-1 text-sm text-zinc-200">
                      {formatIso(user.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">
                      Last updated
                    </dt>
                    <dd className="mt-1 text-sm text-zinc-200">
                      {formatIso(user.updatedAt)}
                    </dd>
                  </div>
                  {user.avatar && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium text-zinc-500">
                        Avatar URL
                      </dt>
                      <dd className="mt-1">
                        <a
                          href={user.avatar}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-sm text-sky-400 hover:text-sky-300"
                        >
                          {user.avatar}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </section>

              <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
                <h2 className="border-b border-zinc-800 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                  Followers by platform
                </h2>
                {!user.followers?.length ? (
                  <p className="p-4 text-sm text-zinc-500">
                    No per-platform follower rows yet. Edit the user from the
                    Users list to add follower counts.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500">
                          <th className="px-4 py-3 font-medium">Platform</th>
                          <th className="px-4 py-3 font-medium text-right tabular-nums">
                            Count
                          </th>
                          <th className="px-4 py-3 font-medium">
                            Last updated
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...user.followers]
                          .sort((a, b) => a.platform.localeCompare(b.platform))
                          .map((f) => (
                            <tr
                              key={f.platform}
                              className="border-b border-zinc-800/80 last:border-0"
                            >
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium tabular-nums ${chipClassForPlatform(f.platform)}`}
                                >
                                  {f.platform}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums text-zinc-200">
                                {f.count.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-zinc-400">
                                {formatIso(f.lastUpdated)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </div>

          <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Recent content
              </h2>
              <Link
                href={`/admin/content?userId=${encodeURIComponent(user.id)}`}
                className="text-xs text-sky-400 hover:text-sky-300"
              >
                Open in Content →
              </Link>
            </div>
            {recentContent.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">
                No content items for this user yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="px-4 py-3 font-medium">When</th>
                      <th className="px-4 py-3 font-medium">Platform</th>
                      <th className="px-4 py-3 font-medium">Preview</th>
                      <th className="px-4 py-3 font-medium text-right">
                        Impr.
                      </th>
                      <th className="px-4 py-3 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentContent.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-zinc-800/80 last:border-0"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                          {formatIso(c.date)}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">
                          {c.platform ?? "—"}
                        </td>
                        <td className="max-w-md truncate px-4 py-3 text-zinc-400">
                          {c.text}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-400">
                          {c.impressions ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/content/${c.id}`}
                            className="text-sky-400 hover:text-sky-300"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
