"use client";

import {
  DateFieldModal,
  defaultLocalDatetimeString,
  toLocalDatetimeInputValue,
} from "@/components/date-field-modal";
import type { ContentRow, UserOption } from "@/app/admin/content/content-types";
import {
  CONTENT_CSV_TEMPLATE_HEADERS,
  csvRowToContentBody,
} from "@/lib/content-csv";
import { PLATFORMS } from "@/lib/platforms";
import Papa from "papaparse";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const PRIMARY_JOBS = [
  "Explain",
  "Prove",
  "Convert",
  "Invite",
  "Relate",
  "React",
  "Predict",
  "Show",
  "Discover",
] as const;

const CONTENT_OBJECTS = [
  "single_post",
  "short_video",
  "carousel",
  "thread",
  "quote_post",
] as const;

const INTERACTION_MODES = [
  "passive_consumption",
  "comment_debate",
  "reply_generation",
  "click_intent",
  "save_reference",
] as const;

const RETRIEVAL_MODES = ["feed", "community"] as const;

const AUTHORSHIP_MODES = ["founder", "creator_partner", "operator"] as const;

const EVIDENCE_MODES = [
  "reasoned",
  "process_evidence",
  "result_evidence",
  "lived_experience",
  "implicit",
] as const;

const TOPIC_DOMAINS = [
  "developer_tools",
  "design_tools",
  "technology",
  "future_of_work",
  "product_development",
  "brand_design",
  "creator_identity",
  "creator_growth",
  "creator_culture",
  "work_culture",
  "career",
  "business",
  "travel",
  "daily_life",
  "lifestyle",
  "data_engineering",
  "professional_skills",
  "generational_behavior",
  "society",
  "platform_behavior",
] as const;

