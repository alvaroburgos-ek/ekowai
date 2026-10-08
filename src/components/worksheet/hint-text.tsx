'use client';
import { useState } from 'react';
import { firstSentence } from '@/lib/eval/hint-text';

/**
 * U-7 (UX pass 820, 2026-10-08): a form hint shows its first sentence; the rest unfolds on „mehr" / "more"
 * (collapsed by default, `aria-expanded`). Texts up to 180 characters are shown whole (`firstSentence`). The toggle
 * sits inline at the end of the paragraph, so expanding only grows that paragraph. Display only — PDFs and MCP read
 * `description` directly and always carry the full text.
 */
export function HintText({
  text,
  locale,
  className,
  testId,
}: {
  text: string;
  locale: 'de' | 'en';
  className?: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const { head, rest } = firstSentence(text);
  return (
    <p className={className} data-testid={testId}>
      {rest == null || !open ? head : text.trim()}
      {rest != null && (
        <>
          {' '}
          <button
            type="button"
            className="text-accent hover:text-ink underline-offset-2 hover:underline"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            data-testid="hint-toggle"
          >
            {open ? (locale === 'de' ? 'weniger' : 'less') : locale === 'de' ? 'mehr' : 'more'}
          </button>
        </>
      )}
    </p>
  );
}
