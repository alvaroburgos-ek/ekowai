/**
 * Aggregators — equation-specific evaluators for formulas that use
 * Σ-over-rows notation. These can't be expressed in flat arithmetic and
 * can't be reduced via a string rewrite without losing the per-row
 * coefficient information. Each aggregator owns:
 *   - The carrier-data shape it expects.
 *   - The arithmetic it runs over that data.
 *   - The "is this row complete?" decision that determines when the engine
 *     emits `manual_required` vs `computed`.
 *
 * Each aggregator must respect the engine's three-state contract: NEVER a
 * bare number that hides a problem.
 */
import type { EvalRequest, EvalState } from './formula';

export type SubArea = {
  id: string;
  label?: string | null;
  kind: 'paved' | 'unpaved';
  area_m2: number | null;
  c: number | null;
};

export type SubAreasCarrier = {
  rows: SubArea[];
};

export type KostraRow = {
  id: string;
  label?: string | null;
  D_min: number | null;
  r_D_n: number | null;
};

export type KostraCarrier = {
  rows: KostraRow[];
};

export type Gl8Scalars = {
  A_C: number | null;
  A_VA: number | null;
  Q_S: number | null;
  Q_Dr: number | null;
  f_Z: number | null;
  f_A: number | null;
};

export type AggregatorContext = {
  /** Carrier data for the sub-areas aggregator (A138-10 Gl. 2). */
  subAreas?: SubAreasCarrier | null;
  /** Carrier data for the KOSTRA-table aggregator (A138-13 Gl. 8). */
  kostraTable?: KostraCarrier | null;
  /** Scalar inputs the Gl. 8 aggregator reads in addition to the table.
   * These come from upstream worksheets via the project's same-symbol
   * inheritance (A_C from A138-10, Q_S from A138-12, f_Z from A138-08…). */
  gl8Scalars?: Gl8Scalars | null;
  /** Engineer-reported unit on the table column (read from the
   * r_D_n_table field's `unit`). Drives the per-row unit guard. */
  kostraUnit?: string | null;
};

type Aggregator = {
  run: (req: EvalRequest) => EvalState;
};

function isComplete(row: SubArea): boolean {
  return (
    typeof row.area_m2 === 'number' &&
    Number.isFinite(row.area_m2) &&
    typeof row.c === 'number' &&
    Number.isFinite(row.c)
  );
}

function rowLabel(row: SubArea, idx: number): string {
  return row.label && row.label.trim() ? row.label.trim() : `Zeile ${idx + 1}`;
}

/**
 * A138-10 Gl. 2 — A_C = Σ (A_E,b,a,i · C_i) + Σ (A_E,nb,a,i · C_i)
 *
 * Both paved and unpaved sub-areas contribute area·c to A_C. The split is
 * meaningful for the source's documentation but mathematically the sum is
 * over all rows.
 */
const a138_10_gl2: Aggregator = {
  run: (req) => {
    const carrier = req.aggregator?.subAreas;
    if (!carrier || !Array.isArray(carrier.rows) || carrier.rows.length === 0) {
      return {
        kind: 'manual_required',
        reason:
          'Keine Teilflächen erfasst. Bitte mindestens eine Zeile mit Fläche und Abflussbeiwert eingeben.',
      };
    }
    const incomplete = carrier.rows
      .map((r, i) => ({ r, i, ok: isComplete(r) }))
      .filter((x) => !x.ok);
    if (incomplete.length > 0) {
      const which = incomplete.map((x) => rowLabel(x.r, x.i)).join(', ');
      return {
        kind: 'manual_required',
        reason: `Unvollständige Teilflächen-Zeilen: ${which}. Fläche und Abflussbeiwert sind je Zeile Pflicht.`,
      };
    }

    let paved = 0;
    let unpaved = 0;
    const substituted: Record<string, number> = {};
    for (let i = 0; i < carrier.rows.length; i++) {
      const row = carrier.rows[i];
      const contribution = (row.area_m2 as number) * (row.c as number);
      if (row.kind === 'paved') paved += contribution;
      else unpaved += contribution;
      // Show each row's contribution in the substituted map so the badge
      // can render it.
      const k = `${rowLabel(row, i)} (${row.area_m2} · ${row.c})`;
      substituted[k] = contribution;
    }
    substituted['Σ befestigt'] = paved;
    substituted['Σ unbefestigt'] = unpaved;
    const total = paved + unpaved;

    return {
      kind: 'computed',
      value: total,
      substituted,
      formulaEvaluated:
        'A_C = Σ_paved(area · c) + Σ_unpaved(area · c)   (per-Teilflächen)',
      // No `rewrite` field — this isn't a string rewrite.
    };
  },
};

