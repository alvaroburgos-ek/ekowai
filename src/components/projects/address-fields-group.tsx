'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { searchPhoton, photonLabel, resolveFromPhoton, type PhotonFeature } from '@/lib/site-profile/photon';
import { siteProfileFieldName, readSiteProfileValue } from '@/lib/site-profile/form-helpers';
import { SITE_PROFILE_BY_SYMBOL } from '@/lib/site-profile/symbol-map';

type State = {
  address: string;
  municipality: string;
  bundesland: string;
  lat: string;
  lon: string;
};

const DEBOUNCE_MS = 280;

/**
 * Address-autocomplete client island for the project's site profile.
 *
 * Replaces the five individual `site_address` / `site_municipality` /
 * `site_bundesland` / `site_lat` / `site_lon` inputs with one Photon-powered
 * search box on top, plus the five fields rendered below as controlled
 * inputs. Selecting a suggestion fills all five atomically; manual edits
 * stay possible (industrial sites without proper street addresses,
 * boundary corrections, …).
 *
 * The five inputs keep their original `name="site_profile.<key>"`, so
 * `readSiteProfileFromFormData` on the server picks them up unchanged.
 */
export function AddressFieldsGroup({ initial }: { initial?: unknown }) {
  const [state, setState] = useState<State>(() => ({
    address: readSiteProfileValue(initial, 'site_address'),
    municipality: readSiteProfileValue(initial, 'site_municipality'),
    bundesland: readSiteProfileValue(initial, 'site_bundesland'),
    lat: readSiteProfileValue(initial, 'site_lat'),
    lon: readSiteProfileValue(initial, 'site_lon'),
  }));

  const [query, setQuery] = useState(state.address);
  const [results, setResults] = useState<PhotonFeature[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const abortRef = useRef<AbortController | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Debounced fetch on query change. Cancels in-flight requests.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3 || trimmed === state.address) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      searchPhoton(trimmed, ctrl.signal)
        .then((features) => {
          setResults(features);
          setOpen(features.length > 0);
          setActiveIdx(features.length > 0 ? 0 : -1);
        })
        .catch((e) => {
          if ((e as { name?: string }).name === 'AbortError') return;
          setResults([]);
          setOpen(false);
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, state.address]);

  // Close dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function applyFeature(f: PhotonFeature) {
    const r = resolveFromPhoton(f);
    setState({
      address: r.address,
      municipality: r.municipality,
      bundesland: r.bundesland,
      lat: r.lat.toFixed(6),
      lon: r.lon.toFixed(6),
    });
    setQuery(r.address);
    setOpen(false);
    setResults([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const f = results[activeIdx >= 0 ? activeIdx : 0];
      if (f) applyFeature(f);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Autocomplete */}
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-[11px] uppercase tracking-[0.22em] text-subtext"
        >
          Adresse suchen
        </label>
        <div ref={wrapperRef} className="relative">
          <Input
            id={inputId}
            type="text"
            autoComplete="off"
            placeholder="z.B. Hauptstraße 5, Köln"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              open && activeIdx >= 0 ? `${inputId}-opt-${activeIdx}` : undefined
            }
          />
          {open && results.length > 0 && (
            <ul
              id={listboxId}
              role="listbox"
              className="absolute z-10 left-0 right-0 mt-1 rounded-md border border-hairline-strong bg-paper shadow-lg max-h-72 overflow-auto"
            >
              {results.map((f, i) => {
                const { primary, secondary } = photonLabel(f);
                const active = i === activeIdx;
                return (
                  <li
                    key={`${f.properties.osm_type}-${f.properties.osm_id}-${i}`}
                    id={`${inputId}-opt-${i}`}
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setActiveIdx(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyFeature(f);
                    }}
                    className={`px-3 py-2 cursor-pointer text-sm ${active ? 'bg-paper-2' : 'hover:bg-paper-2/60'}`}
                  >
                    <div className="text-ink">{primary}</div>
                    {secondary && <div className="text-[11px] text-subtext">{secondary}</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="text-[10px] text-subtext flex justify-between">
          <span>
            {loading
              ? 'Suche …'
              : 'Auswahl füllt Adresse, Gemeinde, Bundesland und Geo-Koordinaten automatisch.'}
          </span>
          <a
            href="https://photon.komoot.io"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
          >
            Powered by Photon / OpenStreetMap
          </a>
        </div>
      </div>

      {/* The five derived fields — controlled, manually editable. */}
      <ControlledField symbol="site_address" value={state.address}
        onChange={(v) => setState((s) => ({ ...s, address: v }))} />
      <ControlledField symbol="site_municipality" value={state.municipality}
        onChange={(v) => setState((s) => ({ ...s, municipality: v }))} />
      <ControlledField symbol="site_bundesland" value={state.bundesland}
        onChange={(v) => setState((s) => ({ ...s, bundesland: v }))} />
      <ControlledField symbol="site_lat" value={state.lat}
        onChange={(v) => setState((s) => ({ ...s, lat: v }))} />
      <ControlledField symbol="site_lon" value={state.lon}
        onChange={(v) => setState((s) => ({ ...s, lon: v }))} />
    </div>
  );
}

function ControlledField({
  symbol,
  value,
  onChange,
}: {
  symbol: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const entry = SITE_PROFILE_BY_SYMBOL.get(symbol);
  if (!entry) return null;
  return (
    <label className="grid grid-cols-12 gap-4 items-baseline rounded-md px-3 py-2 -mx-3 has-[:focus-within]:bg-paper-2/50 transition-colors">
      <span className="col-span-3 text-[10px] uppercase tracking-[0.2em] text-subtext">
        {entry.labelDe}
        {entry.unit && <span className="ml-1 text-ink-2 normal-case tracking-normal">({entry.unit})</span>}
      </span>
      <span className="col-span-9 space-y-1">
        <Input
          name={siteProfileFieldName(entry)}
          type={entry.type === 'number' ? 'number' : 'text'}
          inputMode={entry.type === 'number' ? 'decimal' : undefined}
          step={entry.type === 'number' ? 'any' : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {entry.hintDe && <span className="block text-[11px] text-subtext">{entry.hintDe}</span>}
      </span>
    </label>
  );
}
