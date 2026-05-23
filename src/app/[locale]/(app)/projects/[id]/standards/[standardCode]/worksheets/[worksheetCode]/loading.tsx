export default function WorksheetLoading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-12 animate-pulse">
      <aside className="space-y-6">
        <div className="h-3 w-24 bg-paper-2 rounded" />
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-8 bg-paper-2/60 rounded" />
          ))}
        </div>
      </aside>
      <main className="space-y-8 max-w-3xl">
        <header className="border-b border-hairline pb-6">
          <div className="h-3 w-20 bg-paper-2 rounded mb-3" />
          <div className="h-8 w-3/4 bg-paper-2 rounded" />
        </header>
        <div className="space-y-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-1/2 bg-paper-2 rounded" />
              <div className="h-10 bg-paper-2/60 rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
