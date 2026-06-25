# A138-07 Tab. 9 Foundation (Plan 1 of 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace A138-07's free-typed surface coefficients with a Tabelle 9 picker, backed by a single accessor module and a migrating normalizer — pure client + pure functions, no DB/engine changes.

**Architecture:** A new `tab9.ts` constant module (behind `getTab9Entries()`/`lookupTab9()`) is the only source of Tab. 9 values. A new `surface-inventory.ts` defines the `SurfaceRow` shape and `normalizeSurfaceCarrier()` (lazy migration of old rows). The existing `SurfaceInventoryEditor` is rewritten to drive C_i/C_s from the picker (read-only unless an audited override), derive `kind`, and show the A_E,b,a/A_E,nb,a footer. Plans 2 & 3 (engine/DB/cross-worksheet) build on these.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Zustand store, Vitest 4 + React Testing Library + happy-dom, Tailwind v4.

## Global Constraints

- Package manager: **pnpm**. Run a single unit test file with `pnpm test <path>` (the `test` script is `vitest run --project unit`).
- UI strings are **German**; keep them German.
- TypeScript **strict** — no `any` leaks; exported functions are fully typed.
- Tab. 9 values are referenced **only** through `getTab9Entries()`/`lookupTab9()` — never import the raw array, never free-type a coefficient.
- `kind`, the original Tab. 9 pair, `mismatch`, and row `complete` are **derived, never stored**.
- The override edits `c_i`/`c_s` **only** — it never changes `tab9_value` or the derived `kind`.
- Do **not** change the verified `A_C = Σ(A_E,i · C_i)` math.
- Git identity for commits: Alvaro `<alvaro.burgos@ekowai.com>` (repo default). All commits on branch `feat/a138-07-surface-singlesource`.

---

### Task 1: Tab. 9 accessor module

**Files:**
- Create: `src/lib/eval/tab9.ts`
- Test: `src/lib/eval/__tests__/tab9.test.ts`

**Interfaces:**
- Produces:
  - `type Tab9Entry = { value: string; label: string; cm: number; cs: number; kind: 'paved' | 'unpaved'; group: 1 | 2 | 3; standard: 'DWA-A 138-1'; edition: '2024-10' }`
  - `getTab9Entries(): readonly Tab9Entry[]`
  - `lookupTab9(value: string): Tab9Entry | undefined`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/eval/__tests__/tab9.test.ts
import { describe, it, expect } from 'vitest';
import { getTab9Entries, lookupTab9, type Tab9Entry } from '../tab9';

