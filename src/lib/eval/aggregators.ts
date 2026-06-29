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
import { summarizeSurfaces, type SurfaceInventoryCarrier } from './surface-inventory';
import { iterateGoverningDuration, GOVERNING_PROFILES } from './governing-duration';

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
  /** Cistern volume (m³) the engineer reports on A138-13. Pile-8. Credited
   * toward V_VA only when `zisterne_zwangsentleerung === true` per §6.1
   * L1596. Optional — older projects without cistern entries leave it null
   * and the aggregator falls through to its pre-Pile-8 behaviour. */
  V_Zisterne?: number | null;
  /** Whether the cistern has Zwangsentleerung (forced emptying). §6.1 L1596
   * gate: cistern volume may count toward retention only if true. Optional;
   * null / undefined behaves like false (no credit). */
  zisterne_zwangsentleerung?: boolean | null;
};

/** Flood-event sub-area row. Same shape as SubArea but uses C_S (flood-event
 * runoff coefficient per Tab. 9) instead of design-event C. Kept as a separate
 * type so the engine cannot silently use design-C for flood calcs. */
export type FloodSubArea = {
  id: string;
  label?: string | null;
  kind: 'paved' | 'unpaved';
  area_m2: number | null;
  c_S: number | null;
};

export type FloodSubAreasCarrier = {
  rows: FloodSubArea[];
};

/** Scalars Gl. 10 reads in addition to the flood-sub-area carrier. Origin
 *  worksheets in production: A_VA← A138-10, Q_S← A138-12, Q_Dr← A138-20,
 *  D← A138-04, V_VA← A138-13, r_D_T_n_Ue← A138-26 (own field `r_D_30`). */
export type Gl10Scalars = {
  A_VA: number | null;
  Q_S: number | null;
  Q_Dr: number | null;
  D: number | null;
  V_VA: number | null;
  r_D_T_n_Ue: number | null;
};

