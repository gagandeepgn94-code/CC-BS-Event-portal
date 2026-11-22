export const dynamic = "force-dynamic";

import { Suspense } from "react";
import VerifyClient from "./VerifyClient";

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card p-10 animate-pulse w-full max-w-md">
          <div className="h-14 w-14 rounded-full bg-slate-200 mx-auto mb-4" />
          <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto mb-2" />
          <div className="h-3 bg-slate-200 rounded w-1/2 mx-auto" />
        </div>
      </div>
    }>
      <VerifyClient />
    </Suspense>
  );
}
