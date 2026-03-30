"use client";

import { Toaster } from "sonner";

export function AdminToaster() {
  return (
    <Toaster
      theme="dark"
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group border border-zinc-700 bg-zinc-900 text-zinc-100 shadow-xl",
          title: "text-zinc-50",
          description: "text-zinc-400",
          success: "border-emerald-800/80",
          error: "border-red-900/80",
          loading: "border-zinc-700",
        },
      }}
    />
  );
}
