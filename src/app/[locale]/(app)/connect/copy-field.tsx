'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * A read-only value with a copy button.
 *
 * Connecting an MCP client means pasting an exact URL or command — a typo in
 * either produces an opaque failure, so the value is never meant to be typed
 * by hand.
 */
export function CopyField({
  value,
  label,
  copiedLabel,
}: {
  value: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied (insecure context, or the browser refused) — the
      // value stays selectable, so leave the button silent rather than
      // showing a success state that did not happen.
    }
  }

  return (
    <div className="flex items-stretch gap-2">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded border border-ink/10 bg-paper-2 px-3 py-2 font-mono text-xs text-ink">
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        className="inline-flex shrink-0 items-center gap-1.5 rounded border border-ink/15 px-3 py-2 text-xs font-medium text-ink-2 transition-colors hover:bg-paper-2"
      >
        {copied ? (
          <>
            <Check className="size-3.5 text-success" aria-hidden />
            {copiedLabel}
          </>
        ) : (
          <>
            <Copy className="size-3.5" aria-hidden />
            {label}
          </>
        )}
      </button>
    </div>
  );
}