function linesToArray(s: string): string[] {
  return s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

function joinLines(arr: string[] | undefined): string {
  return (arr ?? []).join("\n");
}

function humanizeEnum(s: string): string {
  return s.replace(/_/g, " ");
}

type CreateMode = "choose" | "manual" | "spreadsheet";

export type ContentCreationModalProps = {
  open: boolean;
  creating: boolean;
  editing: ContentRow | null;
  users: UserOption[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

function defaultForm(userId: string) {
  return {
    userId,
    platform: "X",
    externalId: "",
    date: defaultLocalDatetimeString(),
    text: "",
    url: "https://",
    primary_job: "",
    secondary_jobs: "",
    content_object: "",
    primary_format_mechanic: "",
    secondary_format_mechanics: "",
    interaction_mode: "",
    retrieval_mode: "",
    authorship_mode: "",
    evidenceModes: [] as string[],
    topic_domain: "",
    attention_hook: "",
    outcome_driver: "",
    pattern_notes: "",
    media_url: "",
    impressions: "0",
    likes: "0",
    replies: "0",
    reposts: "0",
    saves: "0",
    followerGain: "0",
    sent: "0",
  };
}

export function ContentCreationModal({
  open,
  creating,
  editing,
  users,
  onClose,
  onSaved,
}: ContentCreationModalProps) {
  const [createMode, setCreateMode] = useState<CreateMode>("choose");
  const [bulkUserId, setBulkUserId] = useState("");
  const [spreadsheetParsed, setSpreadsheetParsed] = useState<Record<
    string,
    string
  >[]>([]);
  const [spreadsheetFileName, setSpreadsheetFileName] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [saveSubmitting, setSaveSubmitting] = useState(false);
  const [form, setForm] = useState(() => defaultForm(""));

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        userId: editing.userId,
        platform: editing.platform ?? "X",
        externalId: editing.externalId ?? "",
        date: toLocalDatetimeInputValue(editing.date),
        text: editing.text,
        url: editing.url,
        primary_job: editing.primary_job ?? "",
        secondary_jobs: joinLines(editing.secondary_jobs),
        content_object: editing.content_object ?? "",
        primary_format_mechanic: editing.primary_format_mechanic ?? "",
        secondary_format_mechanics: joinLines(editing.secondary_format_mechanics),
        interaction_mode: editing.interaction_mode ?? "",
        retrieval_mode: editing.retrieval_mode ?? "",
        authorship_mode: editing.authorship_mode ?? "",
        evidenceModes: [...(editing.evidence_mode ?? [])],
        topic_domain: editing.topic_domain ?? "",
        attention_hook: joinLines(editing.attention_hook),
        outcome_driver: joinLines(editing.outcome_driver),
        pattern_notes: editing.pattern_notes ?? "",
        media_url: editing.media_url ?? "",
        impressions: String(editing.impressions ?? 0),
        likes: String(editing.likes ?? 0),
        replies: String(editing.replies ?? 0),
        reposts: String(editing.reposts ?? 0),
        saves: String(editing.saves ?? 0),
        followerGain: String(editing.followerGain ?? 0),
        sent: String(editing.sent ?? 0),
      });
      setCreateMode("choose");
      return;
    }
    if (creating && users.length > 0) {
      const first = users[0]!.id;
      setBulkUserId(first);
      setCreateMode("choose");
      setSpreadsheetParsed([]);
      setSpreadsheetFileName("");
      setBulkMessage(null);
      setForm(defaultForm(first));
    }
  }, [open, creating, editing, users]);

  function downloadCsvTemplate() {
    const header = CONTENT_CSV_TEMPLATE_HEADERS.join(",");
    const sample = CONTENT_CSV_TEMPLATE_HEADERS.map((col) => {
      if (col === "id") return "";
      if (col === "userId") return "";
      if (col === "platform") return "TikTok";
      if (col === "date") return "3/25/2026";
      if (col === "primary_job") return "Relate";
      if (col === "secondary_jobs") return "Show";
      if (col === "content_object") return "short_video";
      if (col === "primary_format_mechanic") return "commute_pov";
      if (col === "secondary_format_mechanics")
        return "daily_routine | mood_clip";
      if (col === "interaction_mode") return "passive_consumption";
      if (col === "retrieval_mode") return "feed";
      if (col === "authorship_mode") return "creator_partner";
      if (col === "evidence_mode") return "implicit";
      if (col === "topic_domain") return "daily_life";
      if (col === "attention_hook") return "familiarity | mood";
      if (col === "outcome_driver") return "completion | likes";
      if (col === "pattern_notes") return "Example pattern note";
      if (col === "text") return "Example caption #hashtag";
      if (col === "urls") return "https://www.tiktok.com/@user/video/123";
      if (col === "media_urls") return "";
      if (col === "impressions") return "100";
      if (col === "likes") return "10";
      if (col === "replies") return "1";
      if (col === "reposts") return "0";
      if (col === "saves") return "2";
      if (col === "followerGain") return "0";
      if (col === "sent") return "0";
      return "";
    });
    const line = sample
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
    const blob = new Blob([`${header}\n${line}`], {
      type: "text/csv;charset=utf-8",
    });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = "content-import-template.csv";
    a.click();
    URL.revokeObjectURL(href);
    toast.success("Template downloaded");
  }

  async function handleSpreadsheetFile(file: File) {
    setBulkMessage(null);
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: "greedy",
    });
    if (parsed.errors.length) {
      const msg =
        parsed.errors.map((e) => e.message).join("; ") || "Parse warning";
      setBulkMessage(msg);
      toast.warning(msg);
    } else {
      toast.success(`Loaded ${file.name}`);
    }
    const rows = (parsed.data ?? []).filter((r) =>
      Object.values(r).some((v) => v != null && String(v).trim() !== ""),
    );
    setSpreadsheetParsed(rows);
    setSpreadsheetFileName(file.name);
  }

  async function runBulkImport() {
    if (!bulkUserId) {
      toast.error("Select a user for this import.");
      return;
    }
    if (spreadsheetParsed.length === 0) {
      toast.error("Upload a CSV file with at least one data row.");
      return;
    }
    setBulkImporting(true);
    setBulkMessage(null);
    try {
      const rows = spreadsheetParsed.map((r) =>
        csvRowToContentBody(r, bulkUserId),
      );
      const res = await fetch("/api/content/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultUserId: bulkUserId, rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      const n = data.created as number;
      const failed = data.failed as { index: number; error: string }[];
      if (n > 0) {
        await onSaved();
        if (!failed?.length) {
          toast.success(`Imported ${n} row(s)`);
          onClose();
        } else {
          const msg = `Imported ${n} item(s). ${failed.length} row(s) failed — check required columns (platform, date, text, url).`;
          setBulkMessage(msg);
          toast.warning(msg);
        }
      } else {
        const msg = failed?.length
          ? `No rows imported. ${failed.length} error(s) — check CSV columns and values.`
          : "Nothing imported.";
        setBulkMessage(msg);
        toast.error(msg);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Import failed";
      toast.error(msg);
      setBulkMessage(msg);
    } finally {
      setBulkImporting(false);
    }
  }

  async function save() {
    const trim = (s: string) => s.trim();
    const primaryJobsSet = new Set<string>(PRIMARY_JOBS);
    const secondaryJobsParsed = linesToArray(form.secondary_jobs).filter((j) =>
      primaryJobsSet.has(j),
    );

    const payload = {
      userId: form.userId,
      platform: form.platform,
      externalId: trim(form.externalId) || undefined,
      date: new Date(form.date).toISOString(),
      text: trim(form.text),
      url: trim(form.url),
      impressions: Number(form.impressions) || 0,
      likes: Number(form.likes) || 0,
      replies: Number(form.replies) || 0,
      reposts: Number(form.reposts) || 0,
      saves: Number(form.saves) || 0,
      followerGain: Number(form.followerGain) || 0,
      sent: Number(form.sent) || 0,
      ...(trim(form.primary_job) ? { primary_job: trim(form.primary_job) } : {}),
      ...(secondaryJobsParsed.length
        ? { secondary_jobs: secondaryJobsParsed }
        : {}),
      ...(trim(form.content_object)
        ? { content_object: trim(form.content_object) }
        : {}),
      ...(trim(form.primary_format_mechanic)
        ? { primary_format_mechanic: trim(form.primary_format_mechanic) }
        : {}),
      ...(linesToArray(form.secondary_format_mechanics).length
        ? {
            secondary_format_mechanics: linesToArray(
              form.secondary_format_mechanics,
            ),
          }
        : {}),
      ...(trim(form.interaction_mode)
        ? { interaction_mode: trim(form.interaction_mode) }
        : {}),
      ...(trim(form.retrieval_mode)
        ? { retrieval_mode: trim(form.retrieval_mode) }
        : {}),
      ...(trim(form.authorship_mode)
        ? { authorship_mode: trim(form.authorship_mode) }
        : {}),
      ...(form.evidenceModes.length
        ? { evidence_mode: form.evidenceModes }
        : {}),
      ...(trim(form.topic_domain) ? { topic_domain: trim(form.topic_domain) } : {}),
      ...(linesToArray(form.attention_hook).length
        ? { attention_hook: linesToArray(form.attention_hook) }
        : {}),
      ...(linesToArray(form.outcome_driver).length
        ? { outcome_driver: linesToArray(form.outcome_driver) }
        : {}),
      ...(trim(form.pattern_notes) ? { pattern_notes: trim(form.pattern_notes) } : {}),
      ...(trim(form.media_url) ? { media_url: trim(form.media_url) } : {}),
    };

    setSaveSubmitting(true);
    try {
      if (creating) {
        await toast.promise(
          (async () => {
            const res = await fetch("/api/content", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Create failed");
            onClose();
            await onSaved();
          })(),
          {
            loading: "Creating content…",
            success: "Content created",
            error: (e) =>
              e instanceof Error ? e.message : "Could not create content",
          },
        );
      } else if (editing) {
        await toast.promise(
          (async () => {
            const res = await fetch(`/api/content/${editing.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Update failed");
            onClose();
            await onSaved();
          })(),
          {
            loading: "Saving changes…",
            success: "Changes saved",
            error: (e) =>
              e instanceof Error ? e.message : "Could not save changes",
          },
        );
      }
    } finally {
      setSaveSubmitting(false);
    }
  }

  function handleClose() {
    if (saveSubmitting || bulkImporting) return;
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        className={`flex h-[min(90vh,52rem)] w-full flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl ${
          creating && createMode === "spreadsheet" ? "max-w-4xl" : "max-w-2xl"
        }`}
      >
        <h2 className="shrink-0 text-lg font-semibold text-zinc-50">
          {editing
            ? "Edit content"
            : createMode === "choose"
              ? "Add content"
              : createMode === "spreadsheet"
                ? "Import from spreadsheet"
                : "New content"}
        </h2>
        <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {creating && createMode === "choose" && (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">
                  Choose how you want to add content.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setCreateMode("manual")}
                    className="flex flex-col items-start rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-4 text-left transition hover:border-zinc-500"
                  >
                    <span className="font-medium text-zinc-100">
                      Enter manually
                    </span>
                    <span className="mt-1 text-xs text-zinc-500">
                      Fill in the form for one post at a time.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkUserId(form.userId || users[0]?.id || "");
                      setCreateMode("spreadsheet");
                    }}
                    className="flex flex-col items-start rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-4 text-left transition hover:border-zinc-500"
                  >
                    <span className="font-medium text-zinc-100">
                      Upload spreadsheet
                    </span>
                    <span className="mt-1 text-xs text-zinc-500">
                      Import many rows from a CSV file (export from Excel or
                      Google Sheets).
                    </span>
                  </button>
                </div>
              </div>
            )}
            {creating && createMode === "spreadsheet" && (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">
                  Use a CSV with a header row (download our template). List
                  fields use <code className="text-zinc-300">|</code> between
                  values. Each row needs{" "}
                  <strong className="text-zinc-300">platform</strong>,{" "}
                  <strong className="text-zinc-300">date</strong>,{" "}
                  <strong className="text-zinc-300">text</strong>, and{" "}
                  <strong className="text-zinc-300">url</strong> unless you rely
                  on the default user only (userId column optional if you set the
                  default below).
                </p>
                <label className="block text-xs font-medium text-zinc-500">
                  Default user (for rows without a userId column)
                  <select
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                    value={bulkUserId}
                    onChange={(e) => setBulkUserId(e.target.value)}
                    disabled={bulkImporting}
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={downloadCsvTemplate}
                    disabled={bulkImporting}
                    className="rounded-lg border border-zinc-600 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                  >
                    Download CSV template
                  </button>
                </div>
                <label className="block text-xs font-medium text-zinc-500">
                  CSV file
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    disabled={bulkImporting}
                    className="mt-1 block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-2 file:text-zinc-100 disabled:opacity-40"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      void (f && handleSpreadsheetFile(f));
                    }}
                  />
                </label>
                {spreadsheetFileName ? (
                  <p className="text-xs text-zinc-500">
                    Loaded: {spreadsheetFileName} —{" "}
                    {spreadsheetParsed.length} row(s)
                  </p>
                ) : null}
                {bulkMessage ? (
                  <p className="text-xs text-emerald-400">{bulkMessage}</p>
                ) : null}
                {spreadsheetParsed.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-zinc-800">
                    <table className="w-full min-w-[32rem] text-left text-xs text-zinc-400">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          {Object.keys(spreadsheetParsed[0] ?? {})
                            .slice(0, 8)
                            .map((k) => (
                              <th
                                key={k}
                                className="px-2 py-2 font-medium text-zinc-500"
                              >
                                {k}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {spreadsheetParsed.slice(0, 5).map((row, i) => (
                          <tr
                            key={i}
                            className="border-b border-zinc-800/80"
                          >
                            {Object.keys(spreadsheetParsed[0] ?? {})
                              .slice(0, 8)
                              .map((k) => (
                                <td
                                  key={k}
                                  className="max-w-[10rem] truncate px-2 py-1.5"
                                >
                                  {row[k] ?? ""}
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {spreadsheetParsed.length > 5 ? (
                      <p className="px-2 py-2 text-center text-xs text-zinc-600">
                        … and {spreadsheetParsed.length - 5} more row(s)
                      </p>
                    ) : null}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCreateMode("choose");
                    setSpreadsheetParsed([]);
                    setSpreadsheetFileName("");
                    setBulkMessage(null);
                  }}
                  disabled={bulkImporting}
                  className="text-xs text-sky-400 hover:text-sky-300 disabled:opacity-40"
                >
                  ← Back to options
                </button>
              </div>
            )}
            {(editing || (creating && createMode === "manual")) && (
              <>
                {creating && createMode === "manual" && (
                  <button
                    type="button"
                    onClick={() => setCreateMode("choose")}
                    disabled={saveSubmitting}
                    className="text-xs text-sky-400 hover:text-sky-300 disabled:opacity-40"
                  >
                    ← Back to options
                  </button>
                )}
                <label className="block text-xs font-medium text-zinc-500">
                  User
                  <select
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                    value={form.userId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, userId: e.target.value }))
                    }
                    disabled={saveSubmitting}
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
                    disabled={saveSubmitting}
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-500">
                  Platform
                  <select
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                    value={form.platform}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, platform: e.target.value }))
                    }
                    disabled={saveSubmitting}
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <DateFieldModal
                  label="Posted at"
                  mode="datetime-local"
                  value={form.date}
                  onChange={(next) =>
                    setForm((f) => ({ ...f, date: next }))
                  }
                />
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
                  Strategy
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-zinc-500">
                    Primary job
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                      value={form.primary_job}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, primary_job: e.target.value }))
                      }
                      disabled={saveSubmitting}
                    >
                      <option value="">—</option>
                      {PRIMARY_JOBS.map((j) => (
                        <option key={j} value={j}>
                          {j}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-zinc-500">
                    Content object
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                      value={form.content_object}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          content_object: e.target.value,
                        }))
                      }
                      disabled={saveSubmitting}
                    >
                      <option value="">—</option>
                      {CONTENT_OBJECTS.map((o) => (
                        <option key={o} value={o}>
                          {humanizeEnum(o)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-zinc-500 sm:col-span-2">
                    Secondary jobs (one per line, same labels as primary)
                    <textarea
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100"
                      value={form.secondary_jobs}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          secondary_jobs: e.target.value,
                        }))
                      }
                      placeholder={"Relate\nProve"}
                      disabled={saveSubmitting}
                    />
                  </label>
                  <label className="block text-xs font-medium text-zinc-500">
                    Interaction mode
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                      value={form.interaction_mode}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          interaction_mode: e.target.value,
                        }))
                      }
                      disabled={saveSubmitting}
                    >
                      <option value="">—</option>
                      {INTERACTION_MODES.map((m) => (
                        <option key={m} value={m}>
                          {humanizeEnum(m)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-zinc-500">
                    Retrieval mode
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                      value={form.retrieval_mode}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          retrieval_mode: e.target.value,
                        }))
                      }
                      disabled={saveSubmitting}
                    >
                      <option value="">—</option>
                      {RETRIEVAL_MODES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-zinc-500">
                    Authorship mode
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                      value={form.authorship_mode}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          authorship_mode: e.target.value,
                        }))
                      }
                      disabled={saveSubmitting}
                    >
                      <option value="">—</option>
                      {AUTHORSHIP_MODES.map((m) => (
                        <option key={m} value={m}>
                          {humanizeEnum(m)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-zinc-500">
                    Topic domain
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                      value={form.topic_domain}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          topic_domain: e.target.value,
                        }))
                      }
                      disabled={saveSubmitting}
                    >
                      <option value="">—</option>
                      {TOPIC_DOMAINS.map((d) => (
                        <option key={d} value={d}>
                          {humanizeEnum(d)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-zinc-500 sm:col-span-2">
                    Primary format mechanic
                    <input
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                      value={form.primary_format_mechanic}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          primary_format_mechanic: e.target.value,
                        }))
                      }
                      disabled={saveSubmitting}
                    />
                  </label>
                  <label className="block text-xs font-medium text-zinc-500 sm:col-span-2">
                    Secondary format mechanics (one per line)
                    <textarea
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100"
                      value={form.secondary_format_mechanics}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          secondary_format_mechanics: e.target.value,
                        }))
                      }
                      disabled={saveSubmitting}
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium text-zinc-500">
                      Evidence mode
                    </p>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {EVIDENCE_MODES.map((m) => (
                        <label
                          key={m}
                          className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400"
                        >
                          <input
                            type="checkbox"
                            className="rounded border-zinc-600"
                            checked={form.evidenceModes.includes(m)}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                evidenceModes: e.target.checked
                                  ? f.evidenceModes.includes(m)
                                    ? f.evidenceModes
                                    : [...f.evidenceModes, m]
                                  : f.evidenceModes.filter((x) => x !== m),
                              }))
                            }
                            disabled={saveSubmitting}
                          />
                          {humanizeEnum(m)}
                        </label>
                      ))}
                    </div>
                  </div>
                  <label className="block text-xs font-medium text-zinc-500 sm:col-span-2">
                    Attention hooks (one per line)
                    <textarea
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100"
                      value={form.attention_hook}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          attention_hook: e.target.value,
                        }))
                      }
                      disabled={saveSubmitting}
                    />
                  </label>
                  <label className="block text-xs font-medium text-zinc-500 sm:col-span-2">
                    Outcome drivers (one per line)
                    <textarea
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100"
                      value={form.outcome_driver}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          outcome_driver: e.target.value,
                        }))
                      }
                      disabled={saveSubmitting}
                    />
                  </label>
                  <label className="block text-xs font-medium text-zinc-500 sm:col-span-2">
                    Pattern notes
                    <textarea
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                      value={form.pattern_notes}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          pattern_notes: e.target.value,
                        }))
                      }
                      disabled={saveSubmitting}
                    />
                  </label>
                  <label className="block text-xs font-medium text-zinc-500 sm:col-span-2">
                    Media URL (primary asset)
                    <input
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                      value={form.media_url}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, media_url: e.target.value }))
                      }
                      placeholder="https://…"
                      disabled={saveSubmitting}
                    />
                  </label>
                </div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
                  Text &amp; URL
                </p>
                <label className="block text-xs font-medium text-zinc-500">
                  Text
                  <textarea
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                    value={form.text}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, text: e.target.value }))
                    }
                    disabled={saveSubmitting}
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
                    disabled={saveSubmitting}
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
                      ["sent", "Sent"],
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
                        disabled={saveSubmitting}
                      />
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="mt-4 flex shrink-0 flex-wrap justify-end gap-2 border-t border-zinc-800/80 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={saveSubmitting || bulkImporting}
            className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
          >
            Cancel
          </button>
          {creating && createMode === "spreadsheet" && (
            <button
              type="button"
              disabled={bulkImporting || spreadsheetParsed.length === 0}
              onClick={() => void runBulkImport()}
              className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              {bulkImporting ? (
                <>
                  <span
                    className="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    aria-hidden
                  />
                  Importing…
                </>
              ) : (
                "Import rows"
              )}
            </button>
          )}
          {(editing || (creating && createMode === "manual")) && (
            <button
              type="button"
              disabled={saveSubmitting}
              onClick={() => void save()}
              className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white disabled:opacity-40"
            >
              {saveSubmitting ? (
                <>
                  <span
                    className="inline-block size-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950"
                    aria-hidden
                  />
                  {creating ? "Creating…" : "Saving…"}
                </>
              ) : (
                "Save"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
