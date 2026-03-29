"use client";

import { ConfirmDeleteModal } from "@/components/admin/confirm-delete-modal";
import { USER_FOLLOWER_PLATFORMS, chipClassForPlatform } from "@/lib/platforms";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type FollowerFormRow = {
  platform: string;
  count: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  contentCount?: number;
  followers?: Array<{
    platform: string;
    count: number;
    lastUpdated?: string;
  }>;
};

function followersToFormRows(f?: UserRow["followers"]): FollowerFormRow[] {
  if (!f?.length) return [];
  return f.map((x) => ({
    platform: x.platform,
    count: String(x.count),
  }));
}

function formRowsToPayload(rows: FollowerFormRow[]) {
  const seen = new Map<string, { platform: string; count: number }>();
  for (const row of rows) {
    if (
      !USER_FOLLOWER_PLATFORMS.includes(
        row.platform as (typeof USER_FOLLOWER_PLATFORMS)[number],
      )
    )
      continue;
    const count = Number(row.count);
    if (!Number.isFinite(count) || count < 0) continue;
    seen.set(row.platform, {
      platform: row.platform,
      count: Math.floor(count),
    });
  }
  return [...seen.values()];
}

function FollowersBadges({ followers }: { followers?: UserRow["followers"] }) {
  if (!followers?.length) {
    return <span className="text-zinc-600">—</span>;
  }
  const sorted = [...followers].sort((a, b) =>
    a.platform.localeCompare(b.platform),
  );
  return (
    <div className="flex max-w-md flex-wrap gap-1.5">
      {sorted.map((f) => (
        <span
          key={f.platform}
          className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium tabular-nums ${chipClassForPlatform(f.platform)}`}
          title={
            f.lastUpdated
              ? `Updated ${new Date(f.lastUpdated).toLocaleString()}`
              : undefined
          }
        >
          {f.platform}{" "}
          <span className="opacity-90">{f.count.toLocaleString()}</span>
        </span>
      ))}
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", avatar: "" });
  const [followerRows, setFollowerRows] = useState<FollowerFormRow[]>([]);
  const [moreSettingsOpen, setMoreSettingsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setUsers(data.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setForm({ name: "", email: "", avatar: "" });
    setFollowerRows([]);
    setMoreSettingsOpen(true);
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setCreating(false);
    setForm({ name: u.name, email: u.email, avatar: u.avatar ?? "" });
    setFollowerRows(followersToFormRows(u.followers));
    setMoreSettingsOpen((u.followers?.length ?? 0) > 0);
  }

  async function save() {
    setError(null);
    try {
      if (creating) {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            avatar: form.avatar || undefined,
            followers: formRowsToPayload(followerRows),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Create failed");
      } else if (editing) {
        const res = await fetch(`/api/users/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            avatar: form.avatar || null,
            followers: formRowsToPayload(followerRows),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Update failed");
      }
      setCreating(false);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  async function confirmRemoveUser() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      setDeleteTarget(null);
      await load();
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
            Users
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Create, update, and remove users. Deleting a user removes their
            content.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white"
        >
          Add user
        </button>
      </div>

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => !deleteLoading && setDeleteTarget(null)}
        title="Delete this user?"
        description={
          deleteTarget
            ? `This permanently removes ${deleteTarget.name} (${deleteTarget.email}) and all content linked to this account. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete user and content"
        loading={deleteLoading}
        onConfirm={confirmRemoveUser}
      />

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium text-right tabular-nums">
                Content
              </th>
              <th className="px-4 py-3 font-medium">Followers</th>
              <th className="px-4 py-3 font-medium text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  No users yet. Add one to attach content.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-zinc-800/80 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-zinc-200">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-zinc-200 hover:text-sky-400"
                    >
                      {u.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{u.email}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-400">
                    {(u.contentCount ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-300">
                    <FollowersBadges followers={u.followers} />
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="mr-2 text-zinc-400 hover:text-zinc-200"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      className="mr-2 text-sky-400 hover:text-sky-300"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(u)}
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

      {(creating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex h-[32rem] max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
            <h2 className="shrink-0 text-lg font-semibold text-zinc-50">
              {creating ? "New user" : "Edit user"}
            </h2>
            <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                <label className="block text-xs font-medium text-zinc-500">
                  Name
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-500">
                  Email
                  <input
                    type="email"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-500">
                  Avatar URL (optional)
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                    value={form.avatar}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, avatar: e.target.value }))
                    }
                  />
                </label>

                <details
                  open={moreSettingsOpen}
                  onToggle={(e) => setMoreSettingsOpen(e.currentTarget.open)}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/50 [&_summary]:cursor-pointer"
                >
                  <summary className="list-none px-3 py-2 text-sm font-medium text-zinc-300 [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-2">
                      <span className="text-zinc-500">▸</span>
                      More settings
                    </span>
                  </summary>
                  <div className="space-y-3 border-t border-zinc-800 px-3 pb-3 pt-2">
                    <p className="text-xs text-zinc-500">
                      Follower counts per platform (optional). Saving sets each
                      row's last updated time to now.
                    </p>
                    <div className="space-y-2">
                      {followerRows.map((row, i) => (
                        <div
                          key={i}
                          className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-800/80 bg-zinc-950/80 p-2"
                        >
                          <label className="min-w-[8rem] flex-1 text-xs font-medium text-zinc-500">
                            Platform
                            <select
                              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
                              value={row.platform}
                              onChange={(e) =>
                                setFollowerRows((rows) =>
                                  rows.map((r, j) =>
                                    j === i
                                      ? { ...r, platform: e.target.value }
                                      : r,
                                  ),
                                )
                              }
                            >
                              <option value="">Select…</option>
                              {USER_FOLLOWER_PLATFORMS.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="w-24 text-xs font-medium text-zinc-500">
                            Count
                            <input
                              type="number"
                              min={0}
                              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
                              value={row.count}
                              onChange={(e) =>
                                setFollowerRows((rows) =>
                                  rows.map((r, j) =>
                                    j === i
                                      ? { ...r, count: e.target.value }
                                      : r,
                                  ),
                                )
                              }
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setFollowerRows((rows) =>
                                rows.filter((_, j) => j !== i),
                              )
                            }
                            className="shrink-0 rounded-lg px-2 py-1.5 text-xs text-red-400 hover:text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFollowerRows((rows) => [
                          ...rows,
                          {
                            platform: "",
                            count: "0",
                          },
                        ])
                      }
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/50"
                    >
                      Add platform row
                    </button>
                  </div>
                </details>
              </div>
            </div>
            <div className="mt-6 flex shrink-0 justify-end gap-2 border-t border-zinc-800/80 pt-4">
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
