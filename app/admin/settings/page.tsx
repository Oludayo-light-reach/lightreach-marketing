export default function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Placeholder for workspace settings, API keys, and integrations.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center">
        <p className="text-sm text-zinc-500">
          This section is reserved for future configuration. Connect billing,
          webhooks, and team roles here when ready.
        </p>
      </div>
    </div>
  );
}