/**
 * A138-13 Gl. 8 — V_VA = (Q_zu − Q_S − Q_Dr) · D · 60 · f_Z · f_A · 10⁻³
 *
 * Iterates the KOSTRA-table rows. Q_zu is fixed by Gl. (3):
 *   Q_zu(D) = r_D(n) · (A_C + A_VA) · 10⁻⁴
 * so each row substitutes both `D` and `r_D` into the combined form:
 *   V_VA(D) = (r_D·(A_C+A_VA)·10⁻⁴ − Q_S − Q_Dr) · D · 60 · f_Z · f_A · 10⁻³
 *
 * Returns the MAXIMUM V_VA across rows AND surfaces the governing D in
 * the substituted map so the engineer sees which duration governs.
 *
 * Strict three-state contract:
 *   - All 6 scalars present + ≥1 complete table row + matching unit → computed
 *   - Empty/incomplete row → manual_required naming the row
 *   - Missing scalar → manual_required naming the symbol
 *   - Table column unit ≠ 'l/(s·ha)' → manual_required (the silent-error
 *     trap; the formula's `10⁻⁴` factor is calibrated to that unit)
 */
const KOSTRA_EXPECTED_UNIT = 'l/(s·ha)';
const GL8_SCALAR_SYMBOLS = ['A_C', 'A_VA', 'Q_S', 'Q_Dr', 'f_Z', 'f_A'] as const;

function isScalarReady(scalars: Gl8Scalars | null | undefined): scalars is Gl8Scalars {
  if (!scalars) return false;
  return GL8_SCALAR_SYMBOLS.every((k) => {
    const v = scalars[k];
    return typeof v === 'number' && Number.isFinite(v);
  });
}

function isKostraRowComplete(r: KostraRow): boolean {
  return (
    typeof r.D_min === 'number' &&
    Number.isFinite(r.D_min) &&
    r.D_min > 0 &&
    typeof r.r_D_n === 'number' &&
    Number.isFinite(r.r_D_n)
  );
}

function kostraRowLabel(r: KostraRow, idx: number): string {
  if (r.label && r.label.trim()) return r.label.trim();
  if (typeof r.D_min === 'number' && Number.isFinite(r.D_min)) {
    return `D = ${r.D_min} min`;
  }
  return `Zeile ${idx + 1}`;
}

const a138_13_gl8: Aggregator = {
  run: (req) => {
    const ctx = req.aggregator ?? {};
    const carrier = ctx.kostraTable;
    const scalars = ctx.gl8Scalars;
    const unit = ctx.kostraUnit;

    // 1. Scalars first — a missing scalar masks everything else.
    if (!isScalarReady(scalars)) {
      const missing = GL8_SCALAR_SYMBOLS.filter((k) => {
        const v = scalars?.[k];
        return !(typeof v === 'number' && Number.isFinite(v));
      });
      return {
        kind: 'manual_required',
        reason: `Fehlende Skalar-Eingaben: ${missing.join(', ')}. Werte werden aus den vorgelagerten Arbeitsblättern (A138-08, A138-10, A138-12) erwartet.`,
        missing: [...missing],
      };
    }

    // 2. Carrier must exist with ≥1 row.
    if (!carrier || !Array.isArray(carrier.rows) || carrier.rows.length === 0) {
      return {
        kind: 'manual_required',
        reason:
          'Keine KOSTRA-Tabelle erfasst. Bitte mindestens eine Dauerstufe D mit zugehöriger Regenspende r_D(n) eingeben.',
      };
    }

    // 3. Unit guard — the silent-error trap.
    if (unit != null && unit !== '' && unit !== KOSTRA_EXPECTED_UNIT) {
      return {
        kind: 'manual_required',
        reason: `Einheiten-Konflikt für r_D(n): erwartet "${KOSTRA_EXPECTED_UNIT}", Tabelle liefert "${unit}". Gl. (8) ist auf l/(s·ha) kalibriert.`,
        unitConflicts: [{ symbol: 'r_D(n)', expected: KOSTRA_EXPECTED_UNIT, actual: unit }],
      };
    }

    // 4. Per-row completeness.
    const incomplete = carrier.rows
      .map((r, i) => ({ r, i, ok: isKostraRowComplete(r) }))
      .filter((x) => !x.ok);
    if (incomplete.length > 0) {
      const which = incomplete.map((x) => kostraRowLabel(x.r, x.i)).join(', ');
      return {
        kind: 'manual_required',
        reason: `Unvollständige KOSTRA-Zeilen: ${which}. Pro Zeile müssen D und r_D(n) gesetzt sein.`,
      };
    }

    // 5. Iterate. Compute V_VA per row, keep the maximum.
    // After isScalarReady() above, every Gl8Scalars entry is a finite number,
    // but TS can't carry that through destructuring — pin them as numbers.
    const A_C = scalars.A_C as number;
    const A_VA = scalars.A_VA as number;
    const Q_S = scalars.Q_S as number;
    const Q_Dr = scalars.Q_Dr as number;
    const f_Z = scalars.f_Z as number;
    const f_A = scalars.f_A as number;
    const substituted: Record<string, number> = {};
    let maxV: number | null = null;
    let governingD: number | null = null;
    for (let i = 0; i < carrier.rows.length; i++) {
      const row = carrier.rows[i];
      const D = row.D_min as number;
      const r_D = row.r_D_n as number;
      const Q_zu = r_D * (A_C + A_VA) * 1e-4;
      const V = (Q_zu - Q_S - Q_Dr) * D * 60 * f_Z * f_A * 1e-3;
      const key = `${kostraRowLabel(row, i)} (r_D=${r_D})`;
      substituted[key] = V;
      if (maxV === null || V > maxV) {
        maxV = V;
        governingD = D;
      }
    }

    if (maxV === null || governingD === null) {
      // Shouldn't happen — incomplete rows are filtered above — but
      // belt-and-braces: never return a bare number that hides a problem.
      return {
        kind: 'manual_required',
        reason: 'Keine vollständige Tabellenzeile auswertbar.',
      };
    }

    substituted['MAX V_VA (m³)'] = maxV;
    substituted['Maßgebende Dauerstufe D (min)'] = governingD;

    return {
      kind: 'computed',
      value: maxV,
      substituted,
      formulaEvaluated:
        'V_VA = max_D [ (r_D(n)·(A_C+A_VA)·10⁻⁴ − Q_S − Q_Dr) · D · 60 · f_Z · f_A · 10⁻³ ]',
    };
  },
};

