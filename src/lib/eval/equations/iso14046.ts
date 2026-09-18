/**
 * ISO-14046 — Plan 3 Task 26 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts iso14046` (NEW equation rows
 * only; `ON CONFLICT DO NOTHING`). Every `verification_quote` is a span of the
 * Spanish transcript (`regulation-tables-quotes-iso14046.ts`, line range in the
 * name).
 *
 * Single-source: no row here outputs a symbol prod already produces — EQ-01
 * (`category_indicator_result = SUM(lci_result * characterization_factor)`, -04,
 * verified_via_cross_reference) keeps its row on the scalars; the register
 * `lci_cf_rows` carries the SAME product per row as a `derived` column and the
 * worksheet-level Σ of all contributions is `category_indicator_total` (a different
 * quantity — the per-category sum by engineer-typed name is not expressible without
 * a grouped aggregate → iso14046-F-1; "EQ-01 onto rows" is STAGED iso14046-R-1).
 * Every row below is register-fed on the register's worksheet (m277e trap 2) and
 * materialises on save. Figures inside formulas: only the printed "tres" of §7.4
 * (L1030 "al menos tres miembros" → `>= 3`, controller resolution 7) and the
 * structural 1 / 0 verdict.
 *
 * Empty-register behaviour (pinned): `count_rows` reads 0 (computed); a Σ over
 * `if(direction == 'input', quantity_m3, 0)` on an EMPTY register is
 * `manual_required` ("Keine vollständigen Zeilen") — never a phantom 0; the
 * per-type Σ likewise; `panel_min_members_ok` reads 0 on an empty register (never
 * a phantom pass).
 *
 * NOT emitted (STAGED in scripts/verification/iso14046-STAGED-plan3-rulings.sql):
 *   - the brief's -02 D1 `data_quality_complete_code` / -06 D1
 *     `third_party_report_complete_code` (`contains()` over the two checklists) —
 *     no engine path passes json checklist carriers to `contains()` (din14021-F-1 /
 *     iso46001-F-2 precedent) → iso14046-F-2, intended formulas recorded there;
 *   - per-category indicator results (`sum_rows(lci_cf_rows, if(category == '<name>', …))`
 *     over engineer-typed names) → iso14046-F-1;
 *   - the inheritance of the created outputs into -04 / -05 / -06 → iso14046-C-1 / C-2.
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { Q } from '../regulation-tables-quotes-iso14046';
import { RESOURCE_TYPES } from '../field-configs/iso14046';

const STD = 'ISO-14046';

/** §7.4 L1030 "al menos tres miembros" — the printed minimum panel size (asserted inside the span by the test). */
export const PANEL_MIN_MEMBERS = 3;

