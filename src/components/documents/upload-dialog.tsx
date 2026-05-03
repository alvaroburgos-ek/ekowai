'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { uploadDocument } from '@/lib/actions/documents';
import { Button } from '@/components/ui/button';

const KINDS = [
  'lab_analysis',
  'authority_decision',
  'soil_report',
  'hydrology',
  'correspondence',
  'other',
] as const;

export function UploadDialog({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone?: () => void;
}) {
  const t = useTranslations('documents');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.append('projectId', projectId);
    startTransition(async () => {
      const r = await uploadDocument(fd);
      if (!r.ok) {
        setError(t(`errors.${r.error}` as any));
      } else {
        form.reset();
        onDone?.();
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 border border-hairline p-4 rounded"
    >
      <label className="grid gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
          {t('file')}
        </span>
        <input
          type="file"
          name="file"
          required
          accept=".pdf,.png,.jpg,.jpeg,.tiff,.docx,.xlsx"
        />
      </label>
      <label className="grid gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
          {t('kind')}
        </span>
        <select
          name="kind"
          required
          className="border border-hairline px-2 py-1 bg-transparent"
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`kindOptions.${k}` as any)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
          {t('titleLabel')}
        </span>
        <input
          name="title"
          required
          maxLength={200}
          className="border border-hairline px-2 py-1"
        />
      </label>
      <label className="grid gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
          {t('citationLabel')}
        </span>
        <input
          name="citationLabel"
          required
          maxLength={200}
          className="border border-hairline px-2 py-1"
        />
      </label>
      <label className="grid gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
          {t('issuedAt')}
        </span>
        <input
          type="date"
          name="issuedAt"
          className="border border-hairline px-2 py-1"
        />
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? '…' : t('submit')}
        </Button>
        {error && (
          <span className="text-error font-mono text-[11px]">{error}</span>
        )}
      </div>
    </form>
  );
}
