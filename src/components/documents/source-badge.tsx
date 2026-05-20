'use client';

import type { InputSource } from '@/lib/engine/inputs-reader';

export function SourceBadge({
  source,
  docTitle,
  onClick,
}: {
  source?: InputSource;
  docTitle?: string;
  onClick: () => void;
}) {
  if (!source) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtext hover:text-ink underline"
      >
        + Quelle
      </button>
    );
  }
  const label = 'docId' in source ? docTitle ?? 'Dokument' : source.label;
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent hover:text-accent-2 truncate max-w-[14rem]"
      title={label}
    >
      📎 {label}
    </button>
  );
}
