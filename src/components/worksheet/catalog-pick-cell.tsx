'use client';

/**
 * `catalog_pick` register cell (2026-10-05): a text input over the register's own cell PLUS an autocomplete over
 * GET /api/plant-catalog (the non-normative plant reference catalogue).
 *
 * Invariants (brief, binding):
 * - The cell IS the register's text cell: typing writes the text as before; picking a suggestion writes the hit's
 *   scientific name — nothing else. No other column of the row is ever written from here.
 * - A pick may PROPOSE a § 10.4.3 group (`proposeGroupKey`) — rendered as text next to the cell, never stored.
 * - Context (zone depth / group / pond type) comes from the worksheet via `context`; the pond type is display only.
 * - Every list / detail is labelled "Referenz (nicht normativ)". An aggressive hit shows a red badge.
 * - Catalogue unavailable (migration not applied → 503) or network failure: a quiet notice; the cell keeps working as
 *   a plain text input — the catalogue is a convenience layer, never a dependency.
 */
import { useEffect, useId, useRef, useState } from 'react';
import type { CatalogHit } from '@/lib/plant-catalog/filter';
import { aggressiveBadge, buildCatalogUrl, contextLine, hitProperties, proposeGroupKey, S10_4_3_LABELS, type CatalogPickContext } from '@/lib/plant-catalog/picker';

export type CatalogPickCellProps = {
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
  ariaLabel: string;
  placeholder?: string;
  className: string;
  context: CatalogPickContext;
  /** Label of the row column the proposal refers to (FLLNT-12 "Pflanzengruppe (§10.4.3)"); undefined ⇒ no proposal line. */
  proposeForLabel?: string;
  /** Test seam / custom fetch; defaults to window.fetch. */
  fetcher?: (url: string) => Promise<Response>;
  debounceMs?: number;
};

type ListState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; hits: CatalogHit[]; total: number }
  | { kind: 'unavailable'; message: string };

