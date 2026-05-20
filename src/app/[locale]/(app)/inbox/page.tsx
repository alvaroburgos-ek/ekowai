/**
 * PLAN 6 REATTACHMENT PENDING.
 *
 * The inbox previously listed calculations pending approval from the
 * now-dropped calculations + approvals tables. Plan 6 rebuilds this
 * page against approval_events + worksheet_instances.
 */

export default async function InboxPage() {
  return (
    <article className="space-y-10">
      <header className="border-b border-hairline pb-8">
        <div className="text-[10px] uppercase tracking-[0.25em] text-subtext mb-2">
          Sektion 03 · Zur Prüfung
        </div>
        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-ink">
          Eingang
        </h1>
      </header>
      <div className="border border-dashed border-hairline-strong p-12 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-subtext mb-3">
          Wird in Plan 6 neu aufgebaut
        </p>
        <p className="text-xl font-semibold text-ink-2 tracking-tight">
          Der Prüfungseingang wird in Plan 6 gegen das neue Schema neu entwickelt.
        </p>
      </div>
    </article>
  );
}
