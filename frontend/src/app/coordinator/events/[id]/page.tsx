export const dynamic = "force-dynamic";

import { Suspense } from "react";
import CoordHubClient from "./CoordHubClient";

export default function CoordHubPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <div className="card p-6 animate-pulse space-y-3">
          <div className="h-6 bg-slate-200 rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i=><div key={i} className="h-20 bg-slate-200 rounded-xl"/>)}
          </div>
        </div>
      </div>
    }>
      <CoordHubClient />
    </Suspense>
  );
}
