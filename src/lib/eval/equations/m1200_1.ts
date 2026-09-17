/**
 * DWA-M-1200-1 — Plan 3 Task 5 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts m1200_1` (NEW equation rows
 * only; `ON CONFLICT DO NOTHING`). Every `verification_quote` is a span lifted
 * from the transcript `Desktop\Guidelines\DWA-M-1200-1\DWA-M_1200-1_GD.md`
 * (the `Q_*` constants carry their line ranges). Text-only derivations ship
 * `imported_unverified` and carry the printed sentence they encode (class F).
 *
 * Single-source (checked against the ONE prod equation row read in-session):
 * prod `EQ-001` on M12001-07 is `risikoniveau_ausgangs = lookup(eintrittswahrscheinlichkeit,
 * schadensausmass)` over the SCALAR pair (id 978ac484-…, verified_against_standard).
 * Nothing below outputs `risikoniveau_ausgangs` or any other prod producer; the
 * per-row Tab.-23 lookup lives in the register's `derived` columns and the two
 * max_rows outputs are NEW symbols (EQ-001's scalar inputs are superseded by the
 * rows — m1200_1-R-1 STAGED). No equation is written for a second copy of "the
 * strictest class" over the Flächenverzeichnis rows (M12001-08-D1 is the one
 * registered derivation; the -16 register only displays the class per row).
 *
 * Every output is a CREATED field of the register's own worksheet
 * (field-configs/m1200_1.ts); the register-fed ones are server-materialised,
 * the scalar-only M12001-09-D2 computes on the hook / report / snapshot / PDF
 * paths only (2a design, controller amendment D).
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { Q_L918, Q_L1143, Q_L1145, Q_L1955, Q_T19, Q_L2042, Q_L2061, Q_L2077, Q_L2123, Q_L2465, Q_L2553 } from '../regulation-tables-seed-m1200_1';

const STD = 'DWA-M-1200-1';

export const EQUATIONS: EquationEntry[] = [
  // ---- M12001-08: strictest class over the Tab.-7 crop rows (Tab. 4 note (*)) ----
  {
    standard: STD, worksheet: 'M12001-08', equation_number: 'M12001-08-D1',
    formula: 'gueteklasse_code = min_rows(kulturen_tab7, klasse_rank)',
    input_symbols: ['kulturen_tab7'], output_symbol: 'gueteklasse_code', output_unit: null,
    clause_reference: '§5.2, Tab. 7; Tab. 4 Anm. (*)',
    description: 'Plan 3: strengste Güteklasse über die Kultur-Zeilen = kleinster TAB7_CLASS.rank (1 = A … 6 = D; die Reihenfolge ist die gedruckte Reihenfolge A, B-1, B-2, C-1, C-2, D — m1200_1-J-2); "gelten die Anforderungen der strengsten Kategorie" (L918); Übernahme in gueteklasse_zugeordnet STAGED (m1200_1-D-2).',
    verification_quote: Q_L918,
  },
  // ---- M12001-07: Arbeitshilfe C rows → highest initial / residual risk (Tab. 23) ----
  {
    standard: STD, worksheet: 'M12001-07', equation_number: 'M12001-07-D1',
    formula: 'restrisiko_max_code = max_rows(risiko_zeilen, restrisiko_code)',
    input_symbols: ['risiko_zeilen'], output_symbol: 'restrisiko_max_code', output_unit: null,
    clause_reference: '§6.3.4, Tab. 23; §6.3.5, Tab. 25',
    description: 'Plan 3: höchstes Restrisiko über die Arbeitshilfe-C-Zeilen (Code 1 = Sehr niedrig … 5 = Sehr hoch nach TAB23; Zeilen unter "moderat" behalten ihr Ausgangsrisiko); Ziel "auf ein sehr niedriges oder niedriges Risikoniveau reduziert" (L2061) = Code ≤ 2; CR-014 / restrisiko_niveau STAGED (m1200_1-G-5 / -D-1).',
    verification_quote: `${Q_L2061} — ${Q_L2077}`,
  },
  {
    standard: STD, worksheet: 'M12001-07', equation_number: 'M12001-07-D2',
    formula: 'ausgangsrisiko_max_code = max_rows(risiko_zeilen, ausgangsrisiko_code)',
    input_symbols: ['risiko_zeilen'], output_symbol: 'ausgangsrisiko_max_code', output_unit: null,
    clause_reference: '§6.3.4, Tab. 23; §6.3.5, Tab. 24',
    description: 'Plan 3: höchstes Ausgangsrisiko über die Arbeitshilfe-C-Zeilen (TAB23.risikoniveau_code); "Risikoniveau = Eintrittswahrscheinlichkeit × Schadensausmaß" (L2042) je Zeile; ersetzt funktional EQ-001 über die Skalare (m1200_1-R-1).',
    verification_quote: Q_L2042,
  },
  // ---- M12001-14: Arbeitshilfe D rows → highest event risk ----
  {
    standard: STD, worksheet: 'M12001-14', equation_number: 'M12001-14-D1',
    formula: 'stoerfall_max_code = max_rows(stoerfaelle, risiko_code)',
    input_symbols: ['stoerfaelle'], output_symbol: 'stoerfall_max_code', output_unit: null,
    clause_reference: '§6.3.3, Tab. 26; §6.3.4, Tab. 23',
    description: 'Plan 3: höchstes Risiko über die Störfall-Zeilen (Arbeitshilfe D, TAB23.risikoniveau_code je Zeile).',
    verification_quote: Q_L2123,
  },
  // ---- M12001-16: Flächenverzeichnis → count and Σ volume ----
  {
    standard: STD, worksheet: 'M12001-16', equation_number: 'M12001-16-D1',
    formula: 'anwendungsbereich_count_calc = count_rows(flaechenverzeichnis)',
    input_symbols: ['flaechenverzeichnis'], output_symbol: 'anwendungsbereich_count_calc', output_unit: null,
    clause_reference: '§7.3 (Art. 6 Abs. 3 EU-WasserWVVO)',
    description: 'Plan 3: Anzahl vollständiger Flächen im Flächenverzeichnis ("inkl. eines Flächenverzeichnisses der zu bewässernden Flächen", L2465); ersetzt das manuelle anwendungsbereich_count (M12001-08) — STAGED (m1200_1-C-2); CR-015 auf >= 1 STAGED (m1200_1-G-8).',
    verification_quote: Q_L2465,
  },
  {
    standard: STD, worksheet: 'M12001-16', equation_number: 'M12001-16-D2',
    formula: 'zusatzwasserbedarf_jahr_calc = sum_rows(flaechenverzeichnis, menge_m3)',
    input_symbols: ['flaechenverzeichnis'], output_symbol: 'zusatzwasserbedarf_jahr_calc', output_unit: 'm³/a',
    clause_reference: '§7.3 (Art. 6 Abs. 3 EU-WasserWVVO); §7.4',
    description: 'Plan 3: Σ Bewässerungsmenge über das Flächenverzeichnis = "geschätzte jährliche Menge des aufzubereitenden Wassers" (L2465) — Text-Ableitung ohne gedruckte Formel (m1200_1-F-1); Übernahme als zusatzwasserbedarf_jahr (M12001-03) STAGED (m1200_1-C-2).',
    verification_quote: `${Q_L2465} — ${Q_L2553}`,
  },
  // ---- M12001-09: routine samples → compliance share; the Tab.-19 PFAS-20 screening value ----
  {
    standard: STD, worksheet: 'M12001-09', equation_number: 'M12001-09-D1',
    formula: 'compliance_quote_calc = count_rows(routineproben, ok == 1) * 100 / count_rows(routineproben, relevant == 1)',
    input_symbols: ['routineproben'], output_symbol: 'compliance_quote_calc', output_unit: '%',
    clause_reference: '§5.2',
    description: 'Plan 3: Anteil der Routineproben, die den Tab.-8-Wert ihrer Klasse einhalten (Legionella strikt "<", sonst "≤"; Proben eines Parameters ohne Grenzwert zählen weder im Zähler noch im Nenner; 100 = Prozent; keine Probe mit Grenzwert ⇒ unentscheidbar, nie 0); "in mindestens 90 % der Proben eingehalten" (L1143 / L1145) = routine_min_share_pct; CR-008 / compliance_quote_pct STAGED (m1200_1-G-7 / -C-2); die maximale Abweichungsgrenze (eine log10-Stufe / 100 %) ist nicht kodiert (Residuum).',
    verification_quote: `${Q_L1143} — ${Q_L1145}`,
  },
  {
    standard: STD, worksheet: 'M12001-09', equation_number: 'M12001-09-D2',
    formula: "pfas20_limit_ng_l = lookup('TAB19', '3', 'grenzwert_ng_l')",
    input_symbols: [], output_symbol: 'pfas20_limit_ng_l', output_unit: 'ng/l',
    clause_reference: '§6.3.3, Tab. 19; §5.2',
    description: 'Plan 3: Beurteilungswert Summe PFAS-20 aus TAB19 Kategorie 3 ("Summe PFAS-20<100 ng/l"; L1955 "0,10 µg/l"); skalare Gleichung (nicht materialisiert, Amendment D); CR-013 auf pfas20_value < pfas20_limit_ng_l STAGED (m1200_1-G-6).',
    verification_quote: `${Q_T19} — ${Q_L1955}`,
  },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
