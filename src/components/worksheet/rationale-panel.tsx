'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { draftWorksheetRationale } from '@/lib/actions/rationale';

const T = {
  de: {
    title: 'KI-Erläuterung',
    generate: 'Erläuterung erzeugen',
    regenerate: 'Neu erzeugen',
    generating: 'Wird erstellt…',
    copy: 'Kopieren',
    copied: 'Kopiert',
    hint: 'Von der KI auf Basis der aktuellen Eingaben erzeugt — bitte fachlich prüfen, bevor Sie ihn übernehmen.',
  },
  en: {
    title: 'AI rationale',
    generate: 'Generate rationale',
    regenerate: 'Regenerate',
    generating: 'Generating…',
    copy: 'Copy',
    copied: 'Copied',
    hint: 'AI-generated from the current inputs — please review before using it.',
  },
} as const;

export function RationalePanel({
  instanceId,
  locale,
}: {
  instanceId: string;
  locale: 'de' | 'en';
}) {
  const t = T[locale];
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function generate() {
    setError(null);
    startTransition(async () => {
      const res = await draftWorksheetRationale({ worksheetInstanceId: instanceId, locale });
      if (res.ok) {
        setText(res.text);
      } else {
        setError(res.error);
      }
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  return (
    <section className="space-y-2 rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">{t.title}</h2>
        <Button type="button" variant="outline" onClick={generate} disabled={pending}>
          {pending ? t.generating : text ? t.regenerate : t.generate}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {text && (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            className="w-full rounded border border-slate-200 p-2 text-sm text-slate-800"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">{t.hint}</p>
            <Button type="button" variant="ghost" onClick={copy}>
              {copied ? t.copied : t.copy}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
