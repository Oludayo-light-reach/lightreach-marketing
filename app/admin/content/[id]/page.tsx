"use client";

import { ConfirmDeleteModal } from "@/components/admin/confirm-delete-modal";
import { chipClassForPlatform } from "@/lib/platforms";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ContentDetail = {
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
    impressions: number;
    likes: number;
    replies: number;
    reposts: number;
    saves: number;
    followerGain: number;
  };
  meta?: {
    rawType?: string;
    sent?: number;
    extra?: Record<string, unknown>;
  };
  primary_job?: string;
  secondary_jobs?: string[];
  content_object?: string;
  primary_format_mechanic?: string;
  secondary_format_mechanics?: string[];
  interaction_mode?: string;
  retrieval_mode?: string;
  authorship_mode?: string;
  evidence_mode?: string[];
  topic_domain?: string;
  attention_hook?: string[];
  outcome_driver?: string[];
  pattern_notes?: string;
  media_url?: string;
  createdAt: string;
  updatedAt: string;
};

function formatIso(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function humanizeEnum(s: string) {
  return s.replace(/_/g, " ");
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
      <h2 className="border-b border-zinc-800 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </h2>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-200">{children}</dd>
    </div>
  );
}

export default function AdminContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [c, setC] = useState<ContentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/content/${id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load content");
      }
      setC(data.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setC(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmDelete() {
    if (!id) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      setDeleteOpen(false);
      router.push("/admin/content");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setDeleting(false);
    }
  }

  if (!id) {
    return (
      <div className="text-sm text-red-400">Invalid content id in URL.</div>
    );
  }

  const platformClass = c?.platform
    ? chipClassForPlatform(c.platform)
    : "border-zinc-600 bg-zinc-800/50 text-zinc-300";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/content"
            className="text-sm text-sky-400 hover:text-sky-300"
          >
            ← Content
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
              {loading ? "Loading…" : "Content detail"}
            </h1>
            {c?.platform && (
              <span
                className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${platformClass}`}
              >
                {c.platform}
              </span>
            )}
            {c?.type && (
              <span className="rounded border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 text-xs text-zinc-300">
                {c.type}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Full record: strategy fields, text, metrics, and metadata.
          </p>
        </div>
        {c && (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-950/50"
          >
            Delete content
          </button>
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
        title="Delete this content item?"
        description="This permanently removes this post from the database. User follower totals are not rolled back automatically. This cannot be undone."
        confirmLabel="Delete content"
        loading={deleting}
        onConfirm={confirmDelete}
      />

      {loading && !c ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-12 text-center text-zinc-500">
          Loading…
        </div>
      ) : !c ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-12 text-center text-zinc-500">
          Content not found.
        </div>
      ) : (
        <div className="space-y-6">
          <Section title="Overview">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Content ID">
                <span className="font-mono text-xs text-zinc-300 break-all">
                  {c.id}
                </span>
              </Field>
              <Field label="External ID">
                {c.externalId ? (
                  <span className="font-mono text-xs">{c.externalId}</span>
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </Field>
              <Field label="Posted at">{formatIso(c.timestamp)}</Field>
              <Field label="Platform / type">
                {(c.platform ?? "—") + " · " + (c.type ?? "—")}
              </Field>
              <Field label="Primary media URL" wide>
                {c.media_url ? (
                  <a
                    href={c.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-sky-400 hover:text-sky-300"
                  >
                    {c.media_url}
                  </a>
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </Field>
            </dl>
          </Section>

          <Section title="Author">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Linked user ID">
                <span className="font-mono text-xs break-all">{c.userId}</span>
              </Field>
              <Field label="Name / email">
                {c.user ? (
                  <div className="space-y-1">
                    <p>{c.user.name}</p>
                    <p className="text-zinc-400">{c.user.email}</p>
                    <Link
                      href={`/admin/users/${c.userId}`}
                      className="inline-block text-sky-400 hover:text-sky-300"
                    >
                      Open user profile →
                    </Link>
                  </div>
                ) : (
                  <span className="text-zinc-500">User not populated</span>
                )}
              </Field>
            </dl>
          </Section>

          <Section title="Strategy & classification">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Primary job">
                {c.primary_job
                  ? humanizeEnum(c.primary_job)
                  : "—"}
              </Field>
              <Field label="Secondary jobs" wide>
                {c.secondary_jobs?.length ? (
                  <ul className="list-inside list-disc text-zinc-300">
                    {c.secondary_jobs.map((j) => (
                      <li key={j}>{humanizeEnum(j)}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </Field>
              <Field label="Content object">
                {c.content_object
                  ? humanizeEnum(c.content_object)
                  : "—"}
              </Field>
              <Field label="Topic domain">
                {c.topic_domain
                  ? humanizeEnum(c.topic_domain)
                  : "—"}
              </Field>
              <Field label="Primary format mechanic">
                {c.primary_format_mechanic ?? "—"}
              </Field>
              <Field label="Secondary format mechanics" wide>
                {c.secondary_format_mechanics?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {c.secondary_format_mechanics.map((m) => (
                      <span
                        key={m}
                        className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </Field>
              <Field label="Interaction mode">
                {c.interaction_mode
                  ? humanizeEnum(c.interaction_mode)
                  : "—"}
              </Field>
              <Field label="Retrieval mode">
                {c.retrieval_mode
                  ? humanizeEnum(c.retrieval_mode)
                  : "—"}
              </Field>
              <Field label="Authorship mode">
                {c.authorship_mode
                  ? humanizeEnum(c.authorship_mode)
                  : "—"}
              </Field>
              <Field label="Evidence mode" wide>
                {c.evidence_mode?.length ? (
                  <ul className="list-inside list-disc">
                    {c.evidence_mode.map((m) => (
                      <li key={m}>{humanizeEnum(m)}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </Field>
              <Field label="Attention hooks" wide>
                {c.attention_hook?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {c.attention_hook.map((h) => (
                      <span
                        key={h}
                        className="rounded border border-amber-900/40 bg-amber-950/20 px-2 py-0.5 text-xs text-amber-200/90"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </Field>
              <Field label="Outcome drivers" wide>
                {c.outcome_driver?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {c.outcome_driver.map((d) => (
                      <span
                        key={d}
                        className="rounded border border-emerald-900/40 bg-emerald-950/20 px-2 py-0.5 text-xs text-emerald-200/90"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </Field>
              <Field label="Pattern notes" wide>
                {c.pattern_notes ? (
                  <p className="whitespace-pre-wrap text-zinc-300">
                    {c.pattern_notes}
                  </p>
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </Field>
            </dl>
          </Section>

          <Section title="Legacy category (content block)">
            {c.content &&
            (c.content.category ||
              c.content.subtype ||
              c.content.performanceDriver ||
              c.content.categoryReason) ? (
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Category">{c.content.category ?? "—"}</Field>
                <Field label="Subtype">{c.content.subtype ?? "—"}</Field>
                <Field label="Performance driver" wide>
                  {c.content.performanceDriver ?? "—"}
                </Field>
                <Field label="Category reason" wide>
                  {c.content.categoryReason ?? "—"}
                </Field>
              </dl>
            ) : (
              <p className="text-sm text-zinc-500">
                No legacy category fields on this document.
              </p>
            )}
          </Section>

          <Section title="Text & links">
            <div className="space-y-4">
              <div>
                <dt className="text-xs font-medium text-zinc-500">Body</dt>
                <dd className="mt-2 whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-200">
                  {c.text.body}
                </dd>
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Post URL" wide>
                  <a
                    href={c.text.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-sky-400 hover:text-sky-300"
                  >
                    {c.text.url}
                  </a>
                </Field>
                <Field label="Drive link" wide>
                  {c.text.driveLink ? (
                    <a
                      href={c.text.driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-sky-400 hover:text-sky-300"
                    >
                      {c.text.driveLink}
                    </a>
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </Field>
              </dl>
            </div>
          </Section>

          <Section title="Media">
            {c.media?.urls?.filter(Boolean).length ? (
              <ul className="space-y-2">
                {c.media.urls!.map((u, i) => (
                  <li key={i}>
                    <a
                      href={u}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all font-mono text-xs text-sky-400 hover:text-sky-300"
                    >
                      {u}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">
                No additional media URLs in `media.urls`.
              </p>
            )}
          </Section>

          <Section title="Metrics">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
              {(
                [
                  ["impressions", c.metrics.impressions],
                  ["likes", c.metrics.likes],
                  ["replies", c.metrics.replies],
                  ["reposts", c.metrics.reposts],
                  ["saves", c.metrics.saves],
                  ["follower gain", c.metrics.followerGain],
                ] as const
              ).map(([label, val]) => (
                <div
                  key={label}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-3"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    {label}
                  </div>
                  <div className="mt-1 tabular-nums text-lg font-medium text-zinc-100">
                    {typeof val === "number" ? val.toLocaleString() : "—"}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Meta">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Raw type">
                {c.meta?.rawType ?? "—"}
              </Field>
              <Field label="Sent">
                {c.meta?.sent != null
                  ? String(c.meta.sent)
                  : "—"}
              </Field>
              <Field label="Extra (JSON)" wide>
                {c.meta?.extra && Object.keys(c.meta.extra).length > 0 ? (
                  <pre className="max-h-64 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
                    {JSON.stringify(c.meta.extra, null, 2)}
                  </pre>
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </Field>
            </dl>
          </Section>

          <Section title="System">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Created in DB">{formatIso(c.createdAt)}</Field>
              <Field label="Last updated in DB">{formatIso(c.updatedAt)}</Field>
            </dl>
          </Section>
        </div>
      )}
    </div>
  );
}
