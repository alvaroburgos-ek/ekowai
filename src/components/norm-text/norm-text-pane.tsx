'use client';

/**
 * Slide-in panel that fetches and renders the norm-text section for a given
 * clauseReference (e.g. `§5.3.3.5`).
 *
 * Layout:
 *   - ≥md: slide-in from the right, fixed width (max-w-2xl), full height.
 *   - <md: full-screen modal (the slide-in turns into a sheet).
 *
 * The pane is "dumb" — it fetches on every (open, clauseReference) change and
 * caches in component state for the duration the panel is open. The provider
 * owns the open/close state.
 *
 * Markdown rendering uses `react-markdown`. Heavy math blocks
 * (`$$\begin{equation*} … \end{equation*}$$`) are kept verbatim in a `<pre>`
 * fallback — LaTeX rendering with KaTeX is a separate concern (the worksheet
 * form already renders symbols via KaTeX in other places; surfacing the raw
 * normative formula text is fine for a reader pane).
 */

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { getNormSection, type GetNormSectionResult } from '@/lib/actions/norm-text';
import { useFocusTrap } from '@/lib/hooks/use-focus-trap';

type Props = {
  standardCode: string;
  clauseReference: string | null;
  open: boolean;
  onClose: () => void;
};

type FetchState =
  | { kind: 'loading' }
  | { kind: 'loaded'; result: GetNormSectionResult }
  | { kind: 'error'; message: string };

export function NormTextPane({ standardCode, clauseReference, open, onClose }: Props) {
  const containerRef = useFocusTrap(open);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !clauseReference) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="norm-text-pane-title"
      className="fixed inset-0 z-50"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel — the inner content is keyed by (standardCode, clauseReference)
          so a new clause REMOUNTS the loader. That side-steps the
          react-hooks/set-state-in-effect rule: we never need to synchronously
          reset state to 'loading' on prop change, because the initial state
          of the freshly-mounted child IS 'loading'. */}
      <div
        ref={containerRef}
        className="absolute inset-y-0 right-0 w-full sm:max-w-2xl bg-paper border-l border-hairline-strong shadow-2xl flex flex-col"
        data-testid="norm-text-pane"
      >
        <NormTextPaneContent
          key={`${standardCode}:${clauseReference}`}
          standardCode={standardCode}
          clauseReference={clauseReference}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

/**
 * Inner content of the pane. Its parent keys it by (standardCode,
 * clauseReference) so a new clause produces a fresh mount with a fresh
 * `loading` initial state — no synchronous setState in an effect needed.
 *
 * The single effect kicks off the fetch on mount; the only state transitions
 * happen inside the awaited promise callbacks, which is the React-recommended
 * pattern for data fetching with effects.
 */
function NormTextPaneContent({
  standardCode,
  clauseReference,
  onClose,
}: {
  standardCode: string;
  clauseReference: string;
  onClose: () => void;
}) {
  const [state, setState] = useState<FetchState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    getNormSection({ standardCode, clauseReference })
      .then((result) => {
        if (cancelled) return;
        setState({ kind: 'loaded', result });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [standardCode, clauseReference]);

  return (
    <>
      <header className="flex items-baseline justify-between gap-4 px-4 py-4 sm:px-6 border-b border-hairline">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.25em] text-subtext break-words">
            {standardCode} · {clauseReference}
          </div>
          <h2
            id="norm-text-pane-title"
            className="text-base font-semibold text-ink truncate"
            data-testid="norm-text-title"
          >
            {state.kind === 'loaded' && state.result.found
              ? state.result.title
              : clauseReference}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-subtext hover:text-ink text-sm px-2 py-1 rounded shrink-0"
          aria-label="Schließen"
        >
          ✕
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {state.kind === 'loading' && (
          <p className="text-sm text-subtext italic">Wird geladen…</p>
        )}
        {state.kind === 'error' && (
          <p className="text-sm text-error">
            Fehler beim Laden des Normtexts: {state.message}
          </p>
        )}
        {state.kind === 'loaded' && !state.result.found && (
          <NotFoundView
            reason={state.result.reason}
            clauseReference={clauseReference}
            standardCode={standardCode}
          />
        )}
        {state.kind === 'loaded' && state.result.found && state.result.markdown && (
          <NormMarkdown markdown={state.result.markdown} />
        )}
        {state.kind === 'loaded' && state.result.found && state.result.sourceFile && (
          <footer className="mt-8 pt-4 border-t border-hairline text-[10px] uppercase tracking-[0.18em] text-subtext break-words">
            Quelle: data/norm-text/{state.result.sourceFile}
          </footer>
        )}
      </div>
    </>
  );
}

