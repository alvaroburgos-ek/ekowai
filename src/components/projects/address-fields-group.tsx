'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { searchPhoton, photonLabel, resolveFromPhoton, type PhotonFeature } from '@/lib/site-profile/photon';
import { siteProfileFieldName, readSiteProfileValue } from '@/lib/site-profile/form-helpers';
import { SITE_PROFILE_BY_SYMBOL } from '@/lib/site-profile/symbol-map';
import { latLonStringsToKostraCell } from '@/lib/site-profile/kostra';

type State = {
  address: string;
  municipality: string;
  bundesland: string;
  lat: string;
  lon: string;
  kostra: string;
  /**
   * The last KOSTRA value the auto-lookup wrote into `kostra`. When `kostra`
   * still matches this string the user hasn't manually changed it, so a fresh
   * lat/lon is allowed to re-derive and overwrite it. When the user types
   * something else they "own" the field and the auto-lookup stops touching it.
   */
  kostraAuto: string;
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
 * In addition the lat/lon are mapped to a `kostra_grid_cell` via the
 * KOSTRA-DWD-2020 grid (see `src/lib/site-profile/kostra.ts`). The KOSTRA
 * field renders as a sixth controlled input that the engineer can override.
 *
 * The six inputs keep their original `name="site_profile.<key>"`, so
 * `readSiteProfileFromFormData` on the server picks them up unchanged.
 */
export function AddressFieldsGroup({ initial }: { initial?: unknown }) {
  const [state, setState] = useState<State>(() => {
    const lat = readSiteProfileValue(initial, 'site_lat');
    const lon = readSiteProfileValue(initial, 'site_lon');
    const savedKostra = readSiteProfileValue(initial, 'kostra_grid_cell');
    // Initial mount: if lat/lon are present but kostra_grid_cell is empty,
    // auto-fill it. If a value is already saved we leave it alone (engineer
    // override survives). This makes the lookup idempotent across reloads.
    let kostra = savedKostra;
    let kostraAuto = savedKostra;
    if (!savedKostra && lat && lon) {
      const r = latLonStringsToKostraCell(lat, lon);
      if (r) {
        kostra = r.cellId;
        kostraAuto = r.cellId;
      }
    }
    return {
      address: readSiteProfileValue(initial, 'site_address'),
      municipality: readSiteProfileValue(initial, 'site_municipality'),
      bundesland: readSiteProfileValue(initial, 'site_bundesland'),
      lat,
      lon,
      kostra,
      kostraAuto,
    };
  });

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

  /**
   * Apply a Photon suggestion to all six fields atomically. Lat/lon come from
   * the Photon geometry; the KOSTRA cell is computed from those lat/lon. If
   * the lookup returns null (outside the 15 989-cell BELEG mask — e.g. point
   * in Switzerland) we clear the auto-filled value and show the inline hint;
   * a previous engineer-typed value is preserved (the user "owns" the field).
   */
  function applyFeature(f: PhotonFeature) {
    const r = resolveFromPhoton(f);
    const latStr = r.lat.toFixed(6);
    const lonStr = r.lon.toFixed(6);
    setState((s) => {
      const userOwned = s.kostra !== '' && s.kostra !== s.kostraAuto;
      const lookup = latLonStringsToKostraCell(latStr, lonStr);
      const nextKostra = userOwned ? s.kostra : (lookup?.cellId ?? '');
      const nextKostraAuto = userOwned ? s.kostraAuto : (lookup?.cellId ?? '');
      return {
        address: r.address,
        municipality: r.municipality,
        bundesland: r.bundesland,
        lat: latStr,
        lon: lonStr,
        kostra: nextKostra,
        kostraAuto: nextKostraAuto,
      };
    });
    setQuery(r.address);
    setOpen(false);
    setResults([]);
  }

  /**
   * Manual lat/lon edits also trigger the KOSTRA auto-lookup, but ONLY if the
   * current KOSTRA value is still the auto-filled one (or empty). When the
   * user typed something custom into the KOSTRA box we leave it alone.
   */
  function setLat(v: string) {
    setState((s) => recomputeKostra({ ...s, lat: v }));
  }
  function setLon(v: string) {
    setState((s) => recomputeKostra({ ...s, lon: v }));
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

  // Did the auto-lookup decide the point is outside KOSTRA coverage? We show
  // an inline hint in that case so the engineer types the cell ID manually
  // rather than getting silently wrong r_D(n) downstream.
  const outsideCoverage =
    state.lat !== '' &&
    state.lon !== '' &&
    state.kostra === '' &&
    latLonStringsToKostraCell(state.lat, state.lon) === null;

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
              : 'Auswahl füllt Adresse, Gemeinde, Bundesland, Geo-Koordinaten und KOSTRA-Rasterzelle automatisch.'}
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

      {/* The six derived fields — controlled, manually editable. */}
      <ControlledField symbol="site_address" value={state.address}
        onChange={(v) => setState((s) => ({ ...s, address: v }))} />
      <ControlledField symbol="site_municipality" value={state.municipality}
        onChange={(v) => setState((s) => ({ ...s, municipality: v }))} />
      <ControlledField symbol="site_bundesland" value={state.bundesland}
        onChange={(v) => setState((s) => ({ ...s, bundesland: v }))} />
      <ControlledField symbol="site_lat" value={state.lat} onChange={setLat} />
      <ControlledField symbol="site_lon" value={state.lon} onChange={setLon} />
      <ControlledField
        symbol="kostra_grid_cell"
        value={state.kostra}
        onChange={(v) =>
          setState((s) => ({ ...s, kostra: v }))
        }
        extraHint={
          outsideCoverage
            ? 'Außerhalb der KOSTRA-Abdeckung — manuell eintragen.'
            : undefined
        }
      />
    </div>
  );
}

/**
 * Update `kostra` to track a new lat/lon. Only overwrites the kostra field
 * when it is empty or still equal to the last auto-filled value — i.e. the
 * user has not manually overridden it. When the lookup returns null
 * (outside coverage) we clear the auto value so the inline hint shows.
 */
function recomputeKostra(s: State): State {
  const userOwned = s.kostra !== '' && s.kostra !== s.kostraAuto;
  if (userOwned) return s;
  const r = latLonStringsToKostraCell(s.lat, s.lon);
  const next = r?.cellId ?? '';
  return { ...s, kostra: next, kostraAuto: next };
}

function ControlledField({
  symbol,
  value,
  onChange,
  extraHint,
}: {
  symbol: string;
  value: string;
  onChange: (v: string) => void;
  extraHint?: string;
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
        {extraHint && (
          <span className="block text-[11px] text-warning">{extraHint}</span>
        )}
      </span>
    </label>
  );
}
