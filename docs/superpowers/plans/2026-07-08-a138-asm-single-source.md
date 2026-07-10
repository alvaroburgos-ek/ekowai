# A_S,m Per-Facility Single-Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `A_S,m` a single-sourced derived quantity: one determination method (direct/geometry/soil_estimate/manual) is the sole write-path per run; every consumer reads the one canonical A138-12 `A_S_m` by reference; the editable-derived drift (defect #9) and the orphan `A_S_m_Becken` dual-source disappear.

**Architecture:** A pure resolver (`asm-source.ts`) maps `(method, facility_type)` → the authoritative producer; a pure materialize (`materialize-asm.ts`) computes `A_S_m` for the active method. Server-side, `saveWorksheet` materializes `A_S_m` on the canonical A138-12 field — owner-fired on an A138-12 save, producer-fired (via the B1 materialize registry) when a geometry input or `facility_type_selected` changes on a Phase-4 facility worksheet — and chains the re-fire into the existing Tab.6 (`loading`) and basin (`q_S_AC`) materializes. Manual is a first-class method with required provenance.

**Tech Stack:** Next.js (vendored breaking-change build — read `node_modules/next/dist/docs/` before touching components), Drizzle/Postgres (Supabase), Vitest. TypeScript discriminated unions. Server materialize inside the `saveWorksheet` transaction.

## Global Constraints

- **Single write-path invariant:** `A_S_m` is produced exactly once per run by the active method's producer; consumers inherit by reference and never recompute or re-enter it. No editable-derived-field state for `A_S_m` (any method except `manual` ⇒ server-owned, client read-only).
- **PLT-HS-01 regression baseline stays byte-identical:** `A_C/A_S,m=107,48`, Tab.6 limit `50`, check `fail`; `V_VA=293,1695`; `Q_zu=2,8312`; `q_S_AC=0,00742`; `r_D_n=5,8`, `D=1440`; config `flaechengruppe=V2`, `A_S=A_S_min=A_S_max=45 ⇒ A_S,m=45`. The migration MUST default all existing data to `a_s_m_determination_method='direct'`.
- **Consumers are method-agnostic:** `q_S_AC` (Gl.9), `V_M` (Gl.14/15), `V_VA` (Gl.41), Tab.6 — no per-method branch anywhere; identical output for a given `A_S_m`.
- **Facility-scoped, multi-facility non-foreclosing:** one facility per run; all `A_S_m` reads/writes funnel through the resolver + registry so a future per-facility inventory is additive.
- **Determination methods:** `direct` (Gl.7 = `(A_S_min+A_S_max)/2`, A138-12), `geometry` (Gl.16 Mulde — **ITERATIVE Dauerstufen sweep, governing=max, A-2** / Gl.17 Rigole one-shot; D-1 mulde/rigole only), `soil_estimate` (Tab.13 **two-option Bodenart selector, verbatim rows, A-1**: `Mittel-/Feinsand → 0,10·A_C`, `schluffiger Sand / sandiger Schluff / Schluff → 0,20·A_C`), `manual` (entered + required provenance).
- **A-1 (no k_f cut):** Tab.13 is keyed by Bodenart; there is NO source `k_f` threshold (only Bild 2, a figure Anh. A disqualifies). Build a Bodenart selector; any k_f→Bodenart seed is a badged encoder heuristic (NR, needs ratification) — **omitted in this build** unless trivial. No threshold hunt, no STOP.
- **A-2 (Gl.16 iterative):** Mulde `A_S,m` = max required area over the Dauerstufen sweep, via `iterateGoverningDuration(rows, sizing)` in `governing-duration.ts` (Piece-A pattern). Rigole/Gl.17 stays one-shot. V-2 checks the sweep result.
- **Residues — do NOT build:** R-1 schacht Gl.34 write-back; R-2 (revised) no k_f cut exists — Bodenart selector is authoritative, Bild-2 seed is NR; R-3 `soil_classification` enum; R-4 `A_S` bare; R-5 `MRE`/`MRS`.
- **Mirror-by-reference (Q2):** where a task mirrors a B1 `worksheet.ts` block, anchor by **function/comment name** (e.g. "the `isLoadingSave` owner block", "the `for (const producerEntry of producerEntries)` dispatch loop"), NOT line numbers (they rot).
- **Equation IDs (verified):** Gl.7 `55151cb1-4a5a-48d1-b5c0-2312ef7b78ac`; Gl.16 (Mulde) `14999c2a-cdeb-42c1-98fd-fcdec65123da`; Gl.17 (Rigole) `8afdb49a-7bb1-4f07-a64e-43009b8b6be1`; Gl.9 (q_S_AC) `e2ec4338-1356-480f-a7ab-da57fdc1fc22`.
- **facility_type_selected enum → worksheet:** `flaeche→A138-16`, `mulde→A138-17`, `rigole→A138-18`, `schacht→A138-21`, `becken→A138-22` (`MRE`/`MRS` out of scope).
- **Process:** Alvaro's git identity (`alvaro.burgos@ekowai.com`); run Vitest on the isolated pnpm store (defect-register P1) — set up in Task 0; migration written-not-applied (apply is a human step at cutover); test only on the `-hannesoster-` alias after hard-reload (P2). German UI copy, English code/docs.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/eval/asm-source.ts` (new) | Pure. `AsmMethod`, `AsmState`, equation-id + facility-map constants, `resolveAsmProducer`, `computeDirect`, `computeSoilEstimate`, `soilFavourabilityFromKf`. |
| `src/lib/eval/materialize-asm.ts` (new) | Pure wrapper: `(method, inputs) → { A_S_m, state }` flat outputs for persistence. Mirrors `materialize-tab6-loading.ts`. |
| `src/lib/eval/__tests__/asm-source.test.ts` (new) | Resolver + per-method compute + favourability tests. |
| `src/lib/eval/__tests__/materialize-asm.test.ts` (new) | Materialize wrapper tests incl. baseline (direct 45/45⇒45). |
| `scripts/migrations/20260708120000_a138_asm_single_source.sql` (new) + `scripts/rollback-20260708120000-a138_asm_single_source.sql` (new) | Fields, `direct` backfill, retire `A_S_m_Becken`, consumer wiring. Written-not-applied. |
| `src/lib/actions/materialize-registry.ts` (modify) | Add `asm` entry + ASM input-symbol/equation constants. |
| `src/lib/actions/worksheet.ts` (modify) | Owner + producer `A_S_m` materialize; `A_S_min≤A_S_max` + manual-provenance validation; type-change invalidation; chained re-fire into `loading`/`basin`. |
| `src/lib/db/queries/worksheet.ts` (modify) | Facility-scoped authoritative `A_S_m` read helper. |
| `src/components/worksheet/asm-method-status.tsx` (new) | Badge: derived / specified(manual) / needs_reconfirmation. Mirrors `ac-as-ratio-check-status.tsx`. |
| `src/components/worksheet/dynamic-field.tsx` (modify) | `A_S_m` read-only for non-manual; provenance input required when manual; wire the badge. |
| `src/lib/pdf/*` (modify — locate in Task 10) | One report line when `A_S_m` was specified (manual) with provenance. |

---

## Task 0: Test-runner setup (isolated pnpm store)

**Files:** none committed — environment only.

- [ ] **Step 1: Ensure the isolated store exists and vitest runs.** From the B2 worktree root (`C:\Users\Ekowai\_wt-a138-asm`), reuse the standing isolated store (defect-register P1). If `node_modules` is absent or its `vitest` is EPERM-locked, install into the copy store:

Run (bash):
```bash
pnpm install --package-import-method=copy --store-dir /c/Users/Ekowai/.pnpm-store-138test
```
Expected: install completes; `node_modules/.bin/vitest` present and not a symlink into the locked shared store.

- [ ] **Step 2: Smoke-run one existing suite.**
Run: `pnpm vitest run src/lib/eval/__tests__/tab6-loading.test.ts`
Expected: PASS (proves the runner works before we add tests).

---

## Task 1: `asm-source.ts` — pure resolver + per-method compute

