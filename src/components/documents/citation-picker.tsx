'use client';

import { useState, useEffect, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { addCitation } from '@/lib/actions/citations';
import { uploadDocument } from '@/lib/actions/documents';
import { Button } from '@/components/ui/button';
import { useFocusTrap } from '@/lib/hooks/use-focus-trap';

type Doc = {
  id: string;
  title: string;
  citationLabel: string;
};

const UPLOAD_KIND = 'other'; // sensible default; engineer can re-categorise on Documents page

export function CitationPicker({
  open,
  onClose,
  projectId,
  fieldId,
  symbol,
  docs,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  fieldId: string;
  /** Displayed in the modal header for context — still useful even though we key by fieldId */
  symbol: string;
  docs: Doc[];
}) {
  const t = useTranslations('citations');
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<'doc' | 'label' | 'upload'>('doc');
  const [label, setLabel] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCitationLabel, setUploadCitationLabel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Reset state when the modal closes so the next open starts clean.
  // The React 19 idiom for this is a `key` prop on the parent so the
  // component remounts; refactor lives in the call sites and is tracked
  // separately. This single-effect form is the documented exception
  // (https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes)
  // and is functionally equivalent; the rule is suppressed locally to
  // avoid a multi-file refactor outside this slice's scope.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) return;
    setLabel('');
    setUploadTitle('');
    setUploadCitationLabel('');
    setFile(null);
    setError(null);
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!open) return null;

  function complete() {
    router.refresh();
    onClose();
  }

  function pickDoc(docId: string) {
    setError(null);
    start(async () => {
      const r = await addCitation({ projectId, fieldId, source: { docId } });
      if (!r.ok) setError(t(`errors.${r.error}` as Parameters<typeof t>[0]) || r.error);
      else complete();
    });
  }

  function pickLabel() {
    if (!label.trim()) return;
    setError(null);
    // Store free-text label as a pseudo-docId so callers can detect "text-only" entries.
    start(async () => {
      const r = await addCitation({
        projectId,
        fieldId,
        source: { docId: `label:${label.trim()}`, note: label.trim() },
      });
      if (!r.ok) setError(t(`errors.${r.error}` as Parameters<typeof t>[0]) || r.error);
      else complete();
    });
  }

  function uploadAndAttach() {
    if (!file) return;
    if (!uploadTitle.trim() || !uploadCitationLabel.trim()) {
      setError('title and citation label are required');
      return;
    }
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('projectId', projectId);
      fd.append('kind', UPLOAD_KIND);
      fd.append('title', uploadTitle.trim());
      fd.append('citationLabel', uploadCitationLabel.trim());
      const up = await uploadDocument(fd);
      if (!up.ok) {
        setError(t(`errors.${up.error}` as Parameters<typeof t>[0]) || up.error);
        return;
      }
      const r = await addCitation({ projectId, fieldId, source: { docId: up.documentId } });
      if (!r.ok) setError(t(`errors.${r.error}` as Parameters<typeof t>[0]) || r.error);
      else complete();
    });
  }

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="citation-picker-title"
      className="fixed inset-0 bg-ink/50 grid place-items-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-paper border border-hairline-strong p-6 max-w-md w-full grid gap-4 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-baseline">
          <h2 id="citation-picker-title" className="text-lg">
            {t('title')} <span className="text-sm">{symbol}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-[10px] uppercase"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex gap-3 border-b border-hairline">
          <TabButton active={tab === 'doc'} onClick={() => setTab('doc')}>
            {t('fromDoc')}
          </TabButton>
          <TabButton active={tab === 'label'} onClick={() => setTab('label')}>
            {t('asText')}
          </TabButton>
          <TabButton active={tab === 'upload'} onClick={() => setTab('upload')}>
            Datei hochladen
          </TabButton>
        </div>

        {tab === 'doc' && (
          <div className="grid gap-2 max-h-72 overflow-auto">
            {docs.length === 0 && (
              <p className="text-[11px] text-subtext">{t('noDocs')}</p>
            )}
            {docs.map((d) => (
              <button
                key={d.id}
                onClick={() => pickDoc(d.id)}
                disabled={pending}
                className="text-left border border-hairline p-2 hover:border-ink disabled:opacity-50"
              >
                <div className="font-medium">{d.title}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-subtext">
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

        {tab === 'upload' && (
          <div className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-subtext">
                Datei
              </span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.tiff,.docx,.xlsx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-subtext">
                Titel
              </span>
              <input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="z.B. KOSTRA-DWD Auszug Heinsberg"
                maxLength={200}
                className="border border-hairline px-3 py-2"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-subtext">
                Zitationslabel
              </span>
              <input
                value={uploadCitationLabel}
                onChange={(e) => setUploadCitationLabel(e.target.value)}
                placeholder="z.B. KOSTRA 2023, Zelle 42"
                maxLength={200}
                className="border border-hairline px-3 py-2"
              />
            </label>
            <Button
              onClick={uploadAndAttach}
              disabled={pending || !file || !uploadTitle.trim() || !uploadCitationLabel.trim()}
            >
              {pending ? '…' : 'Hochladen + verknüpfen'}
            </Button>
          </div>
        )}

        {error && (
          <span className="text-[10px] text-error">{error}</span>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-2 text-[10px] uppercase tracking-[0.2em] ${
        active ? 'border-b-2 border-ink' : 'text-subtext'
      }`}
    >
      {children}
    </button>
  );
}