export type AggregatorContext = {
  /** Carrier data for the sub-areas aggregator (A138-10 Gl. 2). */
  subAreas?: SubAreasCarrier | null;
  /** Carrier for the A138-07 surface-inventory producers (Gl. 2 + C_m + area totals). */
  surfaceInventory?: SurfaceInventoryCarrier | null;
  /** Carrier data for the KOSTRA-table aggregator (A138-13 Gl. 8). */
  kostraTable?: KostraCarrier | null;
  /** Scalar inputs the Gl. 8 aggregator reads in addition to the table.
   * These come from upstream worksheets via the project's same-symbol
   * inheritance (A_C from A138-10, Q_S from A138-12, f_Z from A138-08…). */
  gl8Scalars?: Gl8Scalars | null;
  /** Engineer-reported unit on the table column (read from the
   * r_D_n_table field's `unit`). Drives the per-row unit guard. */
  kostraUnit?: string | null;
  /** Carrier data for the flood-check aggregator (A138-26 Gl. 10). */
  floodSubAreas?: FloodSubAreasCarrier | null;
  /** Scalar inputs Gl. 10 reads in addition to its sub-area carrier. */
  gl10Scalars?: Gl10Scalars | null;
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
    // Delegate the per-duration iteration to the shared governing-duration
    // engine via the basin profile — the iteration is defined ONCE (Piece 1)
    // and applied per facility, mirroring §6. All rows are complete here
    // (checked above), so perDuration aligns 1:1 with carrier.rows, preserving
    // the exact substituted-map keys + values + governing pick.
    const basinProfile = GOVERNING_PROFILES.find((p) => p.facility === 'A138-13')!;
    const scalarBag = { A_C, A_VA, Q_S, Q_Dr, f_Z, f_A };
    const governing = iterateGoverningDuration(
      carrier.rows,
      (D, r_D) => basinProfile.sizing(D, r_D, scalarBag),
    );
    governing.perDuration.forEach((p, i) => {
      const row = carrier.rows[i];
      substituted[`${kostraRowLabel(row, i)} (r_D=${p.r_D})`] = p.value;
    });
    const maxV: number | null = governing.governingValue;
    const governingD: number | null = governing.governingD;

    if (maxV === null || governingD === null) {
      // Shouldn't happen — incomplete rows are filtered above — but
      // belt-and-braces: never return a bare number that hides a problem.
      return {
        kind: 'manual_required',
        reason: 'Keine vollständige Tabellenzeile auswertbar.',
      };
    }

    substituted['MAX V_VA brutto (m³)'] = maxV;
    substituted['Maßgebende Dauerstufe D (min)'] = governingD;

    // 6. §6.1 L1596 cistern-credit branch (Pile-8).
    // Cistern volume may reduce V_VA only when Zwangsentleerung is
    // present. Without it the source forbids crediting — the cistern
    // volume must NOT lower the required infiltration storage.
    // Backwards-compatible: missing V_Zisterne or missing flag → no
    // credit, behaviour identical to pre-Pile-8.
    const V_Zisterne_raw = scalars.V_Zisterne;
    const hasCisternVolume =
      typeof V_Zisterne_raw === 'number' &&
      Number.isFinite(V_Zisterne_raw) &&
      V_Zisterne_raw > 0;
    const zwangsentleerung = scalars.zisterne_zwangsentleerung === true;
    let V_VA_net = maxV;
    if (hasCisternVolume) {
      // Expose the engineer's reported volume regardless of whether it gets
      // credited — keeps the audit trail visible in the substituted map.
      substituted['V_Zisterne (m³, gemeldet)'] = V_Zisterne_raw as number;
      if (zwangsentleerung) {
        const credit = V_Zisterne_raw as number;
        V_VA_net = Math.max(0, maxV - credit);
        substituted['Zisternen-Anrechnung (m³, Zwangsentleerung ✓)'] = -credit;
      } else {
        // Flag false or missing → §6.1 prohibits crediting.
        substituted['Zisternen-Anrechnung (m³, Zwangsentleerung ✗)'] = 0;
      }
    }
    substituted['V_VA netto (m³)'] = V_VA_net;

    return {
      kind: 'computed',
      value: V_VA_net,
      substituted,
      formulaEvaluated:
        'V_VA = max_D [ (r_D(n)·(A_C+A_VA)·10⁻⁴ − Q_S − Q_Dr) · D · 60 · f_Z · f_A · 10⁻³ ]'
        + (hasCisternVolume
          ? (zwangsentleerung
            ? '   −  V_Zisterne   (§6.1 L1596: Zwangsentleerung vorhanden)'
            : '   (V_Zisterne nicht angerechnet — §6.1 L1596)')
          : ''),
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

/**
 * Generic ≥-condition aggregator: computes LHS and RHS from the given input
 * map (after symbol normalisation by the engine) and returns the slack
 * (LHS − RHS). Positive slack → condition holds; negative → fails. Result
 * is `computed` so the engineer sees the numeric margin. Missing inputs →
 * manual_required.
 */
function makeConditionAggregator(
  lhsLabel: string,
  rhsLabel: string,
  inputSymbols: readonly string[],
  evalLhs: (vals: Record<string, number>) => number,
  evalRhs: (vals: Record<string, number>) => number,
  notesOnReason: string,
): Aggregator {
  return {
    run: (req) => {
      const inputs = new Map(req.inputs.map((i) => [i.symbol, i]));
      const missing: string[] = [];
      const vals: Record<string, number> = {};
      for (const sym of inputSymbols) {
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
          reason: `Fehlende Eingaben für Bedingungsprüfung: ${missing.join(', ')}.`,
          missing,
        };
      }
      const LHS = evalLhs(vals);
      const RHS = evalRhs(vals);
      const slack = LHS - RHS;
      const substituted: Record<string, number> = {
        [lhsLabel]: LHS,
        [rhsLabel]: RHS,
        'Slack LHS − RHS': slack,
      };
      return {
        kind: 'computed',
        value: slack,
        substituted,
        formulaEvaluated: `${lhsLabel}  −  ${rhsLabel}   (${notesOnReason})`,
      };
    },
  };
}

// A138-18 · Gl. (25) · §6.4.2 — L_VS · q_VS ≥ r_5(n) · A_C · 10⁻⁴
const a138_18_gl25_condition = makeConditionAggregator(
  'L_VS · q_VS',
  'r_5(n) · A_C · 10⁻⁴',
  ['L_VS', 'q_VS', 'r_5_n', 'A_C'] as const,
  (v) => v.L_VS * v.q_VS,
  (v) => v.r_5_n * v.A_C * 1e-4,
  'positiv = hydraulische Leistung der Vollsickerrohre ausreichend',
);

// A138-21 · Gl. (38) · §6.7.2 — A_S,FS · k_f,FS ≥ A_S,Schacht · k_i
const a138_21_gl38_condition = makeConditionAggregator(
  'A_S,FS · k_f,FS',
  'A_S,Schacht · k_i',
  ['A_S_FS', 'k_f_FS', 'A_S_Schacht', 'k_i'] as const,
  (v) => v.A_S_FS * v.k_f_FS,
  (v) => v.A_S_Schacht * v.k_i,
  'positiv = Filterleistung ≥ Schacht-Versickerungsleistung',
);

/**
 * A138-26 Gl. (10) — V_Rück flood-check (§5.3.4)
 *
 *   V_Rück = ((r_D(T_n,Ü) · (Σ(A_E,b,a · C_S) + A_VA) / 10000)
 *            − (Q_S + Q_Dr)) · D · 60 / 1000  −  V_VA   ≥ 0
 *
 * Aggregator reads the flood-sub-area carrier (per-row area + flood-event
 * C_S — strictly different from the design-event C in the Gl. 2 carrier)
 * plus 6 scalars. Returns `computed` with V_Rück value: positive →
 * additional flood retention required; ≤ 0 → flood check passes.
 *
 * Fail-loud rules:
 *  - Missing scalar → manual_required naming it.
 *  - Carrier empty / no rows → manual_required (engineer must declare the
 *    flood sub-areas explicitly; cannot silently fall back to design-C
 *    from sub_areas_A138_10).
 *  - Incomplete row (area or c_S missing) → manual_required naming it.
 *  - Unit on r_D_30 field ≠ l/(s·ha) → manual_required.
 */
const GL10_SCALAR_SYMBOLS = [
  'A_VA', 'Q_S', 'Q_Dr', 'D', 'V_VA', 'r_D_T_n_Ue',
] as const;
const GL10_R_D_EXPECTED_UNIT = 'l/(s·ha)';

function isFloodRowComplete(r: FloodSubArea): boolean {
  return (
    typeof r.area_m2 === 'number' &&
    Number.isFinite(r.area_m2) &&
    typeof r.c_S === 'number' &&
    Number.isFinite(r.c_S)
  );
}

function floodRowLabel(r: FloodSubArea, idx: number): string {
  return r.label && r.label.trim() ? r.label.trim() : `Zeile ${idx + 1}`;
}

const a138_26_gl10: Aggregator = {
  run: (req) => {
    const ctx = req.aggregator ?? {};
    const carrier = ctx.floodSubAreas;
    const scalars = ctx.gl10Scalars;
    const rD_unit = ctx.kostraUnit; // re-used for r_D_30 unit guard

    // 1. Scalars first.
    if (
      !scalars ||
      !GL10_SCALAR_SYMBOLS.every(
        (k) => typeof scalars[k] === 'number' && Number.isFinite(scalars[k] as number),
      )
    ) {
      const missing = GL10_SCALAR_SYMBOLS.filter(
        (k) => !(typeof scalars?.[k] === 'number' && Number.isFinite(scalars[k] as number)),
      );
      return {
        kind: 'manual_required',
        reason: `Fehlende Skalar-Eingaben für Gl. (10) Flood-Check: ${missing.join(', ')}.`,
        missing: [...missing],
      };
    }

    // 2. Carrier.
    if (!carrier || !Array.isArray(carrier.rows) || carrier.rows.length === 0) {
      return {
        kind: 'manual_required',
        reason:
          'Keine Flut-Teilflächen erfasst. Mindestens eine Zeile mit Fläche und Flood-Abflussbeiwert C_S (per Tab. 9 Flood-Spalte) eingeben.',
      };
    }

    // 3. r_D unit guard (the silent-error trap — Gl. 10 calibrated on l/(s·ha)).
    if (rD_unit != null && rD_unit !== '' && rD_unit !== GL10_R_D_EXPECTED_UNIT) {
      return {
        kind: 'manual_required',
        reason: `Einheiten-Konflikt für r_D(T_n,Ü): erwartet "${GL10_R_D_EXPECTED_UNIT}", geliefert "${rD_unit}".`,
        unitConflicts: [
          { symbol: 'r_D(T_n,Ü)', expected: GL10_R_D_EXPECTED_UNIT, actual: rD_unit },
        ],
      };
    }

    // 4. Per-row completeness.
    const incomplete = carrier.rows
      .map((r, i) => ({ r, i, ok: isFloodRowComplete(r) }))
      .filter((x) => !x.ok);
    if (incomplete.length > 0) {
      const which = incomplete.map((x) => floodRowLabel(x.r, x.i)).join(', ');
      return {
        kind: 'manual_required',
        reason: `Unvollständige Flut-Zeilen: ${which}. Pro Zeile sind area_m2 und C_S Pflicht.`,
      };
    }

    // 5. Compute.
    const A_VA = scalars.A_VA as number;
    const Q_S = scalars.Q_S as number;
    const Q_Dr = scalars.Q_Dr as number;
    const D = scalars.D as number;
    const V_VA = scalars.V_VA as number;
    const r_D = scalars.r_D_T_n_Ue as number;

    const substituted: Record<string, number> = {};
    let sum_A_C_S = 0;
    for (let i = 0; i < carrier.rows.length; i++) {
      const row = carrier.rows[i];
      const contribution = (row.area_m2 as number) * (row.c_S as number);
      sum_A_C_S += contribution;
      substituted[`${floodRowLabel(row, i)} (${row.area_m2} · C_S=${row.c_S})`] =
        contribution;
    }
    substituted['Σ A_E,b,a · C_S (m²)'] = sum_A_C_S;

    const inflow_l_per_s = (r_D * (sum_A_C_S + A_VA)) / 10000; // l/s
    const net_l_per_s = inflow_l_per_s - (Q_S + Q_Dr); // l/s
    const inflow_volume_m3 = (net_l_per_s * D * 60) / 1000; // m³
    const V_Rueck = inflow_volume_m3 - V_VA; // m³

    substituted['Zufluss r_D·(Σ+A_VA)/10⁴ (l/s)'] = inflow_l_per_s;
    substituted['Netto (l/s)'] = net_l_per_s;
    substituted['Flutvolumen (m³)'] = inflow_volume_m3;
    substituted['V_VA (m³)'] = V_VA;
    substituted['V_Rück = Volumen − V_VA (m³)'] = V_Rueck;

    return {
      kind: 'computed',
      value: V_Rueck,
      substituted,
      formulaEvaluated:
        'V_Rück = ((r_D(T_n,Ü)·(Σ(A_E,b,a·C_S)+A_VA)/10000) − (Q_S+Q_Dr))·D·60/1000  −  V_VA   (≥ 0 = Flutnachweis bestanden)',
    };
  },
};

/** A138-07 producers: each reads the surface_inventory carrier and returns one
 * scalar from the shared summarizeSurfaces(). manual_required when no complete
 * row exists, so downstream blanks with a cause rather than showing 0. */
function makeSurfaceAggregator(
  pick: (s: ReturnType<typeof summarizeSurfaces>) => number | null,
  formulaEvaluated: string,
): Aggregator {
  return {
    run: (req) => {
      const carrier = req.aggregator?.surfaceInventory;
      if (!carrier || !Array.isArray(carrier.rows) || carrier.rows.length === 0) {
        return { kind: 'manual_required', reason: 'Keine Flächen im Flächenverzeichnis (A138-07) erfasst.' };
      }
      const sum = summarizeSurfaces(carrier);
      if (sum.complete === 0) {
        return { kind: 'manual_required', reason: `Keine vollständigen Flächen-Zeilen (0/${sum.total}). Oberflächentyp, Fläche und C_i je Zeile erforderlich.` };
      }
      const value = pick(sum);
      if (value == null || !Number.isFinite(value)) {
        return { kind: 'manual_required', reason: 'Wert nicht berechenbar (Σ Fläche = 0).' };
      }
      const substituted: Record<string, number> = {
        'Σ befestigt': sum.A_C_sealed ?? 0,
        'Σ unbefestigt': sum.A_C_unsealed ?? 0,
        'Σ A·C_i': sum.A_C ?? 0,
      };
      return { kind: 'computed', value, substituted, formulaEvaluated };
    },
  };
}

const a138_07_A_C = makeSurfaceAggregator((s) => s.A_C, 'A_C = Σ(A_E,i · C_i)   (Flächenverzeichnis, Tab. 9)');
const a138_07_C_m = makeSurfaceAggregator((s) => s.C_m, 'C_m = A_C / Σ A_E,i');
const a138_07_A_E_ba = makeSurfaceAggregator((s) => s.A_E_ba, 'A_E,b,a = Σ A_E,i (befestigt)');
const a138_07_A_E_nba = makeSurfaceAggregator((s) => s.A_E_nba, 'A_E,nb,a = Σ A_E,i (unbefestigt)');
const a138_07_A_C_sealed = makeSurfaceAggregator((s) => s.A_C_sealed, 'A_C,b = Σ(A_E,b,a,i · C_i)   (reduzierte Fläche, befestigt)');
const a138_07_A_C_unsealed = makeSurfaceAggregator((s) => s.A_C_unsealed, 'A_C,nb = Σ(A_E,nb,a,i · C_i)   (reduzierte Fläche, unbefestigt)');

export const aggregators: Record<string, Aggregator> = {
  // DWA-A 138-1 · A138-07 · Gl. (2) A_C producer (surface_inventory)
  'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0': a138_07_A_C,
  // DWA-A 138-1 · A138-07 · Gl. (2c) C_m producer
  'a1380702-0000-4000-8000-000000000002': a138_07_C_m,
  // DWA-A 138-1 · A138-07 · Gl. (2d) A_E_ba producer
  'a1380702-0000-4000-8000-000000000003': a138_07_A_E_ba,
  // DWA-A 138-1 · A138-07 · Gl. (2e) A_E_nba producer
  'a1380702-0000-4000-8000-000000000004': a138_07_A_E_nba,
  // DWA-A 138-1 · A138-07 · Gl. (2f) A_C_sealed producer (reduced area, befestigt)
  'a1380702-0000-4000-8000-000000000005': a138_07_A_C_sealed,
  // DWA-A 138-1 · A138-07 · Gl. (2g) A_C_unsealed producer (reduced area, unbefestigt)
  'a1380702-0000-4000-8000-000000000006': a138_07_A_C_unsealed,
  // DWA-A 138-1 · A138-13 · Gl. (8)
  '69f31e6e-a755-4246-af10-ae46668b5c86': a138_13_gl8,
  // DWA-A 138-1 · A138-16 · Gl. (11) Bilanz-Check
  '3b3b2cf6-da4f-43b2-a302-b7c38768d3ff': a138_16_gl11_balance,
  // DWA-A 138-1 · A138-18 · Gl. (25) ≥-condition
  '86cdef5c-4199-4de6-ad0d-e2248b0834c9': a138_18_gl25_condition,
  // DWA-A 138-1 · A138-21 · Gl. (38) ≥-condition
  '19f36c1e-9b20-43cd-8b09-6040e81598c2': a138_21_gl38_condition,
  // DWA-A 138-1 · A138-26 · Gl. (10) V_Rück flood-check
  '8e3c7e22-e3c7-449a-b267-928332c89306': a138_26_gl10,
};