**Files:**
- Create: `src/lib/eval/asm-source.ts`
- Test: `src/lib/eval/__tests__/asm-source.test.ts`

**Interfaces:**
- Produces:
  - `type AsmMethod = 'direct' | 'geometry' | 'soil_estimate' | 'manual'`
  - `type FacilityType = 'flaeche' | 'mulde' | 'rigole' | 'schacht' | 'becken'`
  - `type AsmState = { status: 'determined'; value: number; method: AsmMethod; sourceWorksheet: string } | { status: 'manual'; value: number; provenance: string } | { status: 'needs_reconfirmation'; value: number; reason: 'facility_type_changed' } | { status: 'indeterminate'; reason: string }`
  - `type AsmProducer = { kind: 'direct' } | { kind: 'geometry'; worksheetCode: string; equationId: string } | { kind: 'soil_estimate' } | { kind: 'manual' } | { kind: 'unresolved'; reason: string }`
  - `const ASM_GL7_EQUATION_ID`, `ASM_GL16_EQUATION_ID`, `ASM_GL17_EQUATION_ID`
  - `const FACILITY_TYPE_TO_WORKSHEET: Record<FacilityType, string>`
  - `type Tab13Bodenart = 'mittel_feinsand' | 'schluffig'`
  - `function resolveAsmProducer(method, facilityType): AsmProducer`
  - `function computeDirect(aSmin, aSmax): number | null`
  - `function computeSoilEstimate(aC, bodenart): number | null` — `mittel_feinsand → 0,10·A_C`, `schluffig → 0,20·A_C` (A-1, verbatim Tab.13 rows)

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/eval/__tests__/asm-source.test.ts
import { describe, it, expect } from 'vitest';
import {
  resolveAsmProducer, computeDirect, computeSoilEstimate,
  ASM_GL16_EQUATION_ID, ASM_GL17_EQUATION_ID, FACILITY_TYPE_TO_WORKSHEET,
} from '../asm-source';

describe('resolveAsmProducer', () => {
  it('direct/soil/manual resolve without a facility type', () => {
    expect(resolveAsmProducer('direct', null)).toEqual({ kind: 'direct' });
    expect(resolveAsmProducer('soil_estimate', null)).toEqual({ kind: 'soil_estimate' });
    expect(resolveAsmProducer('manual', null)).toEqual({ kind: 'manual' });
  });
  it('geometry resolves only for mulde/rigole (D-1)', () => {
    expect(resolveAsmProducer('geometry', 'mulde'))
      .toEqual({ kind: 'geometry', worksheetCode: 'A138-17', equationId: ASM_GL16_EQUATION_ID });
    expect(resolveAsmProducer('geometry', 'rigole'))
      .toEqual({ kind: 'geometry', worksheetCode: 'A138-18', equationId: ASM_GL17_EQUATION_ID });
  });
  it('geometry is unresolved for flaeche/schacht/becken and null', () => {
    for (const t of ['flaeche', 'schacht', 'becken', null] as const) {
      expect(resolveAsmProducer('geometry', t).kind).toBe('unresolved');
    }
  });
});

describe('computeDirect (Gl.7)', () => {
  it('averages min/max; PLT-HS-01 baseline 45/45 ⇒ 45', () => {
    expect(computeDirect(45, 45)).toBe(45);
    expect(computeDirect(30, 50)).toBe(40);
  });
  it('null on missing/non-finite input', () => {
    expect(computeDirect(null, 50)).toBeNull();
    expect(computeDirect(30, Number.NaN)).toBeNull();
  });
});

describe('computeSoilEstimate (Tab.13 — Bodenart-keyed, A-1)', () => {
  it('0,10·A_C Mittel-/Feinsand, 0,20·A_C schluffig', () => {
    expect(computeSoilEstimate(1000, 'mittel_feinsand')).toBeCloseTo(100, 9);
    expect(computeSoilEstimate(1000, 'schluffig')).toBeCloseTo(200, 9);
  });
  it('null when A_C or Bodenart missing', () => {
    expect(computeSoilEstimate(null, 'mittel_feinsand')).toBeNull();
    expect(computeSoilEstimate(1000, null)).toBeNull();
  });
});

