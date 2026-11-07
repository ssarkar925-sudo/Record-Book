'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global V2 error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] p-6 text-center text-slate-900">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <h2 className="text-lg font-bold text-slate-900">Record Book V2 Notice</h2>
          <p className="mt-2 text-sm text-slate-600">
            Click below to reload the workspace.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
          >
            Reload Workspace
          </button>
        </div>
      </body>
    </html>
  );
}
