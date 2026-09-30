'use client';

import katex from 'katex';
import 'katex/dist/katex.min.css';
import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formulaToLatex } from '@/lib/math/formula-to-latex';

type Props = {
  /** The raw equation string from the DB (`equations.formula`). Already
   * ASCII-normalised by the Pass3c importer. */
  source: string;
  /** Inline (false, default) or display-mode (true) rendering. Inline keeps
   * the formula on the baseline with surrounding text; display mode is for
   * standalone formula rows. */
  displayMode?: boolean;
  className?: string;
  /** When true, render the raw source as a fallback `<code>` block on
   * conversion / KaTeX errors instead of throwing. Default: true. */
  fallback?: boolean;
};

/**
 * Module-level cache of typeset HTML keyed by `displayMode|source`.
 *
 * KaTeX typesetting is the single most expensive synchronous step on a
 * worksheet page (a DB formula → LaTeX → HTML+MathML costs ~1–5 ms each and
 * a sheet renders 5–20 of them). The per-instance `useMemo` below already
 * skips the work on re-render; this cache additionally skips it when a card
 * is unmounted and remounted with the same formula (engine-card map rebuilt,
 * `state.rewrite` toggling the substitution row, section re-keyed …). Capped
 * so a long session never grows it unboundedly (FIFO eviction).
 */
const HTML_CACHE = new Map<string, string>();
const HTML_CACHE_MAX = 500;

function typeset(source: string, displayMode: boolean): string {
  if (!source) return '';
  const key = `${displayMode ? 'D' : 'I'}|${source}`;
  const hit = HTML_CACHE.get(key);
  if (hit !== undefined) return hit;
  let html = '';
  try {
    const latex = formulaToLatex(source);
    html = katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      // KaTeX prints `\color{red}` text for failed sub-expressions; that's
      // what we want — visible, not silently swallowed.
      strict: 'ignore',
      output: 'htmlAndMathml',
    });
  } catch {
    html = '';
  }
  if (HTML_CACHE.size >= HTML_CACHE_MAX) {
    const oldest = HTML_CACHE.keys().next().value;
    if (oldest !== undefined) HTML_CACHE.delete(oldest);
  }
  HTML_CACHE.set(key, html);
  return html;
}

/**
 * Renders a DB equation string as KaTeX-typeset math.
 *
 * The conversion is done by `formulaToLatex` (conservative ASCII→LaTeX
 * rewrites — subscripts, exponents, `pi`, `*` → `\cdot`). KaTeX itself is
 * configured with `throwOnError: false` so an unsupported construct shows up
 * as an inline red token rather than blanking the whole row.
 *
 * Memoised on its (all-primitive) props: a parent re-render with the same
 * formula string is a no-op — the worksheet form re-renders on every store
 * write (each register keystroke), and the formulas never change with it.
 */
export const KatexFormula = memo(function KatexFormula({
  source,
  displayMode = false,
  className,
  fallback = true,
}: Props) {
  const html = useMemo(() => typeset(source, displayMode), [source, displayMode]);

  if (!html) {
    return fallback ? (
      <code className={className}>{source}</code>
    ) : null;
  }

  return (
    <span
      // Wide formulas scroll inside this inline container instead of forcing a
      // horizontal scrollbar on the whole page.
      className={cn('inline-block max-w-full overflow-x-auto align-middle scrollbar-hide', className)}
      // KaTeX output is trusted — it comes from our own library invocation
      // against a sanitised conversion of a DB string that is itself
      // ASCII-normalised by the Pass3c importer.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
