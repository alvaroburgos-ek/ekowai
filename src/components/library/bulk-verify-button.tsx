'use client';

import { useState, useTransition } from 'react';
import { verifyAllFieldsInWorksheet } from '@/lib/actions/verification';

export function BulkVerifyFieldsButton({
  worksheetTemplateId,
  unverifiedCount,
}: {
  worksheetTemplateId: string;
  unverifiedCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [note, setNote] = useState('');
  const [result, setResult] = useState<string | null>(null);

  if (unverifiedCount === 0) return null;

  function run() {
    startTransition(async () => {
      try {
        const n = await verifyAllFieldsInWorksheet(worksheetTemplateId, note || undefined);
        setResult(`${n} Feld${n === 1 ? '' : 'er'} bestätigt.`);
        setConfirmOpen(false);
        setNote('');
      } catch (e) {
        setResult(e instanceof Error ? e.message : 'Fehler');
      }
    });
  }

  if (confirmOpen) {
    return (
      <div className="flex flex-wrap items-center gap-2 border border-hairline rounded p-2 bg-paper-2/30">
        <span className="text-sm text-ink">
          {unverifiedCount} ungeprüfte Felder bestätigen?
        </span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optionale Notiz (gilt für alle)"
          maxLength={500}
          className="text-xs px-2 py-1 border border-hairline rounded bg-paper text-ink flex-1 min-w-[200px]"
        />
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="text-xs px-3 py-1 bg-accent text-paper rounded hover:bg-accent/90 disabled:opacity-50"
        >
          {pending ? 'läuft …' : 'Alle bestätigen'}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirmOpen(false);
            setNote('');
          }}
          disabled={pending}
          className="text-xs text-subtext hover:text-ink"
        >
          Abbrechen
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="text-xs px-3 py-1 border border-accent text-accent rounded hover:bg-accent hover:text-paper transition-colors"
      >
        Alle {unverifiedCount} ungeprüften Felder bestätigen
      </button>
      {result && <span className="text-xs text-success">{result}</span>}
    </div>
  );
}
