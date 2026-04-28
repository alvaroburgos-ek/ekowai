'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useCalculatorStore } from '@/lib/state/calculator-store';
import { saveRationale } from '@/lib/actions/calculation';
import { Button } from '@/components/ui/button';

export function RationaleBox({
  initialDraft,
  initialFinal,
  locale,
}: {
  initialDraft: string | null;
  initialFinal: string | null;
  locale: 'de' | 'en';
}) {
  const t = useTranslations('calc');
  const calcId = useCalculatorStore((s) => s.calcId);
  const [text, setText] = useState(initialFinal ?? initialDraft ?? '');
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function draft() {
    if (!calcId) return;
    setDrafting(true);
    setDraftError(null);
    try {
      const r = await fetch('/api/draft-rationale', {
        method: 'POST',
        body: JSON.stringify({ calcId, locale }),
        headers: { 'content-type': 'application/json' },
      });
      if (r.ok) {
        const j = (await r.json()) as { text: string };
        setText(j.text);
      } else {
        const j = (await r.json().catch(() => ({}))) as { error?: string; message?: string };
        setDraftError(j.message ?? j.error ?? `HTTP ${r.status}`);
      }
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : 'request failed');
    } finally {
      setDrafting(false);
    }
  }

  function save() {
    if (!calcId) return;
    startSave(async () => {
      const r = await saveRationale({ calcId, rationale: text });
      if (r.ok) setSavedAt(new Date().toISOString());
    });
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-slate-900">{t('rationale')}</h2>
        <div className="flex gap-2">
          <Button variant="ghost" disabled={drafting} onClick={draft}>
            {drafting ? t('drafting') : t('draftWithAI')}
          </Button>
          <Button disabled={saving} onClick={save}>
            {saving ? t('saving') : t('save')}
          </Button>
        </div>
      </div>
      {draftError && <p className="text-xs text-red-700">{draftError}</p>}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="block w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-700"
      />
      {savedAt && (
        <p className="text-xs text-slate-600">
          {t('savedAt')} {new Date(savedAt).toLocaleTimeString(locale)}
        </p>
      )}
    </section>
  );
}
