/**
 * DIN-14021 — Plan 3 Task 25 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts din14021` (NEW equation rows
 * only; `ON CONFLICT DO NOTHING`). Every `verification_quote` is a span of the
 * bilingual transcript (`regulation-tables-quotes-din14021.ts`, line range in the
 * name; German column).
 *
 * Single-source: no row here outputs a symbol prod already produces — EQ-01
 * (net_recovered_energy_pct), EQ-02 (recycled_content_pct) and EQ-03
 * (reduced_resource_use_pct) keep their rows on the -05 scalars; the register carries
 * the SAME printed formulas per row as `derived` columns (amendment K: the scalar ↔
 * column pairs are D-blocks, never a second scalar equation). The three rows below
 * are register-fed on the register's worksheet (-01) and materialise on save; no
 * figure is typed into a formula (the 1 / 0 verdicts and `> 0` / `== 0` are structural).
 *
 * NOT emitted (STAGED in scripts/verification/din14021-STAGED-plan3-rulings.sql):
 *   - the brief's -06 rows `general_requirements_met_code` / `verification_requirements_met_code`
 *     (`contains()` over the two checklists + the boolean verifiable_without_confidential) and
 *     `compliance_verdict_code` — the materialiser / form / report engines pass no json
 *     checklist carrier to `contains()` and booleans never reach scalar equations
 *     (probed; iso46001-F-2 precedent) → din14021-F-1 ([CODE]), intended formulas recorded there;
 *   - the inheritance of `specific_requirements_met_code` into -06 → din14021-C-1 (a `create`
 *     never sets consumer_worksheets).
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { Q } from '../regulation-tables-quotes-din14021';

const STD = 'DIN-14021';

export const EQUATIONS: EquationEntry[] = [
  {
    standard: STD, worksheet: 'DIN-14021-01', equation_number: 'DIN-14021-01-D1',
    formula: 'claims_count = count_rows(claims)',
    input_symbols: ['claims'], output_symbol: 'claims_count', output_unit: null,
    clause_reference: '§7.1',
    description: 'Plan 3: Anzahl der erfassten Aussagen (vollständige Zeilen des Registers claims — eine Zeile je Aussage; ein Produkt trägt typischerweise mehrere).',
    verification_quote: Q.L1063_1074,
  },
  {
    standard: STD, worksheet: 'DIN-14021-01', equation_number: 'DIN-14021-01-D2',
    formula: 'claims_type_fail = count_rows(claims, type_ok == 0)',
    input_symbols: ['claims'], output_symbol: 'claims_type_fail', output_unit: null,
    clause_reference: '§7.6.3 a), §7.14.2, §7.15.2, §7.16.1, §7.17.3.2, §6.3',
    description: 'Plan 3: Zeilen, deren berechnete Typprüfung nicht besteht — R−E>0 nicht erfüllt oder nicht eingetragen (§7.6.3 a), uneingeschränkte Erneuerbarkeits-Aussage ohne 100 % (§7.14.2 / §7.15.2), uneingeschränkte CO2-neutral- / nachhaltig-Aussage (§7.17.3.2 / §7.16.1), vergleichender Aussagetyp ohne Vergleich (§6.3); leeres Register ⇒ 0. IF-Guards der Gates STAGED (din14021-G-23 … G-27).',
    verification_quote: `${Q.L1297} — ${Q.L1763}`,
  },
  {
    standard: STD, worksheet: 'DIN-14021-01', equation_number: 'DIN-14021-01-D3',
    formula: 'specific_requirements_met_code = if(count_rows(claims) > 0 AND count_rows(claims, type_ok == 0) == 0, 1, 0)',
    input_symbols: ['claims'], output_symbol: 'specific_requirements_met_code', output_unit: null,
    clause_reference: '§7',
    description: 'Plan 3: 1, wenn mindestens eine Aussage erfasst ist und keine Zeile ihre Typprüfung verfehlt (die Zählung ist inline wiederholt — nie auf eine andere neue Ausgabe verkettet), sonst 0; ein leeres Register liest 0 (nie ein Phantom-Pass). Zwilling des Hand-Booleans specific_requirements_met auf DIN-14021-06 (din14021-D-25); Vererbung nach -06 STAGED (din14021-C-1).',
    verification_quote: `${Q.L1059} — ${Q.L1297}`,
  },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
