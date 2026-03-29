"use client";

import { useId, useRef } from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** `yyyy-MM-dd` in local time — for date inputs and defaults */
export function defaultLocalDateString(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** `yyyy-MM-ddTHH:mm` in local time — for datetime-local inputs */
export function defaultLocalDatetimeString(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert an ISO or API timestamp string to `datetime-local` value in local time */
export function toLocalDatetimeInputValue(iso: string | Date | number) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return defaultLocalDatetimeString();
  return defaultLocalDatetimeString(d);
}

function formatDisplay(value: string, mode: "date" | "datetime-local") {
  if (!value.trim()) return "Select date…";
  const d =
    mode === "date"
      ? new Date(value + "T12:00:00")
      : new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return mode === "date"
    ? d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function openNativePicker(el: HTMLInputElement | null) {
  if (!el) return;
  requestAnimationFrame(() => {
    try {
      if (typeof el.showPicker === "function") {
        el.showPicker();
      } else {
        el.focus();
      }
    } catch {
      el.focus();
    }
  });
}

/** Date or datetime field: click opens the native picker (no overlay modal). */
export function DateFieldModal({
  label,
  value,
  onChange,
  mode,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  mode: "date" | "datetime-local";
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="block">
      <span id={`${id}-label`} className="text-xs font-medium text-zinc-500">
        {label}
      </span>
      <button
        type="button"
        aria-labelledby={`${id}-label`}
        className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-left text-sm text-zinc-100 hover:border-zinc-600"
        onClick={() => openNativePicker(inputRef.current)}
      >
        {formatDisplay(value, mode)}
      </button>
      <input
        ref={inputRef}
        type={mode === "date" ? "date" : "datetime-local"}
        tabIndex={-1}
        className="sr-only"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
