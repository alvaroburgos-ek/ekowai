'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setDeviation, withdrawDeviation } from '@/lib/actions/deviations';

type Doc = { id: string; title: string; citationLabel: string };

type BasisCitation = { id: string; docId: string; page: number | null; note: string | null };

type Props = {
  projectId: string;
  requirementId: string;
  requirementCode: string;
  docs: Doc[];
  existing?: { justification: string };
};

export function DeviationForm({
  projectId,
  requirementId,
  requirementCode,
  docs,
  existing,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [justification, setJustification] = useState(existing?.justification ?? '');
  const [basisCitations, setBasisCitations] = useState<BasisCitation[]>([]);
  const [authorityRef, setAuthorityRef] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave =
    justification.trim().length >= 10 && basisCitations.length >= 1;

  function addDocCitation(docId: string) {
    if (basisCitations.some((c) => c.docId === docId)) return;
    setBasisCitations((prev) => [
      ...prev,
      { id: crypto.randomUUID(), docId, page: null, note: null },
    ]);
    setPickerOpen(false);
  }

  function removeCitation(id: string) {
    setBasisCitations((prev) => prev.filter((c) => c.id !== id));
  }

  function handleSave() {
    setError(null);
    start(async () => {
      const r = await setDeviation({
        projectId,
        requirementId,
        justification: justification.trim(),
        basisCitations,
        authorityRef: authorityRef.trim() || undefined,
      });
      if (r.ok) {
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  function handleWithdraw() {
    setError(null);
    start(async () => {
      const r = await withdrawDeviation({ projectId, requirementId });
      if (r.ok) {
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  const docLookup = Object.fromEntries(docs.map((d) => [d.id, d]));

  return (
    <div className="mt-2 ml-[140px] border-l-2 border-accent/40 bg-paper-2/30 px-3 py-3 rounded-r space-y-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-accent">
        Abweichung {existing ? 'bearbeiten' : 'dokumentieren'} — {requirementCode}
      </div>

      {/* Justification */}
      <label className="grid gap-1">
        <span className="text-[10px] uppercase tracking-[0.18em] text-subtext">
          Begründung <span className="text-accent-2">*</span>
        </span>
        <textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Mindestens 10 Zeichen …"
          className="block w-full rounded-md border border-hairline-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-0 resize-y"
        />
        {justification.trim().length > 0 && justification.trim().length < 10 && (
          <span className="text-[10px] text-error">
            Mindestens 10 Zeichen erforderlich ({justification.trim().length}/10)
          </span>
        )}
      </label>

      {/* Authority reference */}
      <label className="grid gap-1">
        <span className="text-[10px] uppercase tracking-[0.18em] text-subtext">
          Behördliche Referenz (optional)
        </span>
        <input
          type="text"
          value={authorityRef}
          onChange={(e) => setAuthorityRef(e.target.value)}
          maxLength={500}
          placeholder="z.B. Bescheid Az. 12-345/2024"
          className="block w-full rounded-md border border-hairline-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-0"
        />
      </label>

      {/* Basis citations */}
      <div className="grid gap-1">
        <span className="text-[10px] uppercase tracking-[0.18em] text-subtext">
          Belege <span className="text-accent-2">*</span>{' '}
          <span className="normal-case tracking-normal text-subtext font-normal">
            (mind. 1 Dokument)
          </span>
        </span>
        {basisCitations.length > 0 && (
          <ul className="space-y-1 mb-1">
            {basisCitations.map((c) => {
              const doc = docLookup[c.docId];
              return (
                <li
                  key={c.id}
                  className="flex items-baseline justify-between gap-2 text-xs border border-hairline rounded px-2 py-1"
                >
                  <span className="text-ink">
                    {doc ? (
                      <>
                        <span className="font-medium">{doc.title}</span>{' '}
                        <span className="text-subtext text-[10px] uppercase tracking-[0.15em]">
                          {doc.citationLabel}
                        </span>
                      </>
                    ) : (
                      <span className="text-subtext">{c.docId}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCitation(c.id)}
                    className="text-[10px] uppercase tracking-[0.18em] text-error hover:text-ink shrink-0"
                    aria-label="Beleg entfernen"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className="self-start text-[10px] uppercase tracking-[0.18em] text-accent hover:text-ink underline"
        >
          + Dokument hinzufügen
        </button>
      </div>

      {/* Inline doc picker */}
      {pickerOpen && (
        <div className="border border-hairline rounded bg-paper p-3 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.18em] text-subtext">
              Dokument wählen
            </span>
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="text-[10px] uppercase text-subtext hover:text-ink"
              aria-label="Schließen"
            >
              ×
            </button>
          </div>
          {docs.length === 0 ? (
            <p className="text-[11px] text-subtext">
              Keine Dokumente vorhanden — bitte zuerst unter Dokumente hochladen.
            </p>
          ) : (
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {docs.map((d) => {
                const already = basisCitations.some((c) => c.docId === d.id);
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => addDocCitation(d.id)}
                      disabled={already}
                      className="w-full text-left border border-hairline p-2 hover:border-ink disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm"
                    >
                      <div className="font-medium text-ink">{d.title}</div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-subtext">
                        {d.citationLabel}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <span className="text-[10px] text-error">Fehler: {error}</span>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap items-center">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || pending}
          className="px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] rounded bg-accent text-paper hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? '…' : 'Speichern'}
        </button>
        {existing && (
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={pending}
            className="px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] rounded border border-error text-error hover:bg-error/10 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Zurückziehen
          </button>
        )}
      </div>
    </div>
  );
}
