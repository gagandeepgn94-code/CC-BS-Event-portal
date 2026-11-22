export const dynamic = "force-dynamic";

import { Suspense } from "react";
import EventDetailClient from "./EventDetailClient";

export default function EventPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="card animate-pulse p-8 space-y-4">
          <div className="h-6 bg-slate-200 rounded w-3/4" />
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="h-32 bg-slate-200 rounded" />
        </div>
      </div>
    }>
      <EventDetailClient />
    </Suspense>
  );
}
