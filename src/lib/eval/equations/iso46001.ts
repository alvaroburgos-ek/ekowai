/**
 * ISO-46001 — Plan 3 Task 22 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts iso46001` (NEW equation rows
 * only; `ON CONFLICT DO NOTHING`). Every `verification_quote` is a span of the
 * raw plain-text transcript (`regulation-tables-quotes-iso46001.ts`, line
 * range in the name; VC grade).
 *
 * Single-source: no row here outputs a symbol prod already produces — the four
 * prod equations C.1 (Win), C.2b (Wout), C.3 (plant_recycling_rate) and C.5
 * (process_recycling_rate) keep their verified rows over the fixed WD / R1 … R3
 * / O1 … O4 / Rp / Rnp / Wp / Rpp slots; the register `water_streams` (one row
 * per metered stream, a ROLE per row) feeds the `_calc` TWINS below with the
 * SAME printed forms (Formula (C.2) as Σ over the input / output roles, (C.3)
 * and (C.5) as printed, "× 100 %" lifted). Twins are allowed because every
 * prod output they mirror is consumed (-09 / -04 / -05) and gate-bearing
 * (CR-037 / CR-038) — amendment J; their retirement + re-point is iso46001-R-1.
 * Every aggregate is INLINED over the register (never chained on another new
 * output — the save-path materialiser would lag one save, m1200_2 trap 2).
 * The ONE scalar equation (-04-D1) binds the §3.33 definition to the EXISTING
 * -04 inputs `past_present_water_use` / `business_activity_indicator_value`
 * (amendment K (3)); it is scalar-only and not server-materialised (noted once
 * in the report). No figure is typed into a formula except the printed
 * "× 100 %" of (C.3) / (C.5).
 *
 * NOT emitted (STAGED in scripts/verification/iso46001-STAGED-plan3-rulings.sql):
 *   - per-symbol Σ twins of WD / R / O / Rp / Rnp / Wp / Rpp (a second producer
 *     of a typed input — amendment K: bind, D-block per pair);
 *   - the per-row share of a significant use (m3_per_a / seu_total — a Σ of the
 *     own register is not addressable from a row expression, iso46001-F-1);
 *   - a completeness code over the §9.1 checklist (the materialiser passes no
 *     checklist carriers to `contains()`, iso46001-F-2 / G-3).
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { Q } from '../regulation-tables-quotes-iso46001';

const STD = 'ISO-46001';
type Spec = { n: string; out: string; rhs: string; unit: string | null; clause: string; what: string; quote: string };
const rows = (ws: string, inputs: string[], specs: Spec[]): EquationEntry[] =>
  specs.map((s) => ({
    standard: STD, worksheet: ws, equation_number: `${ws}-${s.n}`,
    formula: `${s.out} = ${s.rhs}`, input_symbols: inputs, output_symbol: s.out, output_unit: s.unit,
    clause_reference: s.clause, description: `Plan 3: ${s.what}`, verification_quote: s.quote,
  }));

/** Σ of the register volumes for one Annex-C role (quoted literal — never a symbol; the prod symbols WD / Rp … are upper-case). */
const roleSum = (role: string) => `sum_rows(water_streams, if(role == '${role}', volume_m3, 0))`;
/** Formula (C.2) LHS: WD + R1 + R2 + R3 — every INPUT role. */
export const WIN_EXPR = "sum_rows(water_streams, if(role IN {'wd', 'r_other_source'}, volume_m3, 0))";
/** Formula (C.2) RHS: O1 + O2 + O3 + O4. */
export const WOUT_EXPR = roleSum('output');
/** Formula (C.3) as printed: (Rp + Rnp) / (Rp + Rnp + WD) × 100 %. */
export const PLANT_RATE_EXPR = `(${roleSum('rp')} + ${roleSum('rnp')}) / (${roleSum('rp')} + ${roleSum('rnp')} + ${roleSum('wd')}) * 100`;
/** Formula (C.5) as printed: Rp / (Wp + Rpp) × 100 %. */
export const PROCESS_RATE_EXPR = `${roleSum('rp')} / (${roleSum('wp')} + ${roleSum('rpp')}) * 100`;
/** Annex C i): "the recycling rate if recycling is carried out" — the rows that enter (C.3) / (C.5). */
export const RECYCLING_ROWS = "role IN {'rp', 'rnp', 'wp', 'rpp'}";

