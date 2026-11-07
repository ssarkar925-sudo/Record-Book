'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Record Book V2 error boundary:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] p-6 text-center text-slate-900">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-[#FFFBEB] text-amber-700">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">View Recovery Notice</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-600">
        An unexpected issue occurred while rendering this module.
      </p>
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
        >
          <RefreshCw className="h-4 w-4" />
          Retry View
        </button>
      </div>
    </div>
  );
}