export const EQUATIONS: EquationEntry[] = [
  {
    standard: STD, worksheet: 'ISO-14046-03', equation_number: 'ISO-14046-03-D1',
    formula: "water_input_total = sum_rows(elementary_flows, if(direction == 'input', quantity_m3, 0))",
    input_symbols: ['elementary_flows'], output_symbol: 'water_input_total', output_unit: 'm³',
    clause_reference: '§5.3.2 a)',
    description: 'Plan 3: Σ der Mengen aller Eingangszeilen des Registers elementary_flows (5.3.2 a) „cantidades de agua utilizada: masa, o volumen (por ejemplo entradas de agua y salidas de agua)“); Ausgangszeilen tragen 0 bei; ein leeres Register ist manual_required (keine vollständigen Zeilen), nie eine Phantom-0.',
    verification_quote: Q.L650,
  },
  {
    standard: STD, worksheet: 'ISO-14046-03', equation_number: 'ISO-14046-03-D2',
    formula: "water_output_total = sum_rows(elementary_flows, if(direction == 'output', quantity_m3, 0))",
    input_symbols: ['elementary_flows'], output_symbol: 'water_output_total', output_unit: 'm³',
    clause_reference: '§5.3.2 a)',
    description: 'Plan 3: Σ der Mengen aller Ausgangszeilen des Registers elementary_flows (5.3.2 a) „salidas de agua“); Eingangszeilen tragen 0 bei.',
    verification_quote: Q.L650,
  },
  {
    standard: STD, worksheet: 'ISO-14046-03', equation_number: 'ISO-14046-03-D3',
    formula: "water_balance_diff = sum_rows(elementary_flows, if(direction == 'input', quantity_m3, 0)) - sum_rows(elementary_flows, if(direction == 'output', quantity_m3, 0))",
    input_symbols: ['elementary_flows'], output_symbol: 'water_balance_diff', output_unit: 'm³',
    clause_reference: '§5.3.2',
    description: 'Plan 3: Bilanzdifferenz Σ Eingänge − Σ Ausgänge (inline wiederholt — nie auf D1 / D2 verkettet, Task 16 trap 2); eine Differenz ≠ 0 ist die „discrepancia en el balance del inventario“, die nach 5.3.2 zu erläutern ist (inventory_balance_explained bleibt die Bestätigung).',
    verification_quote: Q.L647,
  },
  {
    standard: STD, worksheet: 'ISO-14046-03', equation_number: 'ISO-14046-03-D4',
    formula: 'elementary_flow_count = count_rows(elementary_flows)',
    input_symbols: ['elementary_flows'], output_symbol: 'elementary_flow_count', output_unit: null,
    clause_reference: '§5.3.2',
    description: 'Plan 3: Anzahl der vollständigen Zeilen des Registers elementary_flows („El inventario de la huella de agua debe incluir entradas y salidas para cada proceso unitario“); leeres Register ⇒ 0 (berechnet); Grundlage des STAGED Gate-Vorschlags zu REQ-10 (iso14046-G-9).',
    verification_quote: Q.L647,
  },
  ...RESOURCE_TYPES.map((t, i): EquationEntry => ({
    standard: STD, worksheet: 'ISO-14046-03', equation_number: `ISO-14046-03-D${5 + i}`,
    formula: `water_input_${t.value} = sum_rows(elementary_flows, if(direction == 'input' AND resource_type == '${t.value}', quantity_m3, 0))`,
    input_symbols: ['elementary_flows'], output_symbol: `water_input_${t.value}`, output_unit: 'm³',
    clause_reference: '§5.3.2 a), b)',
    description: `Plan 3: Σ der Eingangsmengen des Wasserressourcentyps ${t.value} (5.3.2 b) — der prod-Token von flow_water_resource_type, die gedruckte Liste L652–L657); andere Zeilen tragen 0 bei; die Inventarphase aggregiert nicht über Typen (L675), daher eine Summe je Typ.`,
    verification_quote: Q.L651_657,
  })),
  {
    standard: STD, worksheet: 'ISO-14046-04', equation_number: 'ISO-14046-04-D1',
    formula: 'category_indicator_total = sum_rows(lci_cf_rows, contribution)',
    input_symbols: ['lci_cf_rows'], output_symbol: 'category_indicator_total', output_unit: null,
    clause_reference: '§5.4.4.1, §3.3.14',
    description: 'Plan 3: Σ der Beiträge (Sachbilanzergebnis × Charakterisierungsfaktor je Zeile — die gedruckte Definition 3.3.14) über alle Zeilen des Registers lci_cf_rows; NICHT das Indikatorergebnis einer einzelnen Kategorie (Summe je frei eingetippter Kategorie: iso14046-F-1). Prod EQ-01 auf den Einzelfeldern bleibt unverändert (iso14046-R-1); ein leeres Register ist manual_required.',
    verification_quote: `${Q.L325} — ${Q.L785}`,
  },
  {
    standard: STD, worksheet: 'ISO-14046-05', equation_number: 'ISO-14046-05-D1',
    formula: 'significant_issues_count = count_rows(significant_issues_14046)',
    input_symbols: ['significant_issues_14046'], output_symbol: 'significant_issues_count', output_unit: null,
    clause_reference: '§5.5 a)',
    description: 'Plan 3: Anzahl der erfassten signifikanten Themen (5.5 a)); leeres Register ⇒ 0; Grundlage des STAGED Gate-Vorschlags zu REQ-16 (iso14046-G-11).',
    verification_quote: Q.L851,
  },
  {
    standard: STD, worksheet: 'ISO-14046-07', equation_number: 'ISO-14046-07-D1',
    formula: 'review_panel_members_calc = count_rows(review_panel)',
    input_symbols: ['review_panel'], output_symbol: 'review_panel_members_calc', output_unit: null,
    clause_reference: '§7.4',
    description: 'Plan 3: Anzahl der Mitglieder des Prüfungsausschusses (vollständige Zeilen von review_panel); Zwilling des Zahlenfelds review_panel_members (iso14046-D-22); leeres Register ⇒ 0.',
    verification_quote: Q.L1030,
  },
  {
    standard: STD, worksheet: 'ISO-14046-07', equation_number: 'ISO-14046-07-D2',
    formula: 'panel_chair_independent = count_rows(review_panel, chair == true AND independent == true)',
    input_symbols: ['review_panel'], output_symbol: 'panel_chair_independent', output_unit: null,
    clause_reference: '§7.4',
    description: 'Plan 3: Anzahl der Zeilen mit Vorsitz UND Unabhängigkeit („un experto externo independiente para presidir un panel de revisión“); 0 = kein unabhängiger Vorsitz erfasst (unangekreuzte Kästchen zählen als false).',
    verification_quote: Q.L1030,
  },
  {
    standard: STD, worksheet: 'ISO-14046-07', equation_number: 'ISO-14046-07-D3',
    formula: `panel_min_members_ok = if(count_rows(review_panel) >= ${PANEL_MIN_MEMBERS}, 1, 0)`,
    input_symbols: ['review_panel'], output_symbol: 'panel_min_members_ok', output_unit: null,
    clause_reference: '§7.4',
    description: 'Plan 3: 1, wenn der Ausschuss mindestens drei Mitglieder hat („constituido por al menos tres miembros“ — die 3 ist die gedruckte „tres“), sonst 0; leeres Register ⇒ 0 (nie ein Phantom-Pass). Gate STAGED (iso14046-G-3; das Modalverb ist „debería“ → warn vorgeschlagen).',
    verification_quote: Q.L1030,
  },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
