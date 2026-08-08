// Static page header for /live. It never depends on data, so it renders
// immediately -- both in the route-level loading skeleton and the live page --
// and is shared here so the two can't drift.
export function LivePageHeader() {
  return (
    <header className="mb-4 pt-4 sm:pt-6">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">Live electricity</h1>
        <span className="inline-flex items-center rounded-full border border-line px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-muted">
          Experimental
        </span>
      </div>
      <p className="mt-1.5 text-sm text-muted">Near-live estimates from your meter&rsquo;s optical pulse output.</p>
    </header>
  );
}
