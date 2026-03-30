"use client";

import type { ContentRow, UserOption } from "@/app/admin/content/content-types";
import { ConfirmDeleteModal } from "@/components/admin/confirm-delete-modal";
import { ContentCreationModal } from "@/components/admin/content-creation-modal";
import { PLATFORMS } from "@/lib/platforms";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const PAGE_SIZE = 20;

function humanizeEnum(s: string): string {
  return s.replace(/_/g, " ");
}

export default function AdminContentPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<ContentRow[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ContentRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContentRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    if (res.ok) {
      setUsers(
        data.users.map((u: { id: string; name: string; email: string }) => ({
          id: u.id,
          name: u.name,
          email: u.email,
        })),
      );
    }
  }, []);

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (filterPlatform) params.set("platform", filterPlatform);
      if (filterUserId) params.set("userId", filterUserId);
      if (filterDateFrom) {
        params.set(
          "from",
          new Date(`${filterDateFrom}T00:00:00`).toISOString(),
        );
      }
      if (filterDateTo) {
        params.set(
          "to",
          new Date(`${filterDateTo}T23:59:59.999`).toISOString(),
        );
      }
      const res = await fetch(`/api/content?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.content);
      setTotal(typeof data.total === "number" ? data.total : data.content.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    debouncedSearch,
    filterPlatform,
    filterUserId,
    filterDateFrom,
    filterDateTo,
  ]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const skipSearchPageReset = useRef(true);
  useLayoutEffect(() => {
    if (skipSearchPageReset.current) {
      skipSearchPageReset.current = false;
      return;
    }
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const userIdParam = searchParams.get("userId");
  useEffect(() => {
    if (userIdParam) {
      setFilterUserId(userIdParam);
      setPage(1);
    }
  }, [userIdParam]);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  const pageMetricTotals = useMemo(() => {
    return items.reduce(
      (acc, c) => ({
        impressions: acc.impressions + (c.impressions ?? 0),
        likes: acc.likes + (c.likes ?? 0),
        replies: acc.replies + (c.replies ?? 0),
        reposts: acc.reposts + (c.reposts ?? 0),
        saves: acc.saves + (c.saves ?? 0),
        followerGain: acc.followerGain + (c.followerGain ?? 0),
      }),
      {
        impressions: 0,
        likes: 0,
        replies: 0,
        reposts: 0,
        saves: 0,
        followerGain: 0,
      },
    );
  }, [items]);

  const strategyCountsOnPage = useMemo(() => {
    const byJob = new Map<string, number>();
    const byTopic = new Map<string, number>();
    for (const c of items) {
      if (c.primary_job) {
        byJob.set(c.primary_job, (byJob.get(c.primary_job) ?? 0) + 1);
      }
      if (c.topic_domain) {
        byTopic.set(c.topic_domain, (byTopic.get(c.topic_domain) ?? 0) + 1);
      }
    }
    return { byJob, byTopic };
  }, [items]);

  function openCreate() {
    setCreating(true);
    setEditing(null);
  }

  function openEdit(c: ContentRow) {
    setEditing(c);
    setCreating(false);
  }

  function closeModal() {
    setCreating(false);
    setEditing(null);
  }

  async function confirmRemoveContent() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/content/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      setDeleteTarget(null);
      await loadContent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Content
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            CRUD for posts linked to users. Metrics drive analytics.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={users.length === 0}
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white disabled:opacity-40"
        >
          Add content
        </button>
      </div>

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => !deleteLoading && setDeleteTarget(null)}
        title="Delete this content item?"
        description={
          deleteTarget
            ? "This permanently removes this post from the database. This cannot be undone."
            : ""
        }
        confirmLabel="Delete content"
        loading={deleteLoading}
        onConfirm={confirmRemoveContent}
      />

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
        <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="min-w-[12rem] flex-1 text-xs font-medium text-zinc-500">
            Search
            <input
              type="search"
              placeholder="Text, URL, platform, user…"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </label>
          <label className="min-w-[8rem] text-xs font-medium text-zinc-500">
            Platform
            <select
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={filterPlatform}
              onChange={(e) => {
                setFilterPlatform(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[10rem] text-xs font-medium text-zinc-500">
            User
            <select
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={filterUserId}
              onChange={(e) => {
                setFilterUserId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[9rem] text-xs font-medium text-zinc-500">
            From
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={filterDateFrom}
              onChange={(e) => {
                setFilterDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="min-w-[9rem] text-xs font-medium text-zinc-500">
            To
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={filterDateTo}
              onChange={(e) => {
                setFilterDateTo(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              setDebouncedSearch("");
              setFilterPlatform("");
              setFilterUserId("");
              setFilterDateFrom("");
              setFilterDateTo("");
              setPage(1);
            }}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          >
            Clear filters
          </button>
        </div>

        {!loading && items.length > 0 && (
          <div className="space-y-3 border-b border-zinc-800 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
              Analytics (this page)
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <p className="text-xs text-zinc-500">Metric totals</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs tabular-nums text-zinc-300">
                  <dt>Impressions</dt>
                  <dd className="text-right">{pageMetricTotals.impressions}</dd>
                  <dt>Likes</dt>
                  <dd className="text-right">{pageMetricTotals.likes}</dd>
                  <dt>Replies</dt>
                  <dd className="text-right">{pageMetricTotals.replies}</dd>
                  <dt>Reposts</dt>
                  <dd className="text-right">{pageMetricTotals.reposts}</dd>
                  <dt>Saves</dt>
                  <dd className="text-right">{pageMetricTotals.saves}</dd>
                  <dt>Follower Δ</dt>
                  <dd className="text-right">{pageMetricTotals.followerGain}</dd>
                </dl>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <p className="text-xs text-zinc-500">Primary job (count)</p>
                <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs text-zinc-300">
                  {[...strategyCountsOnPage.byJob.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([job, n]) => (
                      <li key={job} className="flex justify-between gap-2">
                        <span className="truncate">{job}</span>
                        <span className="tabular-nums text-zinc-500">{n}</span>
                      </li>
                    ))}
                  {strategyCountsOnPage.byJob.size === 0 && (
                    <li className="text-zinc-600">No primary_job set</li>
                  )}
                </ul>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 sm:col-span-2 lg:col-span-1">
                <p className="text-xs text-zinc-500">Topic domain (count)</p>
                <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs text-zinc-300">
                  {[...strategyCountsOnPage.byTopic.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([topic, n]) => (
                      <li key={topic} className="flex justify-between gap-2">
                        <span className="truncate" title={topic}>
                          {humanizeEnum(topic)}
                        </span>
                        <span className="tabular-nums text-zinc-500">{n}</span>
                      </li>
                    ))}
                  {strategyCountsOnPage.byTopic.size === 0 && (
                    <li className="text-zinc-600">No topic_domain set</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Platform</th>
              <th className="px-4 py-3 font-medium">Job</th>
              <th className="px-4 py-3 font-medium">Topic</th>
              <th className="px-4 py-3 font-medium">Preview</th>
              <th className="px-4 py-3 font-medium text-right">Impr.</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                  No content. Create a user first, then add content.
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-zinc-800/80 last:border-0"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                    {new Date(c.date).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {c.user?.name ? (
                      <Link
                        href={`/admin/users/${c.userId}`}
                        className="hover:text-sky-400"
                      >
                        {c.user.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {c.platform ?? "—"}
                  </td>
                  <td className="max-w-[7rem] truncate px-4 py-3 text-zinc-400" title={c.primary_job}>
                    {c.primary_job ?? "—"}
                  </td>
                  <td
                    className="max-w-[9rem] truncate px-4 py-3 text-zinc-400"
                    title={c.topic_domain}
                  >
                    {c.topic_domain ? humanizeEnum(c.topic_domain) : "—"}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-zinc-400">
                    {c.text}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-400">
                    {c.impressions ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/content/${c.id}`}
                      className="mr-2 text-zinc-400 hover:text-zinc-200"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="mr-2 text-sky-400 hover:text-sky-300"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(c)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-800 px-4 py-3 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="tabular-nums">
            {total === 0
              ? "No matching rows"
              : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-600 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="tabular-nums text-zinc-400">
              Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
            </span>
            <button
              type="button"
              disabled={page >= Math.max(1, Math.ceil(total / PAGE_SIZE))}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-600 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <ContentCreationModal
        open={creating || editing !== null}
        creating={creating}
        editing={editing}
        users={users}
        onClose={closeModal}
        onSaved={loadContent}
      />
    </div>
  );
}
