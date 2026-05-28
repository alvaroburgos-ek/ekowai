'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { removeCitation } from '@/lib/actions/citations';

export type Citation = {
  id: string;
  docId: string;
  page: number | null;
  note: string | null;
};

type DocLookup = Record<string, { title: string; citationLabel: string }>;

type Props = {
  citations: Citation[];
  docs: DocLookup;
  projectId: string;
  fieldId: string;
  onAdd: () => void;
};

export function CitationChips({ citations, docs, projectId, fieldId, onAdd }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onRemove(citationId: string) {
    start(async () => {
      const r = await removeCitation({ projectId, fieldId, citationId });
      if (r.ok) router.refresh();
    });
  }

  if (citations.length === 0) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="text-[10px] uppercase tracking-[0.2em] text-subtext hover:text-ink underline"
      >
        + Quelle
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {citations.map((c) => {
        const label = labelFor(c, docs);
        return (
          <span
            key={c.id}
            className="inline-flex items-center gap-1 rounded bg-paper-2/60 px-1.5 py-0.5 text-[10px] text-subtext"
            title={label}
          >
            <span className="truncate max-w-[14rem]">📎 {label}</span>
            <button
              type="button"
              onClick={() => onRemove(c.id)}
              disabled={pending}
              aria-label={`Quelle entfernen: ${label}`}
              className="text-subtext hover:text-error disabled:opacity-50"
            >
              ×
            </button>
          </span>
        );
      })}
      <button
        type="button"
        onClick={onAdd}
        className="text-[10px] uppercase tracking-[0.2em] text-subtext hover:text-ink underline"
      >
        + weitere
      </button>
    </div>
  );
}

function labelFor(c: Citation, docs: DocLookup): string {
  if (c.docId.startsWith('label:')) return c.note ?? c.docId.slice(6);
  const d = docs[c.docId];
  if (d) return d.title;
  return c.note ?? 'Dokument';
}