/**
 * A138-16 Gl. (11) — Flächenversickerung Wasserbilanz (§6.2.2).
 *
 *   (A_C + A_S) · r_D(n) · 10⁻⁷ = A_S · k_i
 *
 * This is the source's identity that Gl. (12) is derived from. The DB
 * row's output_symbol is "(balance)" — it's a check, not a producing
 * equation. The aggregator:
 *   - reads A_C, A_S, r_D_n, k_i scalar inputs from the form fields,
 *   - computes LHS = (A_C + A_S) · r_D_n · 10⁻⁷,
 *   - computes RHS = A_S · k_i,
 *   - returns `computed` with value = LHS − RHS when |residual| is small
 *     relative to max(|LHS|, |RHS|, ε), else `manual_required`.
 *
 * Tolerance: relative 1 % (engineering rounding plus small data-entry
 * imprecision). Anything bigger means the engineer's A_S choice doesn't
 * satisfy the source's balance.
 */
const BALANCE_TOL_REL = 0.01;
const GL11_INPUT_SYMBOLS = ['A_C', 'A_S', 'r_D_n', 'k_i'] as const;

const a138_16_gl11_balance: Aggregator = {
  run: (req) => {
    const inputs = new Map(req.inputs.map((i) => [i.symbol, i]));
    const missing: string[] = [];
    const vals: Record<string, number> = {};
    for (const sym of GL11_INPUT_SYMBOLS) {
      const found = inputs.get(sym);
      if (!found || found.value === null || !Number.isFinite(found.value)) {
        missing.push(sym);
        continue;
      }
      vals[sym] = found.value;
    }
    if (missing.length > 0) {
      return {
        kind: 'manual_required',
        reason: `Fehlende Eingaben für Bilanzprüfung: ${missing.join(', ')}.`,
        missing,
      };
    }

    const { A_C, A_S, r_D_n, k_i } = vals;
    const LHS = (A_C + A_S) * r_D_n * 1e-7;
    const RHS = A_S * k_i;
    const residual = LHS - RHS;
    const scale = Math.max(Math.abs(LHS), Math.abs(RHS), 1e-12);
    const relErr = Math.abs(residual) / scale;

    const substituted: Record<string, number> = {
      'LHS = (A_C + A_S) · r_D(n) · 10⁻⁷': LHS,
      'RHS = A_S · k_i': RHS,
      'Residuum LHS − RHS': residual,
      'rel. Abweichung': relErr,
    };

    if (relErr > BALANCE_TOL_REL) {
      return {
        kind: 'manual_required',
        reason: `Bilanz weicht zu stark ab (rel. Abweichung ${(relErr * 100).toFixed(2)} % > 1 %). LHS = ${LHS.toExponential(4)}, RHS = ${RHS.toExponential(4)}. A_S muss aus Gl. (12) bestimmt werden.`,
        unitConflicts: undefined,
      };
    }

    return {
      kind: 'computed',
      value: residual,
      substituted,
      formulaEvaluated:
        '(A_C + A_S) · r_D(n) · 10⁻⁷  −  A_S · k_i   (Residuum, soll ≈ 0)',
    };
  },
};

export const aggregators: Record<string, Aggregator> = {
  // DWA-A 138-1 · A138-10 · Gl. (2)
  '1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3': a138_10_gl2,
  // DWA-A 138-1 · A138-13 · Gl. (8)
  '69f31e6e-a755-4246-af10-ae46668b5c86': a138_13_gl8,
  // DWA-A 138-1 · A138-16 · Gl. (11) Bilanz-Check
  '3b3b2cf6-da4f-43b2-a302-b7c38768d3ff': a138_16_gl11_balance,
};