describe('tab9 accessor', () => {
  it('exposes exactly 30 entries, each tagged with standard + edition', () => {
    const all = getTab9Entries();
    expect(all).toHaveLength(30);
    for (const e of all) {
      expect(e.standard).toBe('DWA-A 138-1');
      expect(e.edition).toBe('2024-10');
      expect(e.cm).toBeGreaterThanOrEqual(0);
      expect(e.cm).toBeLessThanOrEqual(1);
      expect(e.cs).toBeGreaterThanOrEqual(0);
      expect(e.cs).toBeLessThanOrEqual(1);
    }
  });

  it('derives kind from group: groups 1 & 2 are paved, group 3 is unpaved', () => {
    for (const e of getTab9Entries()) {
      const expected = e.group === 3 ? 'unpaved' : 'paved';
      expect(e.kind).toBe(expected);
    }
  });

  it('has unique values (keys)', () => {
    const values = getTab9Entries().map((e) => e.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it('lookupTab9 returns the matching entry and undefined for unknown keys', () => {
    const asphalt = lookupTab9('schwarzdecke_asphalt');
    expect(asphalt).toMatchObject({ cm: 0.9, cs: 1.0, kind: 'paved', group: 1 });
    const park = lookupTab9('park_flach');
    expect(park).toMatchObject({ cm: 0.1, cs: 0.2, kind: 'unpaved', group: 3 });
    expect(lookupTab9('does_not_exist')).toBeUndefined();
  });

  it('contains the migration anchor keys used by the normalizer', () => {
    expect(lookupTab9('schwarzdecke_asphalt')).toBeDefined();
    expect(lookupTab9('park_flach')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/eval/__tests__/tab9.test.ts`
Expected: FAIL — cannot find module `../tab9`.

- [ ] **Step 3: Write the module**

```ts
// src/lib/eval/tab9.ts
/**
 * DWA-A 138-1 (Oktober 2024) Tabelle 9 — Abflussbeiwerte je Oberflächentyp.
 *
 * Single source for Tab. 9 reference data. Consumers MUST use getTab9Entries()
 * / lookupTab9() — never import TAB9 directly. Each entry is tagged with
 * standard + edition so a future `regulation_tables` DB table can replace the
 * accessor body without moving any caller.
 *
 * cm = C_m (= C_i, design-event runoff coefficient, used by Gl. 2 → A_C).
 * cs = C_s (flood-event runoff coefficient, used by Gl. 10).
 * Group 1 (wasserundurchlässig) & 2 (teildurchlässig) ⇒ paved;
 * Group 3 (durchlässig) ⇒ unpaved.
 */
export type Tab9Entry = {
  value: string;
  label: string;
  cm: number;
  cs: number;
  kind: 'paved' | 'unpaved';
  group: 1 | 2 | 3;
  standard: 'DWA-A 138-1';
  edition: '2024-10';
};

type Raw = Omit<Tab9Entry, 'kind' | 'standard' | 'edition'>;

const GROUP_1: ReadonlyArray<Raw> = [
  { value: 'dach_schraeg_metall', label: 'Dach Schrägdach – Metall/Glas/Schiefer/Faserzement', cm: 0.9, cs: 1.0, group: 1 },
  { value: 'dach_schraeg_ziegel', label: 'Dach Schrägdach – Ziegel/Abdichtungsbahnen', cm: 0.9, cs: 1.0, group: 1 },
  { value: 'dach_flach_metall', label: 'Dach Flachdach ≤3° – Metall/Glas/Faserzement', cm: 0.9, cs: 1.0, group: 1 },
  { value: 'dach_flach_abdichtung', label: 'Dach Flachdach ≤3° – Abdichtungsbahnen', cm: 0.9, cs: 1.0, group: 1 },
  { value: 'dach_flach_kies', label: 'Dach Flachdach ≤3° – Kiesschüttung', cm: 0.8, cs: 0.8, group: 1 },
  { value: 'gruendach_extensiv_steil', label: 'Gründach – Extensivbegrünung >5°', cm: 0.4, cs: 0.7, group: 1 },
  { value: 'gruendach_intensiv', label: 'Gründach – Intensivbegrünung ≥30cm ≤5°', cm: 0.1, cs: 0.2, group: 1 },
  { value: 'gruendach_extensiv_10', label: 'Gründach – Extensivbegrünung ≥10cm ≤5°', cm: 0.2, cs: 0.4, group: 1 },
  { value: 'gruendach_extensiv_unter10', label: 'Gründach – Extensivbegrünung <10cm', cm: 0.3, cs: 0.5, group: 1 },
  { value: 'beton', label: 'Betonflächen', cm: 0.9, cs: 1.0, group: 1 },
  { value: 'schwarzdecke_asphalt', label: 'Schwarzdecken (Asphalt)', cm: 0.9, cs: 1.0, group: 1 },
  { value: 'pflaster_fugenverguss', label: 'Pflaster mit Fugenverguss / Fugendichtung', cm: 0.8, cs: 1.0, group: 1 },
  { value: 'gleis_feste_fahrbahn', label: 'Oberirdische Gleisanlage, feste Fahrbahn', cm: 0.9, cs: 1.0, group: 1 },
  { value: 'rampe_zum_gebaeude', label: 'Rampen mit Neigung zum Gebäude', cm: 1.0, cs: 1.0, group: 1 },
  { value: 'kunststoff_sportplatz', label: 'Kunststoffflächen von Sportplätzen', cm: 0.5, cs: 1.0, group: 1 },
];

const GROUP_2: ReadonlyArray<Raw> = [
  { value: 'betonsteinpflaster_sand', label: 'Betonsteinpflaster in Sand/Schlacke, Platten', cm: 0.7, cs: 0.9, group: 2 },
  { value: 'pflaster_fuge_15', label: 'Pflaster Fugenanteil >15% / fester Kiesbelag', cm: 0.6, cs: 0.7, group: 2 },
  { value: 'wassergebunden', label: 'Wassergebundene Flächen', cm: 0.7, cs: 0.9, group: 2 },
  { value: 'kiesbelag_locker', label: 'Lockerer Kiesbelag, Schotterrasen', cm: 0.2, cs: 0.3, group: 2 },
  { value: 'verbundstein_sickerfuge', label: 'Verbundsteine mit Sickerfugen, Sicker-/Dränsteine', cm: 0.25, cs: 0.4, group: 2 },
  { value: 'rasengitter_verkehr', label: 'Rasengittersteine mit häufiger Verkehrsbelastung', cm: 0.2, cs: 0.4, group: 2 },
  { value: 'rasengitter_ohne_verkehr', label: 'Rasengittersteine ohne häufige Verkehrsbelastung', cm: 0.1, cs: 0.2, group: 2 },
  { value: 'gleis_schotter_durchlaessig', label: 'Gleisanlage Schotterbau, durchlässiger Unterbau', cm: 0.1, cs: 0.2, group: 2 },
  { value: 'gleis_schotter_schwach', label: 'Gleisanlage Schotterbau, schwach durchl. Unterbau', cm: 0.4, cs: 0.6, group: 2 },
  { value: 'sport_draen_kunststoff', label: 'Sportfläche Dränung – Kunststoff/Kunststoffrasen', cm: 0.1, cs: 0.1, group: 2 },
  { value: 'sport_draen_tenne', label: 'Sportfläche Dränung – Tenne (Hart/Asche/Schlacke)', cm: 0.3, cs: 0.3, group: 2 },
  { value: 'sport_draen_rasen', label: 'Sportfläche Dränung – Rasenfläche', cm: 0.1, cs: 0.1, group: 2 },
];

const GROUP_3: ReadonlyArray<Raw> = [
  { value: 'park_flach', label: 'Parkanlagen/Rasen/Gärten – flaches Gelände', cm: 0.1, cs: 0.2, group: 3 },
  { value: 'park_steil', label: 'Parkanlagen/Rasen/Gärten – steiles Gelände', cm: 0.2, cs: 0.3, group: 3 },
  { value: 'wasserflaeche_eingestaut', label: 'Dauerhaft eingestaute Wasserflächen', cm: 1.0, cs: 1.0, group: 3 },
];

const TAB9: ReadonlyArray<Tab9Entry> = [...GROUP_1, ...GROUP_2, ...GROUP_3].map((r) => ({
  ...r,
  kind: r.group === 3 ? 'unpaved' : 'paved',
  standard: 'DWA-A 138-1',
  edition: '2024-10',
}));

const BY_VALUE: ReadonlyMap<string, Tab9Entry> = new Map(TAB9.map((e) => [e.value, e]));

export function getTab9Entries(): readonly Tab9Entry[] {
  return TAB9;
}

export function lookupTab9(value: string): Tab9Entry | undefined {
  return BY_VALUE.get(value);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/eval/__tests__/tab9.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/eval/tab9.ts src/lib/eval/__tests__/tab9.test.ts
git commit -m "feat(138): Tab. 9 runoff-coefficient accessor module"
```

---

### Task 2: Surface row shape + migrating normalizer

**Files:**
- Create: `src/lib/eval/surface-inventory.ts`
- Test: `src/lib/eval/__tests__/surface-inventory.test.ts`

**Interfaces:**
- Consumes: `lookupTab9`, `getTab9Entries`, `Tab9Entry` from `./tab9` (Task 1).
- Produces:
  - `type SurfaceRow = { id: string; label: string; tab9_value: string | null; area_m2: number | null; c_i: number | null; c_s: number | null; coeff_override: boolean }`
  - `type SurfaceInventoryCarrier = { rows: SurfaceRow[] }`
  - `normalizeSurfaceCarrier(value: unknown): SurfaceInventoryCarrier`
  - `rowKind(row: SurfaceRow): 'paved' | 'unpaved' | null`
  - `rowComplete(row: SurfaceRow): boolean`
  - `rowMismatch(row: SurfaceRow): boolean`
  - `newSurfaceRow(): SurfaceRow`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/eval/__tests__/surface-inventory.test.ts
import { describe, it, expect } from 'vitest';
import {
  normalizeSurfaceCarrier,
  rowKind,
  rowComplete,
  rowMismatch,
  type SurfaceRow,
} from '../surface-inventory';

const byLabel = (rows: SurfaceRow[], label: string) =>
  rows.find((r) => r.label === label)!;

describe('normalizeSurfaceCarrier — migration', () => {
  it('maps old asphalt → schwarzdecke_asphalt, clean and complete (c_i preserved)', () => {
    const { rows } = normalizeSurfaceCarrier({
      rows: [{ id: 'a', label: 'Parkplatz', surface_type: 'asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0 }],
    });
    const r = byLabel(rows, 'Parkplatz');
    expect(r.tab9_value).toBe('schwarzdecke_asphalt');
    expect(r.c_i).toBe(0.9);
    expect(r.c_s).toBe(1.0);
    expect(r.coeff_override).toBe(false);
    expect(rowComplete(r)).toBe(true);
    expect(rowKind(r)).toBe('paved');
  });

  it('maps old rasen → park_flach and backfills a null c_s from Tab. 9 (0.2)', () => {
    const { rows } = normalizeSurfaceCarrier({
      rows: [{ id: 't', label: 'Testfläche', surface_type: 'rasen', area_m2: 100, c_i: 0.1, c_s: null }],
    });
    const r = byLabel(rows, 'Testfläche');
    expect(r.tab9_value).toBe('park_flach');
    expect(r.c_i).toBe(0.1);
    expect(r.c_s).toBe(0.2);
    expect(r.coeff_override).toBe(false);
    expect(rowComplete(r)).toBe(true);
    expect(rowKind(r)).toBe('unpaved');
  });

  it('drops an unmapped/ambiguous old type (dach 0.9/1.0) to reselection, preserving c_i/c_s', () => {
    const { rows } = normalizeSurfaceCarrier({
      rows: [{ id: 'g', label: 'Gewächshausdach', surface_type: 'dach', area_m2: 3786.8, c_i: 0.9, c_s: 1.0 }],
    });
    const r = byLabel(rows, 'Gewächshausdach');
    expect(r.tab9_value).toBeNull();   // 0.9/1.0 matches >1 entry ⇒ ambiguous ⇒ no auto-map
    expect(r.c_i).toBe(0.9);            // never silently changed
    expect(r.c_s).toBe(1.0);
    expect(rowComplete(r)).toBe(false); // tab9_value null ⇒ not complete
    expect(rowKind(r)).toBeNull();
  });

  it('auto-maps an old row whose (c_i,c_s) UNIQUELY matches one entry (0.8/0.8 → dach_flach_kies)', () => {
    const { rows } = normalizeSurfaceCarrier({
      rows: [{ id: 'k', label: 'Kiesdach', surface_type: 'sonstige', area_m2: 50, c_i: 0.8, c_s: 0.8 }],
    });
    const r = byLabel(rows, 'Kiesdach');
    expect(r.tab9_value).toBe('dach_flach_kies');
    expect(r.coeff_override).toBe(false);
  });

  it('flags a mapped row whose stored c_i differs from Tab. 9 as override (keeps stored c_i)', () => {
    const { rows } = normalizeSurfaceCarrier({
      rows: [{ id: 'o', label: 'Sonder-Asphalt', surface_type: 'asphalt', area_m2: 10, c_i: 0.85, c_s: 1.0 }],
    });
    const r = byLabel(rows, 'Sonder-Asphalt');
    expect(r.tab9_value).toBe('schwarzdecke_asphalt');
    expect(r.c_i).toBe(0.85);          // stored value preserved
    expect(r.coeff_override).toBe(true);
    expect(rowMismatch(r)).toBe(true);
  });

  it('passes already-new rows through unchanged (idempotent)', () => {
    const input = {
      rows: [{ id: 'n', label: 'Neu', tab9_value: 'park_flach', area_m2: 100, c_i: 0.1, c_s: 0.2, coeff_override: false }],
    };
    const once = normalizeSurfaceCarrier(input);
    const twice = normalizeSurfaceCarrier(once);
    expect(twice).toEqual(once);
    expect(once.rows[0]).toMatchObject({ tab9_value: 'park_flach', c_i: 0.1, c_s: 0.2, coeff_override: false });
  });

  it('returns an empty carrier for junk input', () => {
    expect(normalizeSurfaceCarrier(null)).toEqual({ rows: [] });
    expect(normalizeSurfaceCarrier({ nope: 1 })).toEqual({ rows: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/eval/__tests__/surface-inventory.test.ts`
Expected: FAIL — cannot find module `../surface-inventory`.

- [ ] **Step 3: Write the module**

```ts
// src/lib/eval/surface-inventory.ts
/**
 * A138-07 surface-inventory carrier: row shape, derivations, and the
 * migrating normalizer. The normalizer is the single shared parse/migration
 * path used by BOTH the editor and (Plan 2) the engine, so they can never
 * diverge. Tab. 9 values flow only through ./tab9 accessors.
 */
import { getTab9Entries, lookupTab9 } from './tab9';

export type SurfaceRow = {
  id: string;
  label: string;
  /** Selected Tab. 9 entry key; null ⇒ engineer must (re)select. */
  tab9_value: string | null;
  area_m2: number | null;
  c_i: number | null;
  c_s: number | null;
  /** true ⇒ engineer adjusted c_i/c_s away from the Tab. 9 pair ("abweichend"). */
  coeff_override: boolean;
};

export type SurfaceInventoryCarrier = { rows: SurfaceRow[] };

/** Explicit coarse-label → Tab. 9 key map for the old surface_type values
 * that have a defined target (per the spec migration note). */
const LEGACY_LABEL_MAP: Readonly<Record<string, string>> = {
  asphalt: 'schwarzdecke_asphalt',
  rasen: 'park_flach',
};

function genId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function newSurfaceRow(): SurfaceRow {
  return { id: genId(), label: '', tab9_value: null, area_m2: null, c_i: null, c_s: null, coeff_override: false };
}

export function rowKind(row: SurfaceRow): 'paved' | 'unpaved' | null {
  if (!row.tab9_value) return null;
  return lookupTab9(row.tab9_value)?.kind ?? null;
}

export function rowComplete(row: SurfaceRow): boolean {
  return (
    row.area_m2 != null && Number.isFinite(row.area_m2) &&
    row.tab9_value != null &&
    row.c_i != null && Number.isFinite(row.c_i) &&
    row.c_s != null && Number.isFinite(row.c_s)
  );
}

export function rowMismatch(row: SurfaceRow): boolean {
  if (!row.tab9_value) return false;
  const e = lookupTab9(row.tab9_value);
  return e != null && row.c_i != null && row.c_i !== e.cm;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Find the Tab. 9 key whose (cm,cs) uniquely matches the given pair. Returns
 * null when zero or >1 entries match (ambiguous ⇒ no auto-map). */
function uniqueMatchByPair(c_i: number | null, c_s: number | null): string | null {
  if (c_i == null || c_s == null) return null;
  const hits = getTab9Entries().filter((e) => e.cm === c_i && e.cs === c_s);
  return hits.length === 1 ? hits[0].value : null;
}

function normalizeRow(raw: unknown): SurfaceRow {
  if (!raw || typeof raw !== 'object') return newSurfaceRow();
  const r = raw as Record<string, unknown>;
  const base: SurfaceRow = {
    id: typeof r.id === 'string' && r.id.length > 0 ? r.id : genId(),
    label: typeof r.label === 'string' ? r.label : '',
    tab9_value: null,
    area_m2: num(r.area_m2),
    c_i: num(r.c_i),
    c_s: num(r.c_s),
    coeff_override: false,
  };

  // Already-new shape: has a tab9_value key OR a coeff_override flag.
  if ('tab9_value' in r || 'coeff_override' in r) {
    const tab9_value = typeof r.tab9_value === 'string' && r.tab9_value.length > 0 ? r.tab9_value : null;
    const coeff_override = r.coeff_override === true;
    return { ...base, tab9_value, coeff_override };
  }

  // Legacy shape: migrate from surface_type.
  const surfaceType = typeof r.surface_type === 'string' ? r.surface_type : '';
  const mapped = LEGACY_LABEL_MAP[surfaceType] ?? uniqueMatchByPair(base.c_i, base.c_s);
  if (!mapped) {
    // Unmapped or ambiguous ⇒ reselection; preserve c_i/c_s untouched.
    return base;
  }
  const entry = lookupTab9(mapped);
  if (!entry) return base;
  const c_i = base.c_i ?? entry.cm;               // keep stored c_i; fill only if absent
  const c_s = base.c_s ?? entry.cs;               // backfill missing c_s from the pair
  const coeff_override = c_i !== entry.cm;          // stored c_i differs ⇒ audited override
  return { ...base, tab9_value: mapped, c_i, c_s, coeff_override };
}

export function normalizeSurfaceCarrier(value: unknown): SurfaceInventoryCarrier {
  if (!value || typeof value !== 'object') return { rows: [] };
  const v = value as { rows?: unknown };
  if (!Array.isArray(v.rows)) return { rows: [] };
  return { rows: v.rows.map(normalizeRow) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/eval/__tests__/surface-inventory.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/eval/surface-inventory.ts src/lib/eval/__tests__/surface-inventory.test.ts
git commit -m "feat(138): SurfaceRow shape + migrating normalizeSurfaceCarrier"
```

---

### Task 3: Rewrite SurfaceInventoryEditor as the Tab. 9 picker

**Files:**
- Modify (full rewrite): `src/components/worksheet/surface-inventory-editor.tsx`
- Test: `src/components/worksheet/__tests__/surface-inventory-editor.test.tsx`

**Interfaces:**
- Consumes: `normalizeSurfaceCarrier`, `newSurfaceRow`, `rowKind`, `rowComplete`, `rowMismatch`, `SurfaceRow`, `SurfaceInventoryCarrier` from `@/lib/eval/surface-inventory`; `getTab9Entries`, `lookupTab9` from `@/lib/eval/tab9`; `useWorksheetStore` from `@/lib/state/worksheet-store`.
- Produces: `SurfaceInventoryEditor({ fieldId }: { fieldId: string })` — unchanged prop shape, so `worksheet-form.tsx` needs no edit.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/worksheet/__tests__/surface-inventory-editor.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SurfaceInventoryEditor } from '../surface-inventory-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { normalizeSurfaceCarrier, type SurfaceInventoryCarrier } from '@/lib/eval/surface-inventory';

const FIELD_ID = 'fixture-surface-inventory';

function initStore(initial?: SurfaceInventoryCarrier) {
  act(() => {
    useWorksheetStore.getState().init(
      'fixture-instance',
      initial ? { [FIELD_ID]: { type: 'json', value: initial } } : {},
      {},
      {},
    );
  });
}

function storedCarrier(): SurfaceInventoryCarrier {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? (v.value as SurfaceInventoryCarrier) : { rows: [] };
}

beforeEach(() => initStore());

describe('SurfaceInventoryEditor — Tab. 9 picker', () => {
  it('selecting an Oberflächentyp auto-fills C_i/C_s read-only and derives kind', async () => {
    const user = userEvent.setup();
    render(<SurfaceInventoryEditor fieldId={FIELD_ID} />);
    await user.click(screen.getByRole('button', { name: '+ Zeile hinzufügen' }));

    const typeSelect = screen.getByLabelText('Oberflächentyp');
    await user.selectOptions(typeSelect, 'park_flach');

    const row = storedCarrier().rows[0];
    expect(row.tab9_value).toBe('park_flach');
    expect(row.c_i).toBe(0.1);
    expect(row.c_s).toBe(0.2);
    expect(row.coeff_override).toBe(false);

    // C_i / C_s are read-only (not editable inputs) until override.
    expect(screen.getByTestId('c_i-readonly')).toHaveTextContent('0,1');
    expect(screen.getByTestId('c_s-readonly')).toHaveTextContent('0,2');
    expect(screen.getByTestId('kind-badge')).toHaveTextContent('unbefestigt');
  });

  it('"abweichend wählen" makes C_i/C_s editable, flags override, keeps the Tab. 9 pair visible', async () => {
    const user = userEvent.setup();
    initStore(
      normalizeSurfaceCarrier({
        rows: [{ id: 'r', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false }],
      }),
    );
    render(<SurfaceInventoryEditor fieldId={FIELD_ID} />);

    await user.click(screen.getByRole('button', { name: 'abweichend wählen' }));
    const ci = screen.getByLabelText('C_i (abweichend)');
    await user.clear(ci);
    await user.type(ci, '0.75');

    const row = storedCarrier().rows[0];
    expect(row.coeff_override).toBe(true);
    expect(row.c_i).toBe(0.75);
    expect(row.tab9_value).toBe('schwarzdecke_asphalt'); // unchanged
    // Original Tab. 9 pair shown for audit.
    expect(screen.getByTestId('tab9-original')).toHaveTextContent('Tab. 9: 0,9 / 1');
  });

  it('migrates legacy rows on load: Gewächshausdach drops to reselection, others clean', () => {
    initStore();
    act(() => {
      useWorksheetStore.getState().init(
        'fixture-instance',
        {
          [FIELD_ID]: {
            type: 'json',
            value: {
              rows: [
                { id: 'g', label: 'Gewächshausdach', surface_type: 'dach', area_m2: 3786.8, c_i: 0.9, c_s: 1.0 },
                { id: 'p', label: 'Parkplatz', surface_type: 'asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0 },
              ],
            },
          },
        },
        {},
        {},
      );
    });
    render(<SurfaceInventoryEditor fieldId={FIELD_ID} />);
    // Gewächshausdach row shows the reselection badge.
    expect(screen.getByText(/Oberflächentyp neu wählen/i)).toBeInTheDocument();
    // Footer totals: A_E,b,a counts only complete paved rows (Parkplatz 1575.9);
    // Gewächshausdach is incomplete ⇒ excluded.
    expect(screen.getByTestId('total-paved')).toHaveTextContent('1.575,9');
    expect(screen.getByTestId('total-unpaved')).toHaveTextContent('0');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('1/2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/worksheet/__tests__/surface-inventory-editor.test.tsx`
Expected: FAIL — current editor has no Tab. 9 `<select>` option `park_flach`, no `c_i-readonly` testid, etc.

- [ ] **Step 3: Rewrite the editor**

```tsx
// src/components/worksheet/surface-inventory-editor.tsx
'use client';

import { useMemo } from 'react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { getTab9Entries, lookupTab9 } from '@/lib/eval/tab9';
import {
  normalizeSurfaceCarrier,
  newSurfaceRow,
  rowKind,
  rowComplete,
  rowMismatch,
  type SurfaceRow,
  type SurfaceInventoryCarrier,
} from '@/lib/eval/surface-inventory';

type Props = { fieldId: string };

const GROUP_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Wasserundurchlässige Flächen',
  2: 'Teildurchlässige Flächen',
  3: 'Durchlässige Flächen',
};

function formatNum(v: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(v);
}

export function SurfaceInventoryEditor({ fieldId }: Props) {
  const raw = useWorksheetStore((s) => s.values[fieldId]);
  const setField = useWorksheetStore((s) => s.setField);
  const carrier = useMemo<SurfaceInventoryCarrier>(
    () => normalizeSurfaceCarrier(raw?.type === 'json' ? raw.value : undefined),
    [raw],
  );

  const groups = useMemo(() => {
    const entries = getTab9Entries();
    return ([1, 2, 3] as const).map((g) => ({ g, items: entries.filter((e) => e.group === g) }));
  }, []);

  function write(rows: SurfaceRow[]) {
    setField(fieldId, { type: 'json', value: { rows } });
  }
  function addRow() {
    write([...carrier.rows, newSurfaceRow()]);
  }
  function updateRow(id: string, patch: Partial<SurfaceRow>) {
    write(carrier.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRow(id: string) {
    write(carrier.rows.filter((r) => r.id !== id));
  }
  function selectType(id: string, value: string) {
    const e = lookupTab9(value);
    if (!e) return;
    updateRow(id, { tab9_value: value, c_i: e.cm, c_s: e.cs, coeff_override: false });
  }
  function toggleOverride(id: string, on: boolean) {
    const row = carrier.rows.find((r) => r.id === id);
    if (!row) return;
    if (on) {
      updateRow(id, { coeff_override: true });
    } else {
      // Revert to the Tab. 9 pair for the selected type.
      const e = row.tab9_value ? lookupTab9(row.tab9_value) : undefined;
      updateRow(id, { coeff_override: false, c_i: e?.cm ?? null, c_s: e?.cs ?? null });
    }
  }

  const totals = useMemo(() => {
    let paved = 0;
    let unpaved = 0;
    let complete = 0;
    let A_C_preview = 0;
    for (const r of carrier.rows) {
      if (!rowComplete(r)) continue;
      complete++;
      const area = r.area_m2 as number;
      A_C_preview += area * (r.c_i as number);
      if (rowKind(r) === 'paved') paved += area;
      else unpaved += area;
    }
    return { paved, unpaved, complete, total: carrier.rows.length, A_C_preview };
  }, [carrier]);

  return (
    <div className="space-y-3" data-testid="surface-inventory-editor">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm font-medium text-ink">Flächenverzeichnis (Tab. 9)</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-0.5">
            §5.3.3.5 Gl. 2 (C_i) · §5.3.4 Gl. 10 (C_s)
          </div>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="text-xs px-3 py-1.5 rounded border border-hairline-strong hover:bg-paper-2 text-ink"
        >
          + Zeile hinzufügen
        </button>
      </div>

      {carrier.rows.length === 0 ? (
        <p className="text-xs text-subtext italic">
          Keine Flächen erfasst. Pro Oberflächentyp eine Zeile hinzufügen und den Typ aus Tab. 9 wählen — C_i und C_s werden automatisch gesetzt.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="text-[10px] uppercase tracking-[0.18em] text-subtext">
              <tr>
                <th className="text-left font-normal pb-1 pr-2">Bezeichnung</th>
                <th className="text-left font-normal pb-1 pr-2">Oberflächentyp</th>
                <th className="text-right font-normal pb-1 pr-2">A (m²)</th>
                <th className="text-right font-normal pb-1 pr-2">C_i</th>
                <th className="text-right font-normal pb-1 pr-2">C_s</th>
                <th className="text-right font-normal pb-1 pl-2">A · C_i</th>
                <th aria-hidden="true" className="w-8" />
              </tr>
            </thead>
            <tbody>
              {carrier.rows.map((r) => {
                const entry = r.tab9_value ? lookupTab9(r.tab9_value) : undefined;
                const kind = rowKind(r);
                const product = rowComplete(r) ? (r.area_m2 as number) * (r.c_i as number) : null;
                return (
                  <tr key={r.id} className="border-t border-hairline align-top">
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        value={r.label ?? ''}
                        onChange={(e) => updateRow(r.id, { label: e.target.value })}
                        placeholder="z.B. Hauptdach"
                        className="block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <select
                        aria-label="Oberflächentyp"
                        value={r.tab9_value ?? ''}
                        onChange={(e) => selectType(r.id, e.target.value)}
                        className="rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none"
                      >
                        <option value="" disabled>
                          — wählen —
                        </option>
                        {groups.map(({ g, items }) => (
                          <optgroup key={g} label={GROUP_LABEL[g]}>
                            {items.map((it) => (
                              <option key={it.value} value={it.value}>
                                {it.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      {!r.tab9_value && (
                        <div className="text-[10px] text-warning mt-1">⚠ Oberflächentyp neu wählen (Tab. 9)</div>
                      )}
                      {kind && (
                        <div data-testid="kind-badge" className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-1">
                          {kind === 'paved' ? 'befestigt' : 'unbefestigt'}
                        </div>
                      )}
                      {r.tab9_value && (
                        <button
                          type="button"
                          onClick={() => toggleOverride(r.id, !r.coeff_override)}
                          className="text-[10px] text-accent hover:underline mt-1"
                        >
                          {r.coeff_override ? 'Tab. 9 übernehmen' : 'abweichend wählen'}
                        </button>
                      )}
                      {r.coeff_override && entry && (
                        <div data-testid="tab9-original" className="text-[10px] text-subtext mt-0.5">
                          Tab. 9: {formatNum(entry.cm)} / {formatNum(entry.cs)}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        aria-label="Fläche"
                        value={r.area_m2 == null ? '' : r.area_m2}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateRow(r.id, { area_m2: v === '' ? null : Number(v) });
                        }}
                        className="block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink text-right tabular-nums focus:border-accent focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {r.coeff_override ? (
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          max="1"
                          aria-label="C_i (abweichend)"
                          value={r.c_i == null ? '' : r.c_i}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateRow(r.id, { c_i: v === '' ? null : Number(v) });
                          }}
                          className="block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink text-right tabular-nums focus:border-accent focus:outline-none"
                        />
                      ) : (
                        <span data-testid="c_i-readonly" className="font-mono text-ink">
                          {r.c_i == null ? '—' : formatNum(r.c_i)}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {r.coeff_override ? (
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          max="1"
                          aria-label="C_s (abweichend)"
                          value={r.c_s == null ? '' : r.c_s}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateRow(r.id, { c_s: v === '' ? null : Number(v) });
                          }}
                          className="block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink text-right tabular-nums focus:border-accent focus:outline-none"
                        />
                      ) : (
                        <span data-testid="c_s-readonly" className="font-mono text-ink">
                          {r.c_s == null ? '—' : formatNum(r.c_s)}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pl-2 text-right tabular-nums font-mono text-sm">
                      {product == null ? <span className="text-subtext">—</span> : formatNum(product)}
                      {rowMismatch(r) && (
                        <div className="text-[10px] text-warning">C_i weicht von Tab. 9 ab</div>
                      )}
                    </td>
                    <td className="py-1.5 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(r.id)}
                        aria-label="Zeile entfernen"
                        className="text-subtext hover:text-error text-lg leading-none px-1"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="text-[11px] text-subtext">
              <tr className="border-t border-hairline-strong">
                <td colSpan={2} className="pt-2 pr-2">
                  Σ Fläche befestigt: <span data-testid="total-paved" className="font-mono">{formatNum(totals.paved)}</span> m² ·
                  unbefestigt: <span data-testid="total-unpaved" className="font-mono">{formatNum(totals.unpaved)}</span> m²
                </td>
                <td colSpan={3} className="pt-2 text-right">
                  A_C-Vorschau (Σ A·C_i): <span className="font-mono">{formatNum(totals.A_C_preview)}</span> m²
                </td>
                <td colSpan={2} className="pt-2 text-right">
                  <span data-testid="rows-complete">{totals.complete}/{totals.total}</span> vollständig
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/components/worksheet/__tests__/surface-inventory-editor.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full unit suite + typecheck (no regressions)**

Run: `pnpm test && pnpm typecheck`
Expected: all green. (If `sub-areas-editor.tsx` or other consumers reference the old `SurfaceRow` shape, they are untouched here — `SurfaceInventoryEditor`'s prop signature is unchanged, so `worksheet-form.tsx` still compiles.)

- [ ] **Step 6: Commit**

```bash
git add src/components/worksheet/surface-inventory-editor.tsx src/components/worksheet/__tests__/surface-inventory-editor.test.tsx
git commit -m "feat(138): A138-07 Tab. 9 picker editor (auto-fill C_i/C_s, override, derived kind)"
```

---

## Self-Review (against the spec)

- **§1 Tab. 9 module** → Task 1 (30 entries verbatim, accessor-only, tagged standard/edition). ✓
- **§2 SurfaceRow + normalizer** → Task 2 (shape, derived kind/complete/mismatch, unique-match migration, c_s backfill, override-on-mismatch, idempotent). ✓
- **§3 editor** → Task 3 (grouped picker, auto-fill read-only C_i/C_s, "abweichend wählen" override editing c_i/c_s only with Tab. 9 pair visible, kind badge, footer A_E,b,a/A_E,nb,a + n/m complete). ✓
- **Out of Plan 1 (→ Plan 2/3):** `summarizeSurfaces`, engine aggregator + whitelist, A138-07 fields/equations migration, A138-10 retire/inherit/read-only mirror, upstream-cause message, consumer re-pointing, materialization. Tracked in the spec's decomposition.

**Placeholder scan:** none — every step has complete code/commands.
**Type consistency:** `SurfaceRow`/`SurfaceInventoryCarrier` identical across Tasks 2–3; editor consumes only the Task 1/2 exports; `lookupTab9`/`getTab9Entries` signatures match Task 1.

## Acceptance criteria covered by Plan 1

- A138-07: choosing an Oberflächentyp fills C_i/C_s read-only from Tab. 9; C_s can't be blank on a complete row (a row without C_s is not `complete`).
- Test row `park_flach` A=100 → C_i 0.1, C_s 0.2, kind unpaved, A·C_i 10, complete.
- Migration: Parkplatz/Testfläche clean; Gewächshausdach drops to reselection; no stored c_i changed.
- A_E,b,a / A_E,nb,a totals shown in the footer (full production-field wiring is Plan 2).

_(Cross-worksheet acceptance — A138-10 shows the upstream-cause message, no second editable input, A_C 4826.43 inheritance — are delivered in Plans 2 & 3.)_
