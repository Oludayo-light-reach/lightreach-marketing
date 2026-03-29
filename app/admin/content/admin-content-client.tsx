"use client";

import { ConfirmDeleteModal } from "@/components/admin/confirm-delete-modal";
import {
  DateFieldModal,
  defaultLocalDatetimeString,
  toLocalDatetimeInputValue,
} from "@/components/date-field-modal";
import { PLATFORMS } from "@/lib/platforms";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const CONTENT_TYPES = ["post", "reply", "quote", "thread", "reel"] as const;
const PAGE_SIZE = 20;

type ContentRow = {
  id: string;
  userId: string;
  user: { name: string; email: string } | null;
  platform?: string;
  type?: string;
  externalId?: string;
  timestamp: string;
  content?: {
    category?: string;
    subtype?: string;
    performanceDriver?: string;
    categoryReason?: string;
  };
  text: { body: string; url: string; driveLink?: string };
  media?: { urls?: string[] };
  metrics: {
    impressions?: number;
    likes?: number;
    replies?: number;
    reposts?: number;
    saves?: number;
    followerGain?: number;
  };
  meta?: {
    rawType?: string;
    sent?: number;
    extra?: Record<string, unknown>;
  };
};

type UserOption = { id: string; name: string; email: string };

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
  const [filterType, setFilterType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ContentRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContentRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState({
    userId: "",
    platform: "X",
    type: "post",
    externalId: "",
    timestamp: defaultLocalDatetimeString(),
    body: "",
    url: "https://",
    driveLink: "",
    category: "",
    subtype: "",
    performanceDriver: "",
    categoryReason: "",
    mediaUrls: "",
    impressions: "0",
    likes: "0",
    replies: "0",
    reposts: "0",
    saves: "0",
    followerGain: "0",
    rawType: "",
    sent: "0",
    extraJson: "",
  });

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
      if (filterType) params.set("type", filterType);
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
    filterType,
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

  function openCreate() {
    const first = users[0]?.id ?? "";
    setCreating(true);
    setEditing(null);
    setForm({
      userId: first,
      platform: "X",
      type: "post",
      externalId: "",
      timestamp: defaultLocalDatetimeString(),
      body: "",
      url: "https://",
      driveLink: "",
      category: "",
      subtype: "",
      performanceDriver: "",
      categoryReason: "",
      mediaUrls: "",
      impressions: "0",
      likes: "0",
      replies: "0",
      reposts: "0",
      saves: "0",
      followerGain: "0",
      rawType: "",
      sent: "0",
      extraJson: "",
    });
  }

  function openEdit(c: ContentRow) {
    setEditing(c);
    setCreating(false);
    const extra = c.meta?.extra;
    setForm({
      userId: c.userId,
      platform: c.platform ?? "X",
      type: c.type ?? "post",
      externalId: c.externalId ?? "",
      timestamp: toLocalDatetimeInputValue(c.timestamp),
      body: c.text.body,
      url: c.text.url,
      driveLink: c.text.driveLink ?? "",
      category: c.content?.category ?? "",
      subtype: c.content?.subtype ?? "",
      performanceDriver: c.content?.performanceDriver ?? "",
      categoryReason: c.content?.categoryReason ?? "",
      mediaUrls: (c.media?.urls ?? []).join("\n"),
      impressions: String(c.metrics?.impressions ?? 0),
      likes: String(c.metrics?.likes ?? 0),
      replies: String(c.metrics?.replies ?? 0),
      reposts: String(c.metrics?.reposts ?? 0),
      saves: String(c.metrics?.saves ?? 0),
      followerGain: String(c.metrics?.followerGain ?? 0),
      rawType: c.meta?.rawType ?? "",
      sent: String(c.meta?.sent ?? 0),
      extraJson:
        extra && typeof extra === "object"
          ? JSON.stringify(extra, null, 2)
          : "",
    });
  }

  async function save() {
    setError(null);
    let extra: Record<string, unknown> | undefined;
    const rawExtra = form.extraJson.trim();
    if (rawExtra) {
      try {
        const parsed: unknown = JSON.parse(rawExtra);
        if (
          parsed !== null &&
          typeof parsed === "object" &&
          !Array.isArray(parsed)
        ) {
          extra = parsed as Record<string, unknown>;
        } else {
          setError("Meta: extra must be a JSON object");
          return;
        }
      } catch {
        setError("Meta: extra must be valid JSON");
        return;
      }
    }

    const trim = (s: string) => s.trim();
    const urls = form.mediaUrls
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const metrics = {
      impressions: Number(form.impressions) || 0,
      likes: Number(form.likes) || 0,
      replies: Number(form.replies) || 0,
      reposts: Number(form.reposts) || 0,
      saves: Number(form.saves) || 0,
      followerGain: Number(form.followerGain) || 0,
    };

    const contentPayload = {
      ...(trim(form.category) ? { category: trim(form.category) } : {}),
      ...(trim(form.subtype) ? { subtype: trim(form.subtype) } : {}),
      ...(trim(form.performanceDriver)
        ? { performanceDriver: trim(form.performanceDriver) }
        : {}),
      ...(trim(form.categoryReason)
        ? { categoryReason: trim(form.categoryReason) }
        : {}),
    };

    const payload = {
      userId: form.userId,
      platform: form.platform,
      type: form.type,
      externalId: trim(form.externalId) || undefined,
      timestamp: new Date(form.timestamp).toISOString(),
      content: contentPayload,
      text: {
        body: form.body.trim(),
        url: form.url.trim(),
        ...(trim(form.driveLink) ? { driveLink: trim(form.driveLink) } : {}),
      },
      media: { urls },
      metrics,
      meta: {
        ...(trim(form.rawType) ? { rawType: trim(form.rawType) } : {}),
        sent: Number(form.sent) || 0,
        ...(extra !== undefined ? { extra } : {}),
      },
    };
    try {
      if (creating) {
        const res = await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Create failed");
      } else if (editing) {
        const res = await fetch(`/api/content/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Update failed");
      }
      setCreating(false);
      setEditing(null);
      await loadContent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
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
              placeholder="Body, platform, user…"
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
          <label className="min-w-[8rem] text-xs font-medium text-zinc-500">
            Type
            <select
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
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
              setFilterType("");
              setFilterDateFrom("");
              setFilterDateTo("");
              setPage(1);
            }}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          >
            Clear filters
          </button>
        </div>

        <div className="overflow-x-auto">
        <table className="w-full min-w-180 text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Platform</th>
              <th className="px-4 py-3 font-medium">Preview</th>
              <th className="px-4 py-3 font-medium text-right">Impr.</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
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
                    {new Date(c.timestamp).toLocaleString()}
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
                  <td className="max-w-xs truncate px-4 py-3 text-zinc-400">
                    {c.text.body}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-400">
                    {c.metrics?.impressions ?? 0}
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

      {(creating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex h-160 max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
            <h2 className="shrink-0 text-lg font-semibold text-zinc-50">
              {creating ? "New content" : "Edit content"}
            </h2>
            <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                <label className="block text-xs font-medium text-zinc-500">
                  User
                  <select
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                    value={form.userId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, userId: e.target.value }))
                    }
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-medium text-zinc-500">
                  External ID (optional)
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                    value={form.externalId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, externalId: e.target.value }))
                    }
                    placeholder="Platform post id"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-medium text-zinc-500">
                    Platform
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                      value={form.platform}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, platform: e.target.value }))
                      }
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-zinc-500">
                    Content type
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                      value={form.type}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, type: e.target.value }))
                      }
                    >
                      {["post", "reply", "quote", "thread", "reel"].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <DateFieldModal
                  label="Posted at"
                  mode="datetime-local"
                  value={form.timestamp}
                  onChange={(next) =>
                    setForm((f) => ({ ...f, timestamp: next }))
                  }
                />
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
                  Classification (content)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["category", "Category"],
                      ["subtype", "Subtype"],
                      ["performanceDriver", "Performance driver"],
                      ["categoryReason", "Category reason"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="block text-xs font-medium text-zinc-500"
                    >
                      {label}
                      <input
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                        value={form[key]}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, [key]: e.target.value }))
                        }
                      />
                    </label>
                  ))}
                </div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
                  Text
                </p>
                <label className="block text-xs font-medium text-zinc-500">
                  Body
                  <textarea
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                    value={form.body}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, body: e.target.value }))
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-500">
                  URL
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                    value={form.url}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, url: e.target.value }))
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-500">
                  Drive link (optional)
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                    value={form.driveLink}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, driveLink: e.target.value }))
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-500">
                  Media URLs (one per line)
                  <textarea
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100"
                    value={form.mediaUrls}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, mediaUrls: e.target.value }))
                    }
                    placeholder="https://…"
                  />
                </label>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
                  Metrics
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["impressions", "Impressions"],
                      ["likes", "Likes"],
                      ["replies", "Replies"],
                      ["reposts", "Reposts"],
                      ["saves", "Saves"],
                      ["followerGain", "Follower Δ"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="block text-xs font-medium text-zinc-500"
                    >
                      {label}
                      <input
                        type="number"
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                        value={form[key]}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, [key]: e.target.value }))
                        }
                      />
                    </label>
                  ))}
                </div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
                  Meta
                </p>
                <label className="block text-xs font-medium text-zinc-500">
                  Raw type (e.g. &quot;X - Post&quot;)
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                    value={form.rawType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, rawType: e.target.value }))
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-500">
                  Sent
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                    value={form.sent}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sent: e.target.value }))
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-500">
                  Extra (JSON object, optional)
                  <textarea
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100"
                    value={form.extraJson}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, extraJson: e.target.value }))
                    }
                    placeholder='{ "importRow": 1 }'
                  />
                </label>
              </div>
            </div>
            <div className="mt-4 flex shrink-0 justify-end gap-2 border-t border-zinc-800/80 pt-4">
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setEditing(null);
                }}
                className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void save()}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
