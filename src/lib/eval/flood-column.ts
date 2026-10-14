/**
 * A138-26 Gl. (10) — which KOSTRA column the flood proof iterates (F-A7).
 *
 * DWA-A 138-1 § 5.3.4.1: the flood proof is "in der Regel" run for T_n = 30 a;
 * where the paved areas are e.g. > 70 % roofs / non-floodable areas it is run
 * "für eine Wiederkehrzeit T_n = 100 Jahren nach Gl. (10) für Regenspenden
 * r_D(100) iterativ". The engineer records the chosen period in the A138-26
 * field `T_n_Ue`; this module is the ONE place every verdict surface (live
 * form hook, snapshot/save payload, report/PDF + server recompute evaluator)
 * turns that field into a column of the shared rainfall grid.
 *
 *  - T_n_Ue empty                → T_n = 30 a (the print's default).
 *  - T_n_Ue present in the grid  → that column.
 *  - T_n_Ue absent from the grid → `missing` naming it (never a silent 30).
 *  - T_n_Ue not a positive number → `missing` (no silent default).
 *  - legacy 1D table             → `legacy` (callers keep the typed-scalar path).
 */
import type { KostraCarrier } from './aggregators';
import { resolveColumn, type RainfallTable } from './rainfall-tables';

/** § 5.3.4.1: "in der Regel … T_n = 30 a". Applies only when T_n_Ue is empty. */
export const FLOOD_DEFAULT_T_N_UE = 30;

export type FloodColumnResolution =
  | { status: 'ok'; carrier: KostraCarrier; T_n: number }
  | { status: 'missing'; reason: string }
  | { status: 'legacy' | 'none' };

export function resolveFloodColumn(
  selected: RainfallTable | null | undefined,
  T_n_Ue: number | null | undefined,
): FloodColumnResolution {
  if (!selected) return { status: 'none' };

  const T_n = T_n_Ue == null ? FLOOD_DEFAULT_T_N_UE : T_n_Ue;
  if (!Number.isFinite(T_n) || T_n <= 0) {
    return {
      status: 'missing',
      reason: `Wiederkehrzeit T_n,Ü = ${T_n_Ue} a ist ungültig (Hochwassernachweis Gl. 10) — T_n,Ü als positive Jährlichkeit eintragen (in der Regel 30 a, § 5.3.4.1 ggf. 100 a).`,
    };
  }

  const col = resolveColumn(selected, T_n);
  if (col.status === 'ok') return { status: 'ok', carrier: { rows: col.rows }, T_n };
  if (col.status === 'missing') {
    return {
      status: 'missing',
      reason: `Regenspende r_D für T_n = ${T_n} a nicht in der Niederschlagstabelle erfasst (Hochwassernachweis Gl. 10, T_n,Ü = ${T_n} a) — Spalte T = ${T_n} a in der KOSTRA-Tabelle ergänzen.`,
    };
  }
  return { status: 'legacy' };
}
