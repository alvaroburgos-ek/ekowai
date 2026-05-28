'use client';

import { useTranslations } from 'next-intl';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteDocument } from '@/lib/actions/documents';
import type { projectDocuments } from '@/lib/db/schema';

type Doc = typeof projectDocuments.$inferSelect;

export function DocumentList({ docs }: { docs: Doc[] }) {
  const t = useTranslations('documents');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (docs.length === 0) {
    return (
      <p className="font-mono text-[11px] text-subtext py-4">{t('empty')}</p>
    );
  }

  function onDelete(id: string) {
    if (!confirm(t('confirmDelete'))) return;
    setError(null);
    startTransition(async () => {
      const r = await deleteDocument(id);
      if (!r.ok) {
        setError(t(`errors.${r.error}` as Parameters<typeof t>[0]));
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-2">
      <ul className="divide-y divide-hairline">
        {docs.map((d) => (
          <li
            key={d.id}
            className="py-3 flex items-start justify-between gap-4"
          >
            <div className="grid gap-0.5 min-w-0">
              <div className="font-medium truncate">{d.title}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtext">
                {t(`kindOptions.${d.kind}` as Parameters<typeof t>[0])} · {d.citationLabel}
              </div>
              <div className="font-mono text-[10px] text-subtext tabular-nums">
                {(Number(d.fileSize) / 1024).toFixed(0)} KB · {d.sha256.slice(0, 12)}…
              </div>
            </div>
            <button
              onClick={() => onDelete(d.id)}
              disabled={pending}
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-error hover:underline disabled:opacity-50"
            >
              {t('delete')}
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p className="font-mono text-[10px] text-error">{error}</p>
      )}
    </div>
  );
}
