'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { attachSource, detachSource } from '@/lib/actions/citations';
import { Button } from '@/components/ui/button';
import type { projectDocuments } from '@/lib/db/schema';

type Doc = typeof projectDocuments.$inferSelect;

export function CitationPicker({
  open,
  onClose,
  calcId,
  symbol,
  docs,
}: {
  open: boolean;
  onClose: () => void;
  calcId: string;
  symbol: string;
  docs: Doc[];
}) {
  const t = useTranslations('citations');
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<'doc' | 'label'>('doc');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function complete() {
    router.refresh();
    onClose();
  }

  function pickDoc(docId: string) {
    setError(null);
    start(async () => {
      const r = await attachSource({ calcId, symbol, source: { docId } });
      if (!r.ok) setError(t(`errors.${r.error}` as any) || r.error);
      else complete();
    });
  }
  function pickLabel() {
    if (!label.trim()) return;
    setError(null);
    start(async () => {
      const r = await attachSource({
        calcId,
        symbol,
        source: { label: label.trim() },
      });
      if (!r.ok) setError(t(`errors.${r.error}` as any) || r.error);
      else complete();
    });
  }
  function detach() {
    setError(null);
    start(async () => {
      const r = await detachSource({ calcId, symbol });
      if (!r.ok) setError(t(`errors.${r.error}` as any) || r.error);
      else complete();
    });
  }

  return (
    <div
      className="fixed inset-0 bg-ink/50 grid place-items-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-paper border border-hairline-strong p-6 max-w-md w-full grid gap-4 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-baseline">
          <h2 className="text-lg">
            {t('title')} <span className="font-mono text-sm">{symbol}</span>
          </h2>
          <button
            onClick={onClose}
            className="font-mono text-[10px] uppercase"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex gap-3 border-b border-hairline">
          <button
            onClick={() => setTab('doc')}
            className={`pb-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
              tab === 'doc' ? 'border-b-2 border-ink' : 'text-subtext'
            }`}
          >
            {t('fromDoc')}
          </button>
          <button
            onClick={() => setTab('label')}
            className={`pb-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
              tab === 'label' ? 'border-b-2 border-ink' : 'text-subtext'
            }`}
          >
            {t('asText')}
          </button>
        </div>

        {tab === 'doc' && (
          <div className="grid gap-2 max-h-72 overflow-auto">
            {docs.length === 0 && (
              <p className="font-mono text-[11px] text-subtext">{t('noDocs')}</p>
            )}
            {docs.map((d) => (
              <button
                key={d.id}
                onClick={() => pickDoc(d.id)}
                disabled={pending}
                className="text-left border border-hairline p-2 hover:border-ink disabled:opacity-50"
              >
                <div className="font-medium">{d.title}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtext">
                  {d.citationLabel}
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === 'label' && (
          <div className="grid gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('labelPlaceholder')}
              className="border border-hairline px-3 py-2"
              maxLength={200}
            />
            <Button onClick={pickLabel} disabled={pending || !label.trim()}>
              {t('save')}
            </Button>
          </div>
        )}

        <div className="border-t border-hairline pt-3 flex items-center justify-between">
          <button
            onClick={detach}
            disabled={pending}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-error hover:underline disabled:opacity-50"
          >
            {t('removeSource')}
          </button>
          {error && (
            <span className="font-mono text-[10px] text-error">{error}</span>
          )}
        </div>
      </div>
    </div>
  );
}