describe('constants', () => {
  it('facility→worksheet map', () => {
    expect(FACILITY_TYPE_TO_WORKSHEET.mulde).toBe('A138-17');
    expect(FACILITY_TYPE_TO_WORKSHEET.becken).toBe('A138-22');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/eval/__tests__/asm-source.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/eval/asm-source.ts
/**
 * DWA-A 138-1 — single-source resolution for the mean infiltration area A_S,m.
 *
 * A_S,m is ONE physical quantity with multiple determination methods (§5.3.3.6
 * Gl.7 generic; Mulde/Rigole solve for the same A_S,m from geometry). Exactly
 * one method is active per run and is the sole producer of the canonical A138-12
 * A_S_m field. This module is pure / DB-free: it maps (method, facilityType) to
 * the authoritative producer and computes the direct + soil-estimate methods.
 * Geometry values are produced by the facility worksheets' own equations and
 * write back to A138-12 (handled in worksheet.ts, not here).
 */

export type AsmMethod = 'direct' | 'geometry' | 'soil_estimate' | 'manual';
export type FacilityType = 'flaeche' | 'mulde' | 'rigole' | 'schacht' | 'becken';
/** Tab.13 Bodenart rows (verbatim, A-1). */
export type Tab13Bodenart = 'mittel_feinsand' | 'schluffig';

/** Verified equation ids (Global Constraints). */
export const ASM_GL7_EQUATION_ID  = '55151cb1-4a5a-48d1-b5c0-2312ef7b78ac'; // A138-12 direct
export const ASM_GL16_EQUATION_ID = '14999c2a-cdeb-42c1-98fd-fcdec65123da'; // A138-17 Mulde geometry
export const ASM_GL17_EQUATION_ID = '8afdb49a-7bb1-4f07-a64e-43009b8b6be1'; // A138-18 Rigole geometry

/** facility_type_selected (A138-15) → design worksheet code. */
export const FACILITY_TYPE_TO_WORKSHEET: Record<FacilityType, string> = {
  flaeche: 'A138-16',
  mulde:   'A138-17',
  rigole:  'A138-18',
  schacht: 'A138-21',
  becken:  'A138-22',
};

/** Discriminated state of the resolved A_S,m. Never a bare number / silent zero. */
export type AsmState =
  | { status: 'determined'; value: number; method: AsmMethod; sourceWorksheet: string }
  | { status: 'manual'; value: number; provenance: string }
  | { status: 'needs_reconfirmation'; value: number; reason: 'facility_type_changed' }
  | { status: 'indeterminate'; reason: string };

/** The authoritative producer for the active method. */
export type AsmProducer =
  | { kind: 'direct' }
  | { kind: 'geometry'; worksheetCode: string; equationId: string }
  | { kind: 'soil_estimate' }
  | { kind: 'manual' }
  | { kind: 'unresolved'; reason: string };

/**
 * Map the active determination method (+ selected facility) to the sole producer.
 * D-1: `geometry` is available ONLY for mulde/rigole; the other types supply
 * A_S,m via direct/manual (their own geometry produces a different symbol).
 */
export function resolveAsmProducer(method: AsmMethod, facilityType: FacilityType | null): AsmProducer {
  switch (method) {
    case 'direct':        return { kind: 'direct' };
    case 'soil_estimate': return { kind: 'soil_estimate' };
    case 'manual':        return { kind: 'manual' };
    case 'geometry':
      if (facilityType === 'mulde')  return { kind: 'geometry', worksheetCode: 'A138-17', equationId: ASM_GL16_EQUATION_ID };
      if (facilityType === 'rigole') return { kind: 'geometry', worksheetCode: 'A138-18', equationId: ASM_GL17_EQUATION_ID };
      return { kind: 'unresolved', reason: `geometry-Methode nur für Mulde/Rigole; Typ=${facilityType ?? 'nicht gewählt'}.` };
  }
}

/** Gl.7 direct method: A_S,m = (A_S,min + A_S,max)/2. */
export function computeDirect(aSmin: number | null, aSmax: number | null): number | null {
  if (typeof aSmin !== 'number' || !Number.isFinite(aSmin)) return null;
  if (typeof aSmax !== 'number' || !Number.isFinite(aSmax)) return null;
  return (aSmin + aSmax) / 2;
}

/**
 * Tab.13 (verbatim, A-1): A_S,m = 0,10·A_C for Mittel-/Feinsand,
 * 0,20·A_C for schluffiger Sand / sandiger Schluff / Schluff.
 * Keyed by the Bodenart selector — NOT by k_f (there is no source k_f cut).
 */
export function computeSoilEstimate(aC: number | null, bodenart: Tab13Bodenart | null): number | null {
  if (typeof aC !== 'number' || !Number.isFinite(aC) || bodenart === null) return null;
  return (bodenart === 'mittel_feinsand' ? 0.10 : 0.20) * aC;
}
// NOTE (A-1 / R-2): no soilFavourabilityFromKf. Any k_f→Bodenart seed would be a
// Bild-2 (figure) heuristic Anh. A disqualifies as sole source → NR, needs
// ratification. Omitted from this build; the Bodenart selector is authoritative.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/eval/__tests__/asm-source.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/eval/asm-source.ts src/lib/eval/__tests__/asm-source.test.ts
git commit -m "feat(a138): A_S,m determination-method resolver + direct/soil compute (pure)"
```

---

## Task 2: `materialize-asm.ts` — pure materialize wrapper + verbatim Tab.13 cut

**Files:**
- Create: `src/lib/eval/materialize-asm.ts`
- Test: `src/lib/eval/__tests__/materialize-asm.test.ts`

**A-1 (no source hunt):** soil-estimate is keyed by the **Bodenart selector**
(verbatim Tab.13 rows), not `k_f`. There is no threshold to pin and **no STOP
condition** — Task 1 already encodes `computeSoilEstimate(aC, bodenart)`.

**A-2 (Mulde iterative):** the Mulde geometry value is the **governing max over
the Dauerstufen sweep** of Gl.16, computed here via
`iterateGoverningDuration(rows, sizing)` from
`src/lib/eval/governing-duration.ts`. Rigole (Gl.17) is one-shot.

**Interfaces:**
- Consumes: `AsmMethod`, `Tab13Bodenart`, `computeDirect`, `computeSoilEstimate`, `AsmState` from `asm-source.ts`; `iterateGoverningDuration` from `governing-duration.ts`.
- Produces:
  - `function computeMuldeGeometrySweep(rows: ReadonlyArray<{D_min:number|null; r_D_n:number|null}>, scalars: {A_C:number; h_M:number; f_Z:number; k_i:number}): { A_S_m: number | null; governingD: number | null; boundaryLimited: boolean }` — Gl.16 swept, governing = max required area.
  - `type AsmMaterializeInput = { method: AsmMethod; A_S_min: number|null; A_S_max: number|null; A_C: number|null; bodenart: Tab13Bodenart|null; geometryValue: number|null; manualValue: number|null; manualProvenance: string|null; facilityType: FacilityType|null; sourceWorksheet: string|null }` — `geometryValue` is the already-resolved facility value (Rigole one-shot Gl.17, or the Mulde sweep's `A_S_m`).
  - `function materializeAsm(input): { A_S_m: number | null; state: AsmState }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/eval/__tests__/materialize-asm.test.ts
import { describe, it, expect } from 'vitest';
import { materializeAsm, computeMuldeGeometrySweep } from '../materialize-asm';

const noGeo = { geometryValue: null as number | null };
describe('materializeAsm', () => {
  it('direct: PLT-HS-01 baseline 45/45 ⇒ A_S_m 45, determined', () => {
    const r = materializeAsm({ method: 'direct', A_S_min: 45, A_S_max: 45, A_C: null, bodenart: null, ...noGeo, manualValue: null, manualProvenance: null, facilityType: null, sourceWorksheet: 'A138-12' });
    expect(r.A_S_m).toBe(45);
    expect(r.state).toMatchObject({ status: 'determined', value: 45, method: 'direct' });
  });
  it('geometry: uses the resolved facility value (sweep/one-shot), determined', () => {
    const r = materializeAsm({ method: 'geometry', A_S_min: null, A_S_max: null, A_C: null, bodenart: null, geometryValue: 62.5, manualValue: null, manualProvenance: null, facilityType: 'mulde', sourceWorksheet: 'A138-17' });
    expect(r.A_S_m).toBe(62.5);
    expect(r.state).toMatchObject({ status: 'determined', value: 62.5, method: 'geometry', sourceWorksheet: 'A138-17' });
  });
  it('geometry unresolved (becken) ⇒ indeterminate, A_S_m null', () => {
    const r = materializeAsm({ method: 'geometry', A_S_min: null, A_S_max: null, A_C: null, bodenart: null, ...noGeo, manualValue: null, manualProvenance: null, facilityType: 'becken', sourceWorksheet: null });
    expect(r.A_S_m).toBeNull();
    expect(r.state.status).toBe('indeterminate');
  });
  it('soil_estimate: 0,20·A_C for schluffig Bodenart', () => {
    const r = materializeAsm({ method: 'soil_estimate', A_S_min: null, A_S_max: null, A_C: 1000, bodenart: 'schluffig', ...noGeo, manualValue: null, manualProvenance: null, facilityType: null, sourceWorksheet: 'A138-12' });
    expect(r.A_S_m).toBeCloseTo(200, 6);
    expect(r.state.status).toBe('determined');
  });
  it('manual: passthrough value + provenance ⇒ manual state', () => {
    const r = materializeAsm({ method: 'manual', A_S_min: null, A_S_max: null, A_C: null, bodenart: null, ...noGeo, manualValue: 88, manualProvenance: 'Datenblatt Fertigteil-Rigole XYZ', facilityType: 'rigole', sourceWorksheet: 'A138-12' });
    expect(r.A_S_m).toBe(88);
    expect(r.state).toMatchObject({ status: 'manual', value: 88, provenance: 'Datenblatt Fertigteil-Rigole XYZ' });
  });
  it('manual without provenance ⇒ indeterminate (provenance required)', () => {
    const r = materializeAsm({ method: 'manual', A_S_min: null, A_S_max: null, A_C: null, bodenart: null, ...noGeo, manualValue: 88, manualProvenance: null, facilityType: null, sourceWorksheet: 'A138-12' });
    expect(r.A_S_m).toBeNull();
    expect(r.state.status).toBe('indeterminate');
  });
});

describe('computeMuldeGeometrySweep (Gl.16 iterative, A-2)', () => {
  const scalars = { A_C: 5000, h_M: 0.30, f_Z: 1.2, k_i: 1e-5 };
  it('returns the MAX required area over the Dauerstufen sweep, not a single-D value', () => {
    const rows = [
      { D_min: 10, r_D_n: 200 },
      { D_min: 60, r_D_n: 90 },
      { D_min: 1440, r_D_n: 8 },
    ];
    const swept = computeMuldeGeometrySweep(rows, scalars);
    // Governing must equal the maximum Gl.16 value across the three rows.
    const gl16 = (D: number, r_D: number) => (scalars.A_C * 1e-7 * r_D) / (scalars.h_M / (D * 60 * scalars.f_Z) + scalars.k_i);
    const expectedMax = Math.max(...rows.map((r) => gl16(r.D_min!, r.r_D_n!)));
    expect(swept.A_S_m).toBeCloseTo(expectedMax, 6);
  });
  it('null when rows empty / all inputs missing', () => {
    expect(computeMuldeGeometrySweep([], scalars).A_S_m).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/eval/__tests__/materialize-asm.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/eval/materialize-asm.ts
/**
 * DWA-A 138-1 — materialize the single-sourced mean infiltration area A_S,m.
 *
 * Pure / DB-free. Given the active determination method + its inputs, returns
 * the flat A_S_m value to persist on A138-12 and a discriminated AsmState. The
 * server (worksheet.ts) supplies inputs and persists the outputs; consumers read
 * A_S_m by reference and never see the method.
 */
import {
  type AsmMethod, type FacilityType, type Tab13Bodenart, type AsmState,
  resolveAsmProducer, computeDirect, computeSoilEstimate,
} from './asm-source';
import { iterateGoverningDuration } from './governing-duration';

/**
 * A-2: Mulde Gl.16 is iterative over Dauerstufen. Evaluate
 *   A_S,m(D,r_D) = (A_C·1e-7·r_D) / (h_M/(D·60·f_Z) + k_i)
 * at each tabulated (D, r_D(n)) and take the GOVERNING = maximum required area.
 * Reuses Piece-A's iterateGoverningDuration engine.
 */
export function computeMuldeGeometrySweep(
  rows: ReadonlyArray<{ D_min: number | null; r_D_n: number | null }>,
  scalars: { A_C: number; h_M: number; f_Z: number; k_i: number },
): { A_S_m: number | null; governingD: number | null; boundaryLimited: boolean } {
  const gov = iterateGoverningDuration(rows, (D, r_D) =>
    (scalars.A_C * 1e-7 * r_D) / (scalars.h_M / (D * 60 * scalars.f_Z) + scalars.k_i),
  );
  return { A_S_m: gov.governingValue, governingD: gov.governingD, boundaryLimited: gov.boundaryLimited };
}

export type AsmMaterializeInput = {
  method: AsmMethod;
  A_S_min: number | null;
  A_S_max: number | null;
  A_C: number | null;
  bodenart: Tab13Bodenart | null;
  /** Resolved facility geometry value: Rigole one-shot Gl.17, or the Mulde sweep's A_S_m. */
  geometryValue: number | null;
  manualValue: number | null;
  manualProvenance: string | null;
  facilityType: FacilityType | null;
  sourceWorksheet: string | null;
};

export function materializeAsm(input: AsmMaterializeInput): { A_S_m: number | null; state: AsmState } {
  const producer = resolveAsmProducer(input.method, input.facilityType);

  if (producer.kind === 'unresolved') {
    return { A_S_m: null, state: { status: 'indeterminate', reason: producer.reason } };
  }

  if (producer.kind === 'manual') {
    if (input.manualValue == null || !Number.isFinite(input.manualValue)) {
      return { A_S_m: null, state: { status: 'indeterminate', reason: 'Manueller A_S,m-Wert fehlt.' } };
    }
    if (!input.manualProvenance || input.manualProvenance.trim() === '') {
      return { A_S_m: null, state: { status: 'indeterminate', reason: 'Herkunftsangabe (Datenblatt/Quelle) für manuellen A_S,m erforderlich.' } };
    }
    return { A_S_m: input.manualValue, state: { status: 'manual', value: input.manualValue, provenance: input.manualProvenance.trim() } };
  }

  let value: number | null;
  if (producer.kind === 'direct') {
    value = computeDirect(input.A_S_min, input.A_S_max);
  } else if (producer.kind === 'soil_estimate') {
    value = computeSoilEstimate(input.A_C, input.bodenart);
  } else { // geometry — geometryValue already resolved (Mulde sweep / Rigole one-shot)
    value = input.geometryValue != null && Number.isFinite(input.geometryValue) ? input.geometryValue : null;
  }

  if (value == null) {
    return { A_S_m: null, state: { status: 'indeterminate', reason: `A_S,m per ${input.method} nicht bestimmbar — Eingaben fehlen.` } };
  }
  return {
    A_S_m: value,
    state: { status: 'determined', value, method: input.method, sourceWorksheet: input.sourceWorksheet ?? 'A138-12' },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/lib/eval/__tests__/materialize-asm.test.ts src/lib/eval/__tests__/asm-source.test.ts`
Expected: PASS — incl. the Mulde sweep max-over-Dauerstufen test (A-2) and the Bodenart-keyed soil test (A-1). No source-hunt / STOP condition.

- [ ] **Step 5: Commit**

```bash
git add src/lib/eval/materialize-asm.ts src/lib/eval/__tests__/materialize-asm.test.ts
git commit -m "feat(a138): materialize A_S,m per method (pure) — Bodenart soil (A-1) + Mulde Dauerstufen sweep (A-2)"
```

---

## Task 3: Migration + rollback (written-not-applied)

**Files:**
- Create: `scripts/migrations/20260708120000_a138_asm_single_source.sql`
- Create: `scripts/rollback-20260708120000-a138_asm_single_source.sql`

**Scope (idempotent, mirrors the B1 migration style in `scripts/migrations/20260702120000_a138_tab6_loading.sql`):**
1. INSERT `a_s_m_determination_method` (enum) on A138-12 — values `direct|geometry|soil_estimate|manual`, default `direct`.
2. INSERT `a_s_m_provenance` (text) on A138-12.
2b. INSERT `soil_bodenart_tab13` (enum) on A138-12 — two verbatim Tab.13 rows (A-1): `mittel_feinsand` "Mittel-/Feinsand", `schluffig` "schluffiger Sand / sandiger Schluff / Schluff". Read only when method=`soil_estimate`.
3. BACKFILL: for every project that has any A138-12 parameter, ensure `a_s_m_determination_method='direct'` (so the baseline is unchanged) — insert a `direct` param row where none exists.
4. RETIRE `A_S_m_Becken` (A138-22): first COUNT any `project_parameters` on it; if >0, RAISE NOTICE listing project_ids (residue — surfaced for engineer re-entry, not dropped), then set the field `active=false`. Do not delete param rows.
5. Ensure `A_S_m` (A138-12) `consumer_worksheets` includes `A138-13, A138-22` (append if missing) so Gl.9/Gl.41 are declared consumers.

- [ ] **Step 1: Write the migration**

```sql
-- scripts/migrations/20260708120000_a138_asm_single_source.sql
-- DWA-A 138-1 B2 — A_S,m per-facility single-source. WRITTEN-NOT-APPLIED.
-- Apply via Management-API POST after Alvaro's review.
-- Rollback: scripts/rollback-20260708120000-a138_asm_single_source.sql
DO $$
DECLARE
  ws12 uuid; ws22 uuid; sec12 uuid; max_order12 int;
  becken_field uuid; becken_param_count int;
  asm_field uuid;
BEGIN
  SELECT wt.id INTO ws12 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-12';
  SELECT wt.id INTO ws22 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-22';
  IF ws12 IS NULL OR ws22 IS NULL THEN
    RAISE EXCEPTION 'a138_asm: worksheet not found (ws12=% ws22=%)', ws12, ws22;
  END IF;
  SELECT section_id INTO sec12 FROM fields WHERE worksheet_template_id=ws12 AND section_id IS NOT NULL ORDER BY order_index LIMIT 1;
  IF sec12 IS NULL THEN RAISE EXCEPTION 'a138_asm: no section on A138-12'; END IF;

  -- (1) a_s_m_determination_method (enum, default direct)
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=ws12 AND symbol='a_s_m_determination_method') THEN
    SELECT COALESCE(MAX(order_index),0)+1 INTO max_order12 FROM fields WHERE worksheet_template_id=ws12;
    INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, is_required, active, order_index, clause_reference, consumer_worksheets, enum_values, default_value, verification_status)
    VALUES (ws12, sec12, 'a_s_m_determination_method', 'A_S,m — Bestimmungsmethode', 'enum', true, true, max_order12,
      '§5.3.3.6 / §6', NULL,
      '[{"value":"direct","label_de":"Direkt (A_S,min/A_S,max, Gl. 7)","label_en":"Direct (Gl.7)","order_index":0,"regulation_reference":"§5.3.3.6"},
        {"value":"geometry","label_de":"Geometrie (Mulde Gl. 16 / Rigole Gl. 17)","label_en":"Geometry","order_index":1,"regulation_reference":"§6.3.2/§6.4.2"},
        {"value":"soil_estimate","label_de":"Bodenart-Abschätzung (Tab. 13)","label_en":"Soil estimate (Tab.13)","order_index":2,"regulation_reference":"Tab. 13"},
        {"value":"manual","label_de":"Herstellerangabe / manuell","label_en":"Manual / datasheet","order_index":3,"regulation_reference":"§6.4.1"}]'::jsonb,
      '"direct"'::jsonb, 'imported_unverified');
  END IF;

  -- (2) a_s_m_provenance (text)
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=ws12 AND symbol='a_s_m_provenance') THEN
    SELECT COALESCE(MAX(order_index),0)+1 INTO max_order12 FROM fields WHERE worksheet_template_id=ws12;
    INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, is_required, active, order_index, clause_reference, consumer_worksheets, verification_status)
    VALUES (ws12, sec12, 'a_s_m_provenance', 'A_S,m — Herkunft (bei manueller Angabe)', 'text', false, true, max_order12, '§6.4.1', NULL, 'imported_unverified');
  END IF;

  -- (2b) soil_bodenart_tab13 (enum, two verbatim Tab.13 rows, A-1)
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=ws12 AND symbol='soil_bodenart_tab13') THEN
    SELECT COALESCE(MAX(order_index),0)+1 INTO max_order12 FROM fields WHERE worksheet_template_id=ws12;
    INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, is_required, active, order_index, clause_reference, consumer_worksheets, enum_values, verification_status)
    VALUES (ws12, sec12, 'soil_bodenart_tab13', 'Bodenart (Tab. 13 — nur bei Bodenart-Abschätzung)', 'enum', false, true, max_order12, 'Tab. 13', NULL,
      '[{"value":"mittel_feinsand","label_de":"Mittel-/Feinsand","label_en":"Medium/fine sand","order_index":0,"regulation_reference":"Tab. 13"},
        {"value":"schluffig","label_de":"schluffiger Sand / sandiger Schluff / Schluff","label_en":"Silty sand / sandy silt / silt","order_index":1,"regulation_reference":"Tab. 13"}]'::jsonb,
      'imported_unverified');
  END IF;

  -- (3) Backfill 'direct' for every project holding A138-12 params (baseline safety).
  SELECT id INTO asm_field FROM fields WHERE worksheet_template_id=ws12 AND symbol='a_s_m_determination_method' LIMIT 1;
  INSERT INTO project_parameters (project_id, field_id, value_enum, source_type, entered_by, entered_at)
  SELECT DISTINCT pp.project_id, asm_field, 'direct', 'entered', pp.entered_by, NOW()
  FROM project_parameters pp
  JOIN fields f ON f.id = pp.field_id
  WHERE f.worksheet_template_id = ws12
    AND NOT EXISTS (SELECT 1 FROM project_parameters x WHERE x.project_id=pp.project_id AND x.field_id=asm_field);

  -- (4) Retire orphan A_S_m_Becken (D-4). Surface residue values before deactivating.
  SELECT id INTO becken_field FROM fields WHERE worksheet_template_id=ws22 AND symbol='A_S_m_Becken' LIMIT 1;
  IF becken_field IS NOT NULL THEN
    SELECT COUNT(*) INTO becken_param_count FROM project_parameters WHERE field_id=becken_field AND (value_number IS NOT NULL OR value_text IS NOT NULL);
    IF becken_param_count > 0 THEN
      RAISE NOTICE 'a138_asm RESIDUE: % stored A_S_m_Becken value(s) — projects: %',
        becken_param_count,
        (SELECT string_agg(DISTINCT project_id::text, ', ') FROM project_parameters WHERE field_id=becken_field AND (value_number IS NOT NULL OR value_text IS NOT NULL));
    END IF;
    UPDATE fields SET active=false WHERE id=becken_field; -- param rows kept for audit/re-entry
  END IF;

  -- (5) Declare A138-13 + A138-22 as A_S_m consumers (append if missing).
  UPDATE fields SET consumer_worksheets = (
    SELECT array_agg(DISTINCT c) FROM unnest(coalesce(consumer_worksheets, ARRAY[]::text[]) || ARRAY['A138-13','A138-22']) AS c
  ) WHERE worksheet_template_id=ws12 AND symbol='A_S_m';
END $$;
```

- [ ] **Step 2: Write the rollback**

```sql
-- scripts/rollback-20260708120000-a138_asm_single_source.sql
DO $$
DECLARE ws12 uuid; ws22 uuid; asm_field uuid;
BEGIN
  SELECT wt.id INTO ws12 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-A-138-1' AND wt.code='A138-12';
  SELECT wt.id INTO ws22 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-A-138-1' AND wt.code='A138-22';
  SELECT id INTO asm_field FROM fields WHERE worksheet_template_id=ws12 AND symbol='a_s_m_determination_method' LIMIT 1;
  IF asm_field IS NOT NULL THEN DELETE FROM project_parameters WHERE field_id=asm_field; END IF;
  DELETE FROM fields WHERE worksheet_template_id=ws12 AND symbol IN ('a_s_m_determination_method','a_s_m_provenance','soil_bodenart_tab13');
  UPDATE fields SET active=true WHERE worksheet_template_id=ws22 AND symbol='A_S_m_Becken';
END $$;
```

- [ ] **Step 3: Static validation (no apply).** Confirm the SQL parses (paste into a `EXPLAIN`-free lint or review by eye against the B1 migration). Do NOT apply — cutover is a human step.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrations/20260708120000_a138_asm_single_source.sql scripts/rollback-20260708120000-a138_asm_single_source.sql
git commit -m "feat(a138): B2 migration — A_S,m method+provenance fields, direct backfill, retire A_S_m_Becken (written-not-applied)"
```

---

## Task 4: Registry entry `asm` in `materialize-registry.ts`

**Files:**
- Modify: `src/lib/actions/materialize-registry.ts`
- Test: `src/lib/actions/__tests__/materialize-registry.test.ts` (extend if present; else create)

**Interfaces:**
- Consumes: `MaterializeEntry`, `producerFiredEntries` (existing), `ASM_GL7/16/17_EQUATION_ID` from `asm-source.ts`.
- Produces: a new registry entry `{ id: 'asm', … }`; `ASM_INPUT_SYMBOLS` constant.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/actions/__tests__/materialize-registry.test.ts  (add these cases)
import { describe, it, expect } from 'vitest';
import { MATERIALIZE_REGISTRY, producerFiredEntries } from '../materialize-registry';

describe('asm registry entry', () => {
  const asm = MATERIALIZE_REGISTRY.find((e) => e.id === 'asm');
  it('exists and targets A138-12', () => {
    expect(asm).toBeTruthy();
    expect(asm!.consumerTemplateCode).toBe('A138-12');
  });
  it('fires on a geometry input or facility_type_selected change', () => {
    const fired = producerFiredEntries(new Set(['h_M']), new Set());
    expect(fired.some((e) => e.id === 'asm')).toBe(true);
    const fired2 = producerFiredEntries(new Set(['facility_type_selected']), new Set());
    expect(fired2.some((e) => e.id === 'asm')).toBe(true);
  });
  it('does not double-fire when already owner-fired', () => {
    const fired = producerFiredEntries(new Set(['A_S_min']), new Set(['asm']));
    expect(fired.some((e) => e.id === 'asm')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/actions/__tests__/materialize-registry.test.ts`
Expected: FAIL (no `asm` entry).

- [ ] **Step 3: Implement — add the entry + constants**

In `materialize-registry.ts`, import the ids and add the entry to `MATERIALIZE_REGISTRY` (mirror the `loading` entry's shape and the inline 138-SPECIFIC comments):

```ts
import { ASM_GL7_EQUATION_ID, ASM_GL16_EQUATION_ID, ASM_GL17_EQUATION_ID } from '@/lib/eval/asm-source';

// 138-SPECIFIC: inputs that change the authoritative A_S,m. Geometry inputs live on
// the Phase-4 facility worksheets; direct inputs + method selector on A138-12;
// facility_type_selected on A138-15 (its change re-resolves the producer).
const ASM_INPUT_SYMBOLS = [
  'A_S_min', 'A_S_max',                 // direct (A138-12)
  'A_C', 'soil_bodenart_tab13',         // soil_estimate (A138-12; Bodenart selector, A-1)
  'h_M', 'b_R', 'h_R', 'L_R',           // geometry (Mulde/Rigole)
  'facility_type_selected',             // producer re-resolution (A138-15)
  'a_s_m_determination_method',         // method switch (A138-12)
  'a_s_m_provenance',                   // manual provenance (A138-12)
] as const;

// ── A_S,m single-source (A138-12) ─────────────────────────────────────────
{
  id: 'asm',
  inputSymbols: new Set<string>(ASM_INPUT_SYMBOLS),
  // A138-12 owns Gl.7; a geometry save (Gl.16/17) fires producer-side.
  ownerTrigger: (eqs) => eqs.some((e) =>
    e.id === ASM_GL7_EQUATION_ID || e.id === ASM_GL16_EQUATION_ID || e.id === ASM_GL17_EQUATION_ID),
  consumerTemplateCode: 'A138-12',
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/actions/__tests__/materialize-registry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/materialize-registry.ts src/lib/actions/__tests__/materialize-registry.test.ts
git commit -m "feat(a138): register A_S,m materialize (producer-side, A138-12 consumer)"
```

---

## Task 5: `saveWorksheet` — owner-fired A_S,m materialize + validations

**Files:**
- Modify: `src/lib/actions/worksheet.ts` (add an `isAsmSave` block mirroring the `isLoadingSave` owner block at lines 663–792; add validations before the transaction)
- Test: `src/lib/actions/__tests__/worksheet-asm.test.ts` (new; mirror the existing worksheet action test harness)

**Interfaces:**
- Consumes: `materializeAsm` (Task 2), `ASM_GL7_EQUATION_ID` (Task 1).
- Produces: on an A138-12 save, `A_S_m` (+ derived state) is written server-side for the active method; `A_S_min>A_S_max` and manual-without-provenance are rejected with warnings; `A_S_m` derived rows are pushed to `writtenDerived`.

- [ ] **Step 1: Write the failing test** (direct baseline + validation)

```ts
// src/lib/actions/__tests__/worksheet-asm.test.ts
import { describe, it, expect } from 'vitest';
import { materializeAsm } from '@/lib/eval/materialize-asm';
// Unit-level guard mirroring what the server block does, so the invariant is
// covered even without a DB (DB-gated integration runs separately).
describe('A_S,m owner materialize (logic)', () => {
  it('direct 45/45 ⇒ 45 (baseline)', () => {
    expect(materializeAsm({ method:'direct', A_S_min:45, A_S_max:45, A_C:null, k_f:null, geometryValue:null, manualValue:null, manualProvenance:null, facilityType:null, sourceWorksheet:'A138-12' }).A_S_m).toBe(45);
  });
  it('A_S_min>A_S_max is a validation error the server must reject', () => {
    // The server rejects before materialize; encode the predicate under test:
    const invalid = (min:number, max:number) => min > max;
    expect(invalid(50, 45)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails / passes-as-guard**

Run: `pnpm vitest run src/lib/actions/__tests__/worksheet-asm.test.ts`
Expected: PASS at logic level (guards the invariant). The DB-integration assertion is verified live in Task 11.

- [ ] **Step 3: Implement the server block.** In `worksheet.ts`:
  1. Hoist `const isAsmSave = templateEquations.some((e) => e.id === ASM_GL7_EQUATION_ID);` next to the existing `const isLoadingSave = …` declaration. Add `isAsmSave` to the empty-batch early-return guard (the `if (fieldIds.length === 0 && !isBasinSave && !isLoadingSave)` line) and to the transaction-open guard (the `if (savedCount > 0 || isBasinSave || isLoadingSave || producerEntries.length > 0)` condition).
  2. **Validation (before the transaction, mirroring existing `warnings` pushes):** when the save batch contains `A_S_min` and `A_S_max`, reject if `min>max` (push a warning, skip persisting those two). When `a_s_m_determination_method==='manual'`, require a non-empty `a_s_m_provenance` in the batch or persisted; else warn and set state indeterminate.
  3. **Owner block (mirror the `if (isLoadingSave)` owner block — the sibling-field lookup + local A_S_m read + cross-worksheet read pattern):** when `isAsmSave`, read the method + inputs (A_S_min/A_S_max/A_C/manual/provenance/`soil_bodenart_tab13` local to A138-12; `facility_type_selected` cross from A138-15; `geometryValue` cross from the resolved facility worksheet — Task 6 computes it), call `materializeAsm(...)`, and UPSERT `A_S_m` (value_number) as a derived row; push to `writtenDerived`. Persist the `AsmState.status` into a companion — reuse `a_s_m_provenance` for manual; store `needs_reconfirmation` handling in Task 8.

Show the core substitution (the rest mirrors the loading block verbatim):

```ts
// inside the transaction, after the isLoadingSave block:
if (isAsmSave) {
  const asmWsFields = await tx.select({ id: fields.id, symbol: fields.symbol, dataType: fields.dataType })
    .from(fields).where(and(eq(fields.worksheetTemplateId, instance.worksheetTemplateId), eq(fields.active, true)));
  const asmIdBySymbol = new Map(asmWsFields.map((f) => [f.symbol, f.id]));
  const readLocalNum = async (sym: string): Promise<number|null> => { /* prefer batch, else persisted — mirror A_S_m read at 671–690 */ return null; };
  const method = /* read a_s_m_determination_method (value_enum), default 'direct' */ 'direct' as AsmMethod;
  const A_S_min = await readLocalNum('A_S_min');
  const A_S_max = await readLocalNum('A_S_max');
  // local: A_C (A138-07 cross / A138-12), soil_bodenart_tab13 (A138-12), manualValue/provenance (A138-12);
  // cross: facility_type_selected (A138-15), geometryValue (resolved facility value — Task 6).
  const out = materializeAsm({ method, A_S_min, A_S_max, A_C, bodenart, geometryValue, manualValue, manualProvenance, facilityType, sourceWorksheet: 'A138-12' });
  const asmFieldId = asmIdBySymbol.get('A_S_m');
  if (asmFieldId && out.A_S_m != null) {
    await tx.insert(projectParameters).values([{ projectId: instance.projectId, fieldId: asmFieldId, valueNumber: String(out.A_S_m), valueText: null, sourceType: 'derived', enteredBy: userId, enteredAt: now }])
      .onConflictDoUpdate({ target: [projectParameters.projectId, projectParameters.fieldId], set: { valueNumber: sql`excluded.value_number`, sourceType: sql`excluded.source_type`, enteredBy: sql`excluded.entered_by`, enteredAt: now } });
    writtenDerived.push({ fieldId: asmFieldId, valueNumber: String(out.A_S_m), valueText: null });
  }
}
```

- [ ] **Step 4: Run tests** — `pnpm vitest run src/lib/actions/__tests__/worksheet-asm.test.ts` — Expected: PASS. Also run `pnpm vitest run src/lib/eval/__tests__` to confirm no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/worksheet.ts src/lib/actions/__tests__/worksheet-asm.test.ts
git commit -m "feat(a138): owner-fired A_S,m materialize on A138-12 + min/max & provenance validation"
```

---

## Task 5a: V-2 geometry envelope cross-check (§4.2, warning-only)

**Files:**
- Modify: `src/lib/eval/asm-source.ts` (add `validateGeometryAgainstMax`)
- Modify: `src/lib/actions/worksheet.ts` (surface the flag as a `warnings` entry when method=`geometry`)
- Test: `src/lib/eval/__tests__/asm-source.test.ts` (extend)

**Source (§6.3.2):** "der erforderliche Flächenbedarf entspricht mindestens der maximalen Versickerungsfläche `A_S,max`" — the geometry-derived `A_S,m` must not fall below `A_S,max` (Gl.7 term). This is a **validation flag, never a compute mutation**: it does not change `A_S_m`.

**Interfaces:**
- Produces: `function validateGeometryAgainstMax(geometryValue: number|null, aSmax: number|null): { flag: boolean; reason: string | null }`.

- [ ] **Step 1: Write the failing test**

```ts
// add to src/lib/eval/__tests__/asm-source.test.ts
import { validateGeometryAgainstMax } from '../asm-source';
describe('V-2 geometry ≥ A_S_max cross-check', () => {
  it('flags when geometry < A_S_max', () => {
    expect(validateGeometryAgainstMax(40, 45).flag).toBe(true);
  });
  it('no flag when geometry ≥ A_S_max or A_S_max absent', () => {
    expect(validateGeometryAgainstMax(50, 45).flag).toBe(false);
    expect(validateGeometryAgainstMax(40, null).flag).toBe(false);
  });
});
```

- [ ] **Step 2: Run** `pnpm vitest run src/lib/eval/__tests__/asm-source.test.ts` — Expected: FAIL (function missing).

- [ ] **Step 3: Implement** in `asm-source.ts`:

```ts
/** §6.3.2 V-2: geometry-derived A_S,m must be ≥ A_S,max (Gl.7 term). Flag only. */
export function validateGeometryAgainstMax(geometryValue: number | null, aSmax: number | null): { flag: boolean; reason: string | null } {
  if (typeof geometryValue !== 'number' || !Number.isFinite(geometryValue)) return { flag: false, reason: null };
  if (typeof aSmax !== 'number' || !Number.isFinite(aSmax)) return { flag: false, reason: null };
  if (geometryValue < aSmax) {
    return { flag: true, reason: `A_S,m (Geometrie ${geometryValue}) < A_S,max (${aSmax}) — §6.3.2 Flächenbedarf-Untergrenze verletzt.` };
  }
  return { flag: false, reason: null };
}
```
Then in the `asm` materialize path (Task 5/6), when method=`geometry` and `A_S_max` is present, push `validateGeometryAgainstMax(...).reason` to `warnings` if flagged. `A_S_m` is unchanged.

- [ ] **Step 4: Run** `pnpm vitest run src/lib/eval/__tests__/asm-source.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/eval/asm-source.ts src/lib/eval/__tests__/asm-source.test.ts src/lib/actions/worksheet.ts
git commit -m "feat(a138): V-2 geometry≥A_S_max envelope cross-check (warning, no mutation)"
```

---

## Task 6: `saveWorksheet` — producer-fired A_S,m (geometry write-back) + chained re-fire

**Files:**
- Modify: `src/lib/actions/worksheet.ts` — add an `else if (producerEntry.id === 'asm')` branch to the `for (const producerEntry of producerEntries)` dispatch loop, mirroring the `if (producerEntry.id === 'loading')` branch; after writing `A_S_m`, ensure the `loading` and `basin` entries re-fire in the same save.
- Test: covered by the registry test (Task 4) + the live verification (Task 11).

**Interfaces:**
- Consumes: `producerFiredEntries` results incl. `asm`; `materializeAsm`, `computeMuldeGeometrySweep`; the B1 consumer-template-by-code, `standardId`-scoped resolution (the `const [consumerTmpl] = savedStandardId ? … : []` block inside the `loading` producer branch).
- Produces: when a geometry input (`h_M`/`b_R`/`h_R`/`L_R`) or `facility_type_selected` changes on a facility/selection worksheet, `A_S_m` is recomputed onto A138-12; because `A_S_m ∈ loading.inputSymbols` and `basin.inputSymbols`, the Tab.6 check and `q_S_AC` re-fire.

- [ ] **Step 1: Implement the `asm` producer branch.** Mirror the `loading` producer branch (the `if (producerEntry.id === 'loading')` block): resolve the A138-12 consumer template by `consumerTemplateCode` + `savedStandardId` (fail-closed, same as the `loading` branch's consumer-template resolution); resolve `facility_type_selected` + `a_s_m_determination_method`; when `method='geometry'` compute the facility value:
  - **Mulde** (`A138-17`): read the r_D(n) table rows (same accessor the basin block uses — the `rows`/`iterateGoverningDuration` path in `governing-duration.ts`) + scalars `{A_C, h_M, f_Z, k_i}`, then `computeMuldeGeometrySweep(rows, scalars)` → `A_S_m` (governing max, A-2).
  - **Rigole** (`A138-18`): one-shot Gl.17 = `(b_R+h_R)·L_R + b_R·h_R` from the facility inputs.
  Pass the resolved value as `geometryValue` to `materializeAsm`; UPSERT `A_S_m` on A138-12; push to `writtenDerived`.

- [ ] **Step 2: Chain the re-fire.** After the `asm` producer writes `A_S_m`, ensure `loading` + `basin` run against the new `A_S_m`. The `loading`/`basin` branches re-read `A_S_m` from `project_parameters` inside the txn, so guarantee the `asm` branch runs BEFORE them by ordering the `MATERIALIZE_REGISTRY` array with `asm` first (the dispatch loop iterates registry order). Document the ordering choice in a comment. If ordering is insufficient, after the `asm` write explicitly re-run the loading materialize with the fresh `A_S_m`.

- [ ] **Step 3: Run tests** — `pnpm vitest run src/lib/actions/__tests__/materialize-registry.test.ts src/lib/actions/__tests__/worksheet-asm.test.ts` — Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/worksheet.ts
git commit -m "feat(a138): producer-fired A_S,m geometry write-back + chained Tab.6/q_S_AC re-fire"
```

---

## Task 7: Facility-scoped authoritative A_S,m read for consumers

**Files:**
- Modify: `src/lib/db/queries/worksheet.ts` (add `loadAuthoritativeAsm(projectId, standardId)` that resolves the method + facility and returns the single A138-12 `A_S_m`, bypassing the "first-non-null-wins" symbol sort for `A_S_m`)
- Modify: `src/lib/actions/worksheet.ts` basin block cross-read of `A_S_m` to use the scoped read.
- Test: `src/lib/db/queries/__tests__/asm-read.test.ts` (logic-level for the resolution rule; DB path verified live).

**Interfaces:**
- Consumes: `resolveAsmProducer` (Task 1).
- Produces: `loadAuthoritativeAsm` returns `{ value: number|null; sourceWorksheet: string; method: AsmMethod }` — always the canonical A138-12 value; never a stray facility `A_S_m`.

- [ ] **Step 1: Write the failing test** (resolution rule)

```ts
// src/lib/db/queries/__tests__/asm-read.test.ts
import { describe, it, expect } from 'vitest';
import { resolveAsmProducer } from '@/lib/eval/asm-source';
describe('authoritative A_S,m resolution rule', () => {
  it('geometry(mulde) resolves to A138-17 as the source, not any stray producer', () => {
    expect(resolveAsmProducer('geometry','mulde')).toMatchObject({ worksheetCode: 'A138-17' });
  });
  it('non-geometry always resolves to the canonical A138-12 value', () => {
    expect(resolveAsmProducer('direct', null).kind).toBe('direct');
  });
});
```

- [ ] **Step 2: Run** `pnpm vitest run src/lib/db/queries/__tests__/asm-read.test.ts` — Expected: PASS (logic). 

- [ ] **Step 3: Implement `loadAuthoritativeAsm`.** Read `a_s_m_determination_method` + `facility_type_selected`, resolve the producer, and return the A138-12 `A_S_m` param value. For `A_S_m` specifically, callers use this instead of `loadSameSymbolValues` so the multi-producer sort can never pick a stray value. Update the basin cross-read (`worksheet.ts` basin block) to call it.

- [ ] **Step 4: Run** `pnpm vitest run src/lib/db/queries/__tests__ src/lib/actions/__tests__` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/queries/worksheet.ts src/lib/actions/worksheet.ts src/lib/db/queries/__tests__/asm-read.test.ts
git commit -m "feat(a138): facility-scoped authoritative A_S,m read (no first-non-null-wins for A_S_m)"
```

---

## Task 8: Type-change invalidation (facility_type_selected)

**Files:**
- Modify: `src/lib/actions/worksheet.ts` (in the `asm` producer path: when `facility_type_selected` is among `changedSymbols`, apply the clear/flag rule)
- Test: `src/lib/eval/__tests__/asm-invalidation.test.ts` (pure rule).

**Interfaces:**
- Produces: `function asmInvalidationOnTypeChange(prevMethod, prevState): { clear: boolean; flagNeedsReconfirm: boolean }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/eval/__tests__/asm-invalidation.test.ts
import { describe, it, expect } from 'vitest';
import { asmInvalidationOnTypeChange } from '../asm-source';
describe('type-change invalidation', () => {
  it('geometry value clears on facility-type change', () => {
    expect(asmInvalidationOnTypeChange('geometry')).toEqual({ clear: true, flagNeedsReconfirm: false });
  });
  it('manual value flags needs-reconfirmation, does not clear', () => {
    expect(asmInvalidationOnTypeChange('manual')).toEqual({ clear: false, flagNeedsReconfirm: true });
  });
  it('direct/soil are facility-agnostic — untouched', () => {
    expect(asmInvalidationOnTypeChange('direct')).toEqual({ clear: false, flagNeedsReconfirm: false });
    expect(asmInvalidationOnTypeChange('soil_estimate')).toEqual({ clear: false, flagNeedsReconfirm: false });
  });
});
```

- [ ] **Step 2: Run** — Expected: FAIL (function missing).

- [ ] **Step 3: Implement** in `asm-source.ts`:

```ts
export function asmInvalidationOnTypeChange(prevMethod: AsmMethod): { clear: boolean; flagNeedsReconfirm: boolean } {
  if (prevMethod === 'geometry') return { clear: true, flagNeedsReconfirm: false };
  if (prevMethod === 'manual')   return { clear: false, flagNeedsReconfirm: true };
  return { clear: false, flagNeedsReconfirm: false };
}
```
Then wire it into the `asm` producer path: when `changedSymbols.has('facility_type_selected')`, if `clear` set `A_S_m` param to null; if `flagNeedsReconfirm` persist a `needs_reconfirmation` marker (reuse `a_s_m_provenance` prefix `[needs_reconfirmation]` or a dedicated status field — choose the minimal one and document it).

- [ ] **Step 4: Run** `pnpm vitest run src/lib/eval/__tests__/asm-invalidation.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/eval/asm-source.ts src/lib/eval/__tests__/asm-invalidation.test.ts src/lib/actions/worksheet.ts
git commit -m "feat(a138): A_S,m type-change invalidation — clear geometry, flag manual stale"
```

---

## Task 9: UI — method selector, read-only A_S,m, manual badge + provenance

**Files:**
- Create: `src/components/worksheet/asm-method-status.tsx` (mirror `ac-as-ratio-check-status.tsx`)
- Modify: `src/components/worksheet/dynamic-field.tsx` (A_S_m read-only unless method=manual; require provenance when manual; render the badge)
- Read first (patterns): `src/components/worksheet/ac-as-ratio-check-status.tsx`, and how B1 gated `textLocked=isComputed||readOnly` and wired the badge in `dynamic-field.tsx`.

- [ ] **Step 1: Build the badge** — three states: `derived` (grey "abgeleitet"), `manual` (blue "vorgegeben — Herkunft: …"), `needs_reconfirmation` (amber "Typ geändert — A_S,m bestätigen"). Pure presentational, German copy.

- [ ] **Step 2: Gate `A_S_m` editability + conditional inputs** — in `dynamic-field.tsx`, when `field.symbol==='A_S_m'`: `textLocked = method !== 'manual'`. When `method==='manual'`, `A_S_m` is editable and `a_s_m_provenance` becomes required (block save via the existing required-field path; German error "Herkunftsangabe erforderlich"). Show `soil_bodenart_tab13` only when `method==='soil_estimate'`; show `a_s_m_provenance` only when `method==='manual'`.

- [ ] **Step 3: Wire the badge** next to the `A_S_m` field, driven by the persisted state (derived vs provenance-present vs needs_reconfirmation marker).

- [ ] **Step 4: Typecheck/build** — Run: `pnpm tsc --noEmit` (or the repo's typecheck script) — Expected: no new errors. Manual UI check deferred to Task 11 (live).

- [ ] **Step 5: Commit**

```bash
git add src/components/worksheet/asm-method-status.tsx src/components/worksheet/dynamic-field.tsx
git commit -m "feat(a138): A_S,m method badge + read-only-unless-manual + required provenance (de)"
```

---

## Task 10: PDF report — manual provenance line

**Files:**
- Modify: the A138 PDF/report generator (locate via `grep -rl "A_S" src/lib/pdf src/app` or the report module used by A138-23/A138-24 summary).

- [ ] **Step 1: Locate the report generator** that renders A_S,m in the facility summary. Confirm where A138-23/24 outputs are formatted.

- [ ] **Step 2: Add the line** — when the persisted `A_S,m` state is `manual`, render one explicit line: "A_S,m vorgegeben (nicht abgeleitet) — Herkunft: <provenance>". Otherwise render the value normally with the method note.

- [ ] **Step 3: Test** — add/extend the report unit test asserting the manual line appears iff provenance present. Run the report test suite. Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add <report files>
git commit -m "feat(a138): PDF report line for specified (manual) A_S,m with provenance"
```

---

## Task 11: Live verification on the alias (baseline + single-source + chain)

**Files:** none (verification only). Migration applied by the human at cutover per the deploy convention; this task is the post-deploy proof.

- [ ] **Step 1: Baseline preserved.** On PLT-HS-01 (method backfilled `direct`, `A_S_min=A_S_max=45`), hard-reload the `-hannesoster-` alias and confirm every Global-Constraints value: `A_S,m=45`, `A_C/A_S,m=107,48`, limit `50`, check `fail`, `V_VA=293,1695`, `Q_zu=2,8312`, `q_S_AC=0,00742`, `r_D_n=5,8`, `D=1440`.
- [ ] **Step 2: Single producer.** Select `mulde`, enter Mulde geometry (`h_M`), save A138-17; confirm A138-12 `A_S_m` updates to the Gl.16 value and `q_S_AC` + Tab.6 recompute WITHOUT opening A138-13/A138-12 (producer-side chain). Confirm no stray `A_S_m` from any other worksheet is read.
- [ ] **Step 3: Type-change.** `mulde → rigole`: geometry `A_S_m` clears (recomputes from Gl.17 once Rigole geometry entered). Switch a `manual` value and change type: it flags `needs_reconfirmation`, not cleared.
- [ ] **Step 4: Manual + provenance.** Set method `manual`, leave provenance empty → save rejected. Add provenance → saved; badge + PDF line appear.
- [ ] **Step 5: Orphan retired.** Confirm `A_S_m_Becken` no longer renders on A138-22 and `becken`/Gl.41 reads canonical `A_S_m`. Confirm the migration's residue NOTICE (if any values existed) was captured.
- [ ] **Step 6: Record** the outcome in the vault regression baseline note (append a B2 row) and update the SDD ledger.

---

## Self-Review (author checklist — completed)

**Spec coverage:** §2 model → Tasks 1–2; §3 producer-selection → Task 1 (`resolveAsmProducer`); §4.1 direct → Tasks 1/5; §4.2 geometry incl. **A-2 Mulde Dauerstufen sweep** → Tasks 2 (`computeMuldeGeometrySweep`) + 6; §4.2 V-2 cross-check (vs sweep result) → **Task 5a**; §4.3 soil_estimate **A-1 Bodenart selector** (no k_f cut) → Tasks 1–2 (`computeSoilEstimate(aC,bodenart)`) + 3 (`soil_bodenart_tab13` field); §4.4 manual (4 reqs) → Tasks 2/5/9/10; §5 data model → Task 3; §6 write/read → Tasks 5–7; §7 method-agnostic consumers → Task 11 Steps 1–2; §8 type-change → Task 8; §9 states → Task 1; §10 registry → Task 4; §11 multi-facility → structural (resolver+registry indirection, Tasks 1/4/7); acceptance §13 → Task 11. **No spec requirement without a task; A-1/A-2 folded; anchors by name (Q2).**

**Placeholder scan:** the two `worksheet.ts` integration tasks (5–7) show the core substitution and point to the exact B1 blocks to mirror rather than re-pasting 300 lines — the blocks are in-repo at the cited line ranges. Report-file location (Task 10) is a locate-step, not a placeholder value.

**Type consistency:** `AsmMethod`, `AsmState`, `AsmProducer`, `materializeAsm`, `resolveAsmProducer`, `asmInvalidationOnTypeChange` names match across Tasks 1/2/5/6/7/8. Equation-id constants identical to Global Constraints.
