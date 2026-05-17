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
    <section className="border border-hairline bg-paper">
      <header className="border-b border-hairline px-5 py-3 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-subtext mb-0.5">
            Erläuterungstext
          </div>
          <h2 className="text-lg font-semibold text-ink tracking-tight">{t('rationale')}</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled={drafting} onClick={draft}>
            {drafting ? t('drafting') : t('draftWithAI')}
          </Button>
          <Button size="sm" disabled={saving} onClick={save}>
            {saving ? t('saving') : t('save')}
          </Button>
        </div>
      </header>
      <div className="px-5 py-5 space-y-3">
        {draftError && (
          <p className="text-[11px] text-error">⚠ {draftError}</p>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Ihre Begründung — oder lassen Sie KI einen Entwurf vorschlagen."
          className="block w-full rounded-none border-0 border-l-2 border-hairline focus:border-accent bg-paper-2/30 p-4 text-sm text-ink leading-relaxed focus:outline-none focus:ring-0 resize-y font-body"
        />
        {savedAt && (
          <p className="text-[10px] uppercase tracking-[0.2em] text-success">
            ● {t('savedAt')} {new Date(savedAt).toLocaleTimeString(locale)}
          </p>
        )}
      </div>
    </section>
  );
}
