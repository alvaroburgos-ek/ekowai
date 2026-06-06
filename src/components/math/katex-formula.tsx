'use client';

import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';
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
 * Renders a DB equation string as KaTeX-typeset math.
 *
 * The conversion is done by `formulaToLatex` (conservative ASCII→LaTeX
 * rewrites — subscripts, exponents, `pi`, `*` → `\cdot`). KaTeX itself is
 * configured with `throwOnError: false` so an unsupported construct shows up
 * as an inline red token rather than blanking the whole row.
 */
export function KatexFormula({
  source,
  displayMode = false,
  className,
  fallback = true,
}: Props) {
  const html = useMemo(() => {
    if (!source) return '';
    try {
      const latex = formulaToLatex(source);
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        // KaTeX prints `\color{red}` text for failed sub-expressions; that's
        // what we want — visible, not silently swallowed.
        strict: 'ignore',
        output: 'htmlAndMathml',
      });
    } catch {
      return '';
    }
  }, [source, displayMode]);

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
}