function NotFoundView({
  reason,
  clauseReference,
  standardCode,
}: {
  reason?: 'unknown_standard' | 'clause_not_found' | 'source_missing';
  clauseReference: string;
  standardCode: string;
}) {
  // Source-faithful: we never guess. Surface a clear reason so the engineer
  // knows whether the issue is a missing data file (operations) vs a clauseRef
  // that does not exist in the standard (data quality).
  const label = clauseReference;
  switch (reason) {
    case 'unknown_standard':
      return (
        <p className="text-sm text-subtext">
          Für die Norm <span className="font-mono">{standardCode}</span> ist
          derzeit kein Normtext im Reader hinterlegt.
        </p>
      );
    case 'source_missing':
      return (
        <p className="text-sm text-subtext">
          Die Quelldatei für <span className="font-mono">{standardCode}</span>{' '}
          fehlt auf diesem Deployment.
        </p>
      );
    case 'clause_not_found':
    default:
      return (
        <p className="text-sm text-subtext">
          Die Klausel <span className="font-mono">{label}</span> wurde in{' '}
          <span className="font-mono">{standardCode}</span> nicht exakt
          gefunden. Tabellen- und Bild-Verweise (z. B. <em>Tab. 2</em>,{' '}
          <em>Bild 7</em>) sowie zusammengesetzte Verweise sind nicht direkt
          verlinkbar — bitte die Quelle manuell prüfen.
        </p>
      );
  }
}

/**
 * Renders the section body as markdown. Math blocks (`$$ … $$`) are passed
 * through verbatim by react-markdown's default code/text rendering, which is
 * what we want — the reader pane shows the source-faithful text, not a
 * KaTeX-rendered version. If formula rendering becomes desirable later, that
 * goes through `remark-math` + `rehype-katex`; calling that out as a separate
 * concern keeps this PR scoped to "show me the text".
 */
function NormMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="norm-text prose prose-sm max-w-none text-sm text-ink leading-relaxed space-y-3 break-words">
      <ReactMarkdown
        components={{
          // Tables in the LaTeX source come through as raw `\begin{tabular}`
          // blocks; default markdown rendering would mangle them. We surface
          // both LaTeX `\section*{Foo}` glossary blocks and `\begin{tabular}`
          // / `\begin{equation*}` blocks as preformatted text so the engineer
          // sees the literal source.
          p: ({ children, ...props }) => (
            <p {...props} className="text-sm text-ink leading-relaxed break-words">
              {children}
            </p>
          ),
          // Wide preformatted blocks (LaTeX tabular / equation source) scroll
          // horizontally inside the pane instead of forcing page overflow.
          pre: ({ children, ...props }) => (
            <pre {...props} className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
              {children}
            </pre>
          ),
          code: ({ children, ...props }) => (
            <code {...props} className="font-mono text-xs bg-paper-2 px-1 py-0.5 rounded break-words">
              {children}
            </code>
          ),
          h1: ({ children, ...props }) => (
            <h3 {...props} className="text-base font-semibold text-ink mt-4">
              {children}
            </h3>
          ),
          h2: ({ children, ...props }) => (
            <h3 {...props} className="text-base font-semibold text-ink mt-4">
              {children}
            </h3>
          ),
          h3: ({ children, ...props }) => (
            <h4 {...props} className="text-sm font-semibold text-ink mt-3">
              {children}
            </h4>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