export const EQUATIONS: EquationEntry[] = [
  // ---- ISO-46001-01: interested parties (§4.2) ----
  ...rows('ISO-46001-01', ['interested_parties_46001'], [
    { n: 'D1', out: 'interested_parties_count', rhs: 'count_rows(interested_parties_46001)', unit: null, clause: '§4.2', what: 'Anzahl der erfassten interessierten Parteien („the interested parties that are relevant to the water efficiency management system“).', quote: Q.L428 },
  ]),

  // ---- ISO-46001-03: objectives (§6.2.1), legal / other requirements (§6.2.3) ----
  ...rows('ISO-46001-03', ['objectives'], [
    { n: 'D1', out: 'objectives_count', rhs: 'count_rows(objectives)', unit: null, clause: '§6.2.1', what: 'Anzahl der erfassten Wassereffizienz-Ziele („establish water efficiency objectives at relevant functions and levels“); Attestierungen CR-009 / CR-010 → iso46001-G-5.', quote: Q.L492 },
  ]),
  ...rows('ISO-46001-03', ['legal_requirements'], [
    { n: 'D2', out: 'legal_requirements_count', rhs: 'count_rows(legal_requirements)', unit: null, clause: '§6.2.3', what: 'Anzahl der erfassten rechtlichen / anderen Anforderungen („reviewed at defined intervals“).', quote: Q.L512_513 },
  ]),

  // ---- ISO-46001-04: water efficiency indicator (§3.33), significant uses (§6.2.4 2)), sources, indicators ----
  ...rows('ISO-46001-04', ['past_present_water_use', 'business_activity_indicator_value'], [
    { n: 'D1', out: 'water_efficiency_indicator_calc', rhs: 'past_present_water_use / business_activity_indicator_value', unit: null, clause: '§3.33, §6.2.6', what: 'Wassereffizienz-Indikator = „amount of water used per unit of business activity indicator“ aus den vorhandenen -04-Eingaben (Wassernutzung im Datenzeitraum / Wert des Geschäftsaktivitäts-Indikators); Zwilling des Eingabefelds water_efficiency_indicator (an -05 / -09 vererbt, CR-017) — Umstellung STAGED (iso46001-D-29 / G-6); past_present_water_use ≡ Win ist iso46001-X-2. Skalar (nicht serverseitig materialisiert).', quote: Q.L393_394 },
  ]),
  ...rows('ISO-46001-04', ['significant_uses'], [
    { n: 'D2', out: 'seu_total', rhs: 'sum_rows(significant_uses, m3_per_a)', unit: 'm³/a', clause: '§6.2.4 2)', what: 'Σ der jährlichen Wassernutzung aller erfassten signifikanten Nutzungen.', quote: Q.L515_527 },
    { n: 'D3', out: 'seu_share_max', rhs: 'max_rows(significant_uses, m3_per_a) * 100 / sum_rows(significant_uses, m3_per_a)', unit: '%', clause: '§6.2.4 2), §3.28', what: 'größter Anteil einer signifikanten Nutzung an der Summe („activity accounting for a substantial portion of total water used“); ein Anteil je Zeile ist in Zeilenscope nicht darstellbar (iso46001-F-1).', quote: Q.L370_371 },
    { n: 'D4', out: 'seu_count', rhs: 'count_rows(significant_uses)', unit: null, clause: '§6.2.4 2)', what: 'Anzahl der erfassten signifikanten Wassernutzungen.', quote: Q.L515_527 },
  ]),
  ...rows('ISO-46001-04', ['water_sources_46001'], [
    { n: 'D5', out: 'water_sources_count', rhs: 'count_rows(water_sources_46001)', unit: null, clause: '§6.2.4 1)', what: 'Anzahl der erfassten aktuellen Wasserquellen („identify current water sources“).', quote: Q.L515_527 },
  ]),
  ...rows('ISO-46001-04', ['indicators_46001'], [
    { n: 'D6', out: 'indicators_count', rhs: 'count_rows(indicators_46001)', unit: null, clause: '§6.2.6', what: 'Anzahl der erfassten Wassereffizienz-Indikatoren.', quote: Q.L548_549 },
  ]),

  // ---- ISO-46001-05: targets (§6.3) ----
  ...rows('ISO-46001-05', ['targets'], [
    { n: 'D1', out: 'targets_count', rhs: 'count_rows(targets)', unit: null, clause: '§6.3', what: 'Anzahl der erfassten Zielwerte (vollständig nur mit Zeitrahmen — „Time frames shall be established for achievement of the targets“).', quote: Q.L559_561 },
  ]),

  // ---- ISO-46001-08: the Annex-C water balance over the stream register ----
  ...rows('ISO-46001-08', ['water_streams'], [
    { n: 'D1', out: 'Win_calc', rhs: WIN_EXPR, unit: 'm³', clause: 'Annex C, Formula (C.1) / (C.2)', what: 'Win = WD + R1 + R2 + R3 als Σ der Zeilen mit Eingangsrolle (wd / r_other_source); Zwilling der geprüften Gleichung C.1 (Win, an -09 vererbt, CR-037) — Umstellung STAGED (iso46001-D-13 / R-1).', quote: Q.L1126_1129 },
    { n: 'D2', out: 'Wout_calc', rhs: WOUT_EXPR, unit: 'm³', clause: 'Annex C, Formula (C.1) / (C.2)', what: 'Wout = O1 + O2 + O3 + O4 als Σ der Zeilen mit Rolle output; Zwilling der geprüften Gleichung C.2b (Wout, an -09 vererbt) — Umstellung STAGED (iso46001-D-14 / R-1).', quote: Q.L1126_1129 },
    { n: 'D3', out: 'leak_indicator', rhs: `${WIN_EXPR} - ${WOUT_EXPR}`, unit: 'm³', clause: 'Annex C, Formula (C.1)', what: 'Win − Wout („Should total water input exceed total water output, the difference could be due to leaks and uncontrolled losses“); inline über das Register (nie über Win_calc / Wout_calc verkettet); CR-037 → iso46001-G-4.', quote: Q.L1106_1114 },
    { n: 'D4', out: 'plant_recycling_rate_calc', rhs: PLANT_RATE_EXPR, unit: '%', clause: 'Annex C, Formula (C.3)', what: 'Anlagen-/Standort-Recyclingrate (Rp + Rnp) / (Rp + Rnp + WD) × 100 % als Σ über die Rollen rp / rnp / wd („looks at all reused/reclaimed streams within the premises“); Zwilling der geprüften Gleichung C.3 — Umstellung STAGED (iso46001-D-15 / R-1 / G-4).', quote: Q.L1144_1150 },
    { n: 'D5', out: 'process_recycling_rate_calc', rhs: PROCESS_RATE_EXPR, unit: '%', clause: 'Annex C, Formula (C.5)', what: 'Prozess-Recyclingrate Rp / (Wp + Rpp) × 100 % als Σ über die Rollen rp / wp / rpp („only looks at reused/reclaimed streams within the process“); Zwilling der geprüften Gleichung C.5 — Umstellung STAGED (iso46001-D-16 / R-1 / G-4).', quote: Q.L1160_1166 },
    { n: 'D6', out: 'water_streams_count', rhs: 'count_rows(water_streams)', unit: null, clause: 'Annex C', what: 'Anzahl der erfassten Ströme / Zähler („it is desirable to measure the amount of water use“); Vorbedingung der STAGED Gates (iso46001-G-4).', quote: Q.L1080 },
    { n: 'D7', out: 'recycling_streams_count', rhs: `count_rows(water_streams, ${RECYCLING_ROWS})`, unit: null, clause: 'Annex C i), Formula (C.3) / (C.5)', what: 'Anzahl der Recyclingströme (Rollen rp / rnp / wp / rpp) — „the recycling rate if recycling is carried out“; IF-Guard von CR-038 (iso46001-G-4).', quote: Q.L1100_1104 },
    { n: 'D8', out: 'meters_unverified', rhs: 'count_rows(water_streams, meter_verified_on IS NULL)', unit: null, clause: 'A.12', what: 'Ströme ohne dokumentierte Zählerprüfung („verification/validation tests are carried out periodically“); CR-039 (leere Bedingung) → iso46001-G-3.', quote: Q.L876 },
  ]),

  // ---- ISO-46001-10: nonconformities (§10.1) ----
  ...rows('ISO-46001-10', ['nonconformities'], [
    { n: 'D1', out: 'nc_count', rhs: 'count_rows(nonconformities)', unit: null, clause: '§10.1', what: 'Anzahl der erfassten Nichtkonformitäten („the nature of the nonconformities and any subsequent actions taken“).', quote: Q.L713 },
    { n: 'D2', out: 'nc_open', rhs: 'count_rows(nonconformities, closed == false)', unit: null, clause: '§10.1', what: 'offene Nichtkonformitäten (closed nicht angekreuzt = offen); Attestierung CR-034 → iso46001-G-5.', quote: Q.L713 },
  ]),
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
