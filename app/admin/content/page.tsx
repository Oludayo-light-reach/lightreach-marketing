import { Suspense } from "react";
import AdminContentPage from "./admin-content-client";

export default function AdminContentPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full space-y-6 p-8 text-center text-sm text-zinc-500">
          Loading…
        </div>
      }
    >
      <AdminContentPage />
    </Suspense>
  );
}