export function CatalogPickCell({ value, onChange, readOnly, ariaLabel, placeholder, className, context, proposeForLabel, fetcher, debounceMs = 200 }: CatalogPickCellProps) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<ListState>({ kind: 'idle' });
  const [highlight, setHighlight] = useState(0);
  const [proposal, setProposal] = useState<{ species: string; key: string } | null>(null);
  const listId = useId();
  const seq = useRef(0);
  const ctxKey = `${context.group ?? ''}|${context.maxDepthCm ?? ''}`;

  useEffect(() => {
    if (!open || readOnly) return;
    const my = ++seq.current;
    const t = setTimeout(async () => {
      setList({ kind: 'loading' });
      try {
        const doFetch = fetcher ?? ((u: string) => fetch(u, { credentials: 'same-origin' }));
        const res = await doFetch(buildCatalogUrl(value, context));
        if (my !== seq.current) return;
        if (res.status === 503) { setList({ kind: 'unavailable', message: 'Referenzkatalog noch nicht eingerichtet.' }); return; }
        if (res.status === 401) { setList({ kind: 'unavailable', message: 'Referenzkatalog: nicht angemeldet.' }); return; }
        if (!res.ok) { setList({ kind: 'unavailable', message: `Referenzkatalog nicht erreichbar (${res.status}).` }); return; }
        const body = (await res.json()) as { rows: CatalogHit[]; total: number };
        setList({ kind: 'ready', hits: body.rows ?? [], total: body.total ?? 0 });
        setHighlight(0);
      } catch {
        if (my === seq.current) setList({ kind: 'unavailable', message: 'Referenzkatalog nicht erreichbar.' });
      }
    }, debounceMs);
    return () => clearTimeout(t);
    // ctxKey stands in for the context object (rebuilt per render by the editor).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value, ctxKey, readOnly, debounceMs]);

  const hits = list.kind === 'ready' ? list.hits : [];
  const current = hits[highlight];

  function pick(h: CatalogHit) {
    onChange(h.scientific_name);
    const key = proposeForLabel ? proposeGroupKey(h) : null;
    setProposal(key ? { species: h.scientific_name, key } : null);
    setOpen(false);
  }
  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) { if (e.key === 'ArrowDown') setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((i) => Math.min(i + 1, Math.max(hits.length - 1, 0))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && current) { e.preventDefault(); pick(current); }
    else if (e.key === 'Escape') setOpen(false);
  }

  const ctxLine = contextLine(context);
  const showProposal = proposal && proposal.species === value;

  return (
    <div className="relative" data-testid="catalog-pick">
      <input
        type="text"
        value={value}
        disabled={readOnly}
        aria-label={ariaLabel}
        placeholder={placeholder ?? 'Art eingeben oder aus Referenz wählen'}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        title={value !== '' ? value : undefined}
        onChange={(e) => { onChange(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKey}
        className={className}
      />
      {showProposal && (
        <div data-testid="catalog-proposal" className="text-[10px] text-accent mt-1">
          Vorschlag {proposeForLabel}: {S10_4_3_LABELS[proposal.key] ?? proposal.key} — nicht übernommen, bitte selbst wählen
        </div>
      )}
      {open && !readOnly && (
        <div
          id={listId}
          role="listbox"
          data-testid="catalog-pick-list"
          className="absolute left-0 top-full z-10 mt-1 w-[26rem] max-w-[90vw] rounded border border-hairline-strong bg-paper shadow-lg text-xs"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="px-2 pt-1.5 text-[10px] uppercase tracking-[0.18em] text-subtext">Referenz (nicht normativ)</div>
          {ctxLine && <div data-testid="catalog-context" className="px-2 text-[10px] text-subtext">{ctxLine}</div>}
          {list.kind === 'loading' && <div className="px-2 py-2 text-subtext">Suche …</div>}
          {list.kind === 'unavailable' && <div data-testid="catalog-unavailable" className="px-2 py-2 text-warning">{list.message} Freitext bleibt möglich.</div>}
          {list.kind === 'ready' && hits.length === 0 && <div className="px-2 py-2 text-subtext">Kein Referenzeintrag — Freitext bleibt möglich.</div>}
          {list.kind === 'ready' && hits.length > 0 && (
            <div className="flex">
              <ul className="w-1/2 max-h-56 overflow-y-auto border-r border-hairline">
                {hits.map((h, i) => {
                  const badge = aggressiveBadge(h);
                  return (
                    <li
                      key={h.id}
                      role="option"
                      aria-selected={i === highlight}
                      data-testid="catalog-option"
                      className={`px-2 py-1 cursor-pointer ${i === highlight ? 'bg-accent-soft' : 'hover:bg-paper-2'}`}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => pick(h)}
                    >
                      <div className="text-ink italic">{h.scientific_name}</div>
                      {(h.common_name_de || h.common_name_en) && <div className="text-[10px] text-subtext">{h.common_name_de ?? h.common_name_en}</div>}
                      {badge && <div data-testid="catalog-aggressive" className="text-[10px] font-medium text-error">⚠ {badge}</div>}
                    </li>
                  );
                })}
                {list.total > hits.length && <li className="px-2 py-1 text-[10px] text-subtext">… {list.total - hits.length} weitere — Suchbegriff eingrenzen</li>}
              </ul>
              <div className="w-1/2 max-h-56 overflow-y-auto px-2 py-1" data-testid="catalog-detail">
                {current && (
                  <>
                    <div className="text-ink italic font-medium">{current.scientific_name}</div>
                    {aggressiveBadge(current) && <div className="text-[10px] font-medium text-error">⚠ {aggressiveBadge(current)}</div>}
                    <dl className="mt-1 space-y-0.5">
                      {hitProperties(current).map(([k, v]) => (
                        <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-1">
                          <dt className="text-[10px] uppercase tracking-[0.12em] text-subtext">{k}</dt>
                          <dd className="text-ink break-words">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-1 text-[10px] text-subtext">{current.recommended}</div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
