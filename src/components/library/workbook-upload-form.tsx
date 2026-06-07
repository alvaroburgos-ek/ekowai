'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  previewWorkbookImport,
  executeWorkbookImport,
  type PreviewResult,
  type ExecuteResult,
} from '@/lib/actions/workbook-import';

export function WorkbookUploadForm({ locale }: { locale: 'de' | 'en' }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ExecuteResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [showAllChanges, setShowAllChanges] = useState(false);

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
  }

  function runPreview(selected: File) {
    setFile(selected);
    setPreview(null);
    setResult(null);
    const fd = new FormData();
    fd.append('file', selected);
    startTransition(async () => {
      const res = await previewWorkbookImport(fd);
      setPreview(res);
    });
  }

  function runImport() {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    startTransition(async () => {
      const res = await executeWorkbookImport(fd);
      setResult(res);
      if (res.ok) {
        router.refresh();
      }
    });
  }

  if (result?.ok) {
    return (
      <div className="space-y-4 border border-success rounded p-6 bg-success/5">
        <h2 className="text-lg font-semibold text-ink">Import abgeschlossen</h2>
        <dl className="text-sm grid grid-cols-2 gap-2 max-w-md">
          <dt className="text-subtext">Standard</dt>
          <dd className="font-mono">{result.standardCode}</dd>
          <dt className="text-subtext">Worksheets</dt>
          <dd className="font-mono tabular-nums">{result.counts.worksheetTemplates}</dd>
          <dt className="text-subtext">Felder</dt>
          <dd className="font-mono tabular-nums">{result.counts.fields}</dd>
          <dt className="text-subtext">Gleichungen</dt>
          <dd className="font-mono tabular-nums">{result.counts.equations}</dd>
          <dt className="text-subtext">Compliance</dt>
          <dd className="font-mono tabular-nums">{result.counts.complianceRequirements}</dd>
          {(result.counts.revertedFields > 0 || result.counts.revertedEquations > 0) && (
            <>
              <dt className="text-accent-2 col-span-2 mt-2 text-xs uppercase tracking-[0.18em]">
                Auf imported_unverified zurückgesetzt
              </dt>
              <dt className="text-subtext">Felder</dt>
              <dd className="font-mono tabular-nums">{result.counts.revertedFields}</dd>
              <dt className="text-subtext">Gleichungen</dt>
              <dd className="font-mono tabular-nums">{result.counts.revertedEquations}</dd>
            </>
          )}
        </dl>
        <div className="flex gap-3">
          <Link
            href={`/${locale}/standards/${result.standardCode}`}
            className="text-sm text-accent hover:underline"
          >
            Direkt zu {result.standardCode} →
          </Link>
          <button
            type="button"
            onClick={reset}
            className="text-sm text-subtext hover:text-ink"
          >
            Weiteren Workbook hochladen
          </button>
        </div>
      </div>
    );
  }

  if (result && !result.ok) {
    return (
      <div className="space-y-4 border border-accent-2 rounded p-6 bg-accent-2/5">
        <h2 className="text-lg font-semibold text-accent-2">Import fehlgeschlagen</h2>
        <p className="text-sm text-ink">{result.error}</p>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="text-sm text-subtext hover:text-ink"
        >
          Zurück zur Vorschau
        </button>
      </div>
    );
  }

  if (preview && preview.ok) {
    const diff = preview.diff;
    const willResetTotal = diff.fields.willResetVerification + diff.equations.willResetVerification;
    const changed = diff.fields.details.filter((d) => d.type === 'changed');
    const newFields = diff.fields.details.filter((d) => d.type === 'new');
    const shown = showAllChanges ? changed : changed.slice(0, 10);

    return (
      <div className="space-y-6">
        <div className="border border-hairline rounded p-5 space-y-4">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-semibold text-ink min-w-0 break-words">
              Vorschau: {preview.filename}
            </h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-subtext shrink-0">
              {diff.standardExists ? 'Re-Import' : 'Neuer Standard'}
            </span>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <Stat label="Standard" value={diff.standardCode} mono />
            <Stat label="Worksheets" value={`${diff.worksheetsNew} neu · ${diff.worksheetsUpdated} aktualisiert`} />
            <Stat label="Felder" value={`+${diff.fields.added} · ~${diff.fields.changed} · =${diff.fields.unchanged}`} />
            <Stat label="Gleichungen" value={`+${diff.equations.added} · ~${diff.equations.changed} · =${diff.equations.unchanged}`} />
          </dl>
          {willResetTotal > 0 && (
            <div className="border border-accent-2/40 bg-accent-2/5 rounded p-3 text-sm">
              <strong className="text-accent-2">Re-Import-Verhalten:</strong>{' '}
              {diff.fields.willResetVerification} Feld
              {diff.fields.willResetVerification === 1 ? '' : 'er'}
              {diff.equations.willResetVerification > 0
                ? ` und ${diff.equations.willResetVerification} Gleichung${diff.equations.willResetVerification === 1 ? '' : 'en'}`
                : ''}{' '}
              waren <code className="font-mono text-xs">engineer_verified</code> und ändern sich inhaltlich — der Status wird zurück auf{' '}
              <code className="font-mono text-xs">imported_unverified</code> gesetzt. Bitte erneut prüfen.
            </div>
          )}
          {diff.orphanFields.length > 0 && (
            <div className="border border-hairline bg-paper-2/30 rounded p-3 text-sm">
              <strong className="text-ink">Hinweis:</strong> {diff.orphanFields.length} Feld{diff.orphanFields.length === 1 ? '' : 'er'} aus der DB sind im neuen Workbook nicht enthalten. Sie bleiben in der DB erhalten.
            </div>
          )}
        </div>

        {changed.length > 0 && (
          <details className="border border-hairline rounded p-4" open>
            <summary className="cursor-pointer text-sm font-medium text-ink">
              Geänderte Felder ({changed.length})
            </summary>
            <ul className="mt-3 space-y-1 text-sm">
              {shown.map((c) => (
                <li
                  key={`${c.worksheetCode}|${c.symbol}`}
                  className="flex flex-wrap items-baseline gap-2 py-1 border-b border-hairline last:border-b-0"
                >
                  <code className="font-mono text-xs text-subtext shrink-0">{c.worksheetCode}</code>
                  <code className="font-mono text-xs text-ink shrink-0">{c.symbol}</code>
                  <span className="text-[11px] text-subtext flex-1 min-w-0">
                    geändert: {c.changedColumns.join(', ')}
                  </span>
                  {c.willResetVerification && (
                    <span className="text-[10px] uppercase tracking-[0.18em] text-accent-2 shrink-0">
                      reset
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {changed.length > shown.length && (
              <button
                type="button"
                onClick={() => setShowAllChanges(true)}
                className="text-xs text-accent hover:underline mt-2"
              >
                Alle {changed.length} anzeigen
              </button>
            )}
          </details>
        )}

        {newFields.length > 0 && (
          <details className="border border-hairline rounded p-4">
            <summary className="cursor-pointer text-sm font-medium text-ink">
              Neue Felder ({newFields.length})
            </summary>
            <ul className="mt-3 text-sm grid grid-cols-1 sm:grid-cols-2 gap-1">
              {newFields.slice(0, 100).map((c) => (
                <li key={`${c.worksheetCode}|${c.symbol}`} className="text-ink-2">
                  <code className="font-mono text-xs text-subtext mr-2">{c.worksheetCode}</code>
                  <code className="font-mono text-xs">{c.symbol}</code>
                </li>
              ))}
              {newFields.length > 100 && (
                <li className="text-subtext text-xs col-span-2">
                  … und {newFields.length - 100} weitere
                </li>
              )}
            </ul>
          </details>
        )}

        <div className="flex flex-wrap gap-3 items-center pt-2">
          <button
            type="button"
            onClick={runImport}
            disabled={pending}
            className="text-sm px-4 py-2 bg-accent text-paper rounded hover:bg-accent/90 disabled:opacity-50"
          >
            {pending ? 'Import läuft …' : 'Import bestätigen'}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={pending}
            className="text-sm text-subtext hover:text-ink disabled:opacity-50"
          >
            Abbrechen
          </button>
        </div>
      </div>
    );
  }

  if (preview && !preview.ok) {
    return (
      <div className="space-y-3 border border-accent-2 rounded p-5 bg-accent-2/5">
        <h2 className="text-lg font-semibold text-accent-2">{preview.error}</h2>
        {preview.validationErrors && preview.validationErrors.length > 0 && (
          <details open className="text-sm">
            <summary className="cursor-pointer">Details ({preview.validationErrors.length})</summary>
            <ul className="mt-2 space-y-1 max-h-64 overflow-auto">
              {preview.validationErrors.slice(0, 50).map((e, i) => (
                <li key={i} className="text-ink-2">
                  <span className="text-subtext mr-2">[{e.sheet} r{e.row}]</span>
                  {e.message}
                </li>
              ))}
            </ul>
          </details>
        )}
        <button
          type="button"
          onClick={reset}
          className="text-sm text-subtext hover:text-ink"
        >
          Andere Datei auswählen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label
        className={`block border-2 border-dashed rounded p-8 sm:p-12 text-center cursor-pointer transition-colors ${pending ? 'border-hairline bg-paper-2/50' : 'border-hairline hover:border-accent hover:bg-paper-2/30'}`}
      >
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          disabled={pending}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) runPreview(f);
          }}
        />
        <div className="space-y-2">
          <div className="text-sm text-ink">
            {pending ? 'Workbook wird geparst …' : 'Pass3c-Workbook auswählen (.xlsx)'}
          </div>
          <div className="text-[11px] text-subtext">
            Datei → Parser → Validierung → Vorschau-Diff → Bestätigung
          </div>
        </div>
      </label>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-subtext">{label}</div>
      <div className={`text-sm text-ink mt-1 ${mono ? 'font-mono tabular-nums' : ''}`}>{value}</div>
    </div>
  );
}
