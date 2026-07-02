'use client';

import { useEffect } from 'react';

const GlobalError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  useEffect(() => {
    console.error('Unhandled UI error', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-red-400/30 bg-slate-900/90 p-8 shadow-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-red-300">System Error</p>
        <h1 className="mt-3 text-2xl font-semibold">The dispatcher interface encountered an error</h1>
        <p className="mt-3 text-sm text-slate-300">
          Please retry the action. If the issue persists, contact your platform administrator.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-400"
        >
          Retry
        </button>
      </div>
    </main>
  );
};

export default GlobalError;
