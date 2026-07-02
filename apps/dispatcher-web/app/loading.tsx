const GlobalLoading = () => {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
      <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-6 py-4">
        <span className="h-3 w-3 animate-pulse rounded-full bg-cyan-400" />
        <p className="text-sm tracking-wide text-slate-200">Loading SafeConnect workspace...</p>
      </div>
    </main>
  );
};

export default GlobalLoading;
