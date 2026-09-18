/**
 * DIN-EN-16941-2 — Plan 3 Task 15 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts din16941_2` (NEW equation
 * rows only; `ON CONFLICT DO NOTHING`). Every `verification_quote` is lifted
 * from the transcript `Desktop\Guidelines\DWA DIN Scribd\DIN-EN-16941-2\DIN-EN-16941-2.md`
 * (the `Q` spans of the seed module, line in the key).
 *
 * Single-source: no row here outputs a symbol prod already produces (Y_G and
 * D_G keep their verified Gl. (1) / Gl. (2) rows over the 23 typed scalars).
 * Every register-fed row lives on its register's worksheet (-02
 * `speichereinrichtungen`, -03 `grauwasserquellen_16941` / `bedarfsstellen`,
 * -04 `probenahmen`); the scalar rows (-02 D3, -03 D5 … D8) are not
 * server-materialised (amendment D). Existing inputs are bound by their prod
 * symbols (`n`, `V_misc`, `vorgesehene_nutzung`, `Y_G`, `D_G`; `D_zulauf` is a
 * created input on -02) — never a second producer of a quantity an input
 * already carries (amendment K).
 *
 * NOT emitted (STAGED in scripts/verification/din16941_2-STAGED-plan3-rulings.sql):
 *   - Gl. (1) / Gl. (2) re-pointed to the register Σ (differenziert) or the
 *     Tab.-A.1 twins (vereinfacht) → din16941_2-R-1 / R-2 (replacing a verified
 *     equation; the 23 scalars hidden under vereinfacht only with it, G-9);
 *   - `bemessungswert_massgebend` (manual, CR-12, consumed by -02 / -04) fed by
 *     bemessungswert_massgebend_calc → D-5; `nennkapazitaet` by the register Σ →
 *     D-3; `bewertung_status` by status_letzte_probe → D-1.
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { Q } from '../regulation-tables-seed-din16941_2';

const STD = 'DIN-EN-16941-2';
const W02 = 'DIN-EN-16941-2-02';
const W03 = 'DIN-EN-16941-2-03';
const W04 = 'DIN-EN-16941-2-04';

export const EQUATIONS: EquationEntry[] = [
  // ---- -02: Speichereinrichtungen / freier Auslauf ----
  {
    standard: STD, worksheet: W02, equation_number: 'DIN-EN-16941-2-02-D1',
    formula: 'nennkapazitaet_sum = sum_rows(speichereinrichtungen, nennkapazitaet_l)',
    input_symbols: ['speichereinrichtungen'], output_symbol: 'nennkapazitaet_sum', output_unit: 'l',
    clause_reference: '§5.4.3, §5.4.4',
    description: 'Plan 3: Nennkapazität gesamt = Σ Nennkapazität der verbundenen Speichereinrichtungen (Register); das Eingabefeld nennkapazitaet (an -03 vererbt) bleibt — Ablösung STAGED (din16941_2-D-3).',
    verification_quote: `${Q.L296} — ${Q.L300}`,
  },
  {
    standard: STD, worksheet: W02, equation_number: 'DIN-EN-16941-2-02-D2',
    formula: 'speicher_count = count_rows(speichereinrichtungen)',
    input_symbols: ['speichereinrichtungen'], output_symbol: 'speicher_count', output_unit: null,
    clause_reference: '§5.4.3',
    description: 'Plan 3: Anzahl der erfassten Speichereinrichtungen (0 bei leerem Register).',
    verification_quote: Q.L296,
  },
  {
    standard: STD, worksheet: W02, equation_number: 'DIN-EN-16941-2-02-D3',
    formula: 'freier_auslauf_A_min = max(2 * D_zulauf, 20)',
    input_symbols: ['D_zulauf'], output_symbol: 'freier_auslauf_A_min', output_unit: 'mm',
    clause_reference: '§5.5.2, Bild 2',
    description: 'Plan 3: A = das Doppelte des Innendurchmessers der Zulauföffnung, mindestens 20 mm (freier Auslauf Typ AA, Bild 2 Legende); nur bei rueckflusssicherung_typ = AA sichtbar.',
    verification_quote: `${Q.L377} — ${Q.L378}`,
  },

  // ---- -03: Gl. (1) / Gl. (2) over rows, Tab. A.1 twins, §6.1 ----
  {
    standard: STD, worksheet: W03, equation_number: 'DIN-EN-16941-2-03-D1',
    formula: 'Y_G_rows = n * sum_rows(grauwasserquellen_16941, ertrag_row)',
    input_symbols: ['grauwasserquellen_16941', 'n'], output_symbol: 'Y_G_rows', output_unit: 'l/d',
    clause_reference: '§6.2.4.2, Gl. (1)',
    description: 'Plan 3: Y_G = n · Σ (Q · t · u bzw. V · u) je Person über die erfassten Grauwasserquellen (Gl. 1 mit den Quellen als Zeilen, Form des Terms aus der Legende); die verifizierte Gl. (1) über die 16 Skalare bleibt — Umstellung STAGED (din16941_2-R-1).',
    verification_quote: `${Q.L557} — ${Q.L560_561}`,
  },
  {
    standard: STD, worksheet: W03, equation_number: 'DIN-EN-16941-2-03-D2',
    formula: 'quellen_count = count_rows(grauwasserquellen_16941)',
    input_symbols: ['grauwasserquellen_16941'], output_symbol: 'quellen_count', output_unit: null,
    clause_reference: '§6.2.4.2, Gl. (1)',
    description: 'Plan 3: Anzahl der erfassten Grauwasserquellen (0 bei leerem Register).',
    verification_quote: Q.L560_561,
  },
  {
    standard: STD, worksheet: W03, equation_number: 'DIN-EN-16941-2-03-D3',
    formula: 'D_G_rows = n * sum_rows(bedarfsstellen, bedarf_row) + V_misc',
    input_symbols: ['bedarfsstellen', 'n', 'V_misc'], output_symbol: 'D_G_rows', output_unit: 'l/d',
    clause_reference: '§6.2.4.3, Gl. (2)',
    description: 'Plan 3: D_G = n · Σ (V · u) je Person über die erfassten Bedarfsstellen + V_misc (Gl. 2 mit den Bedarfsarten als Zeilen; V_misc bleibt Skalar nach §6.2.4.4); die verifizierte Gl. (2) über die Skalare bleibt — Umstellung STAGED (din16941_2-R-2).',
    verification_quote: `${Q.L595} — ${Q.L600}`,
  },
  {
    standard: STD, worksheet: W03, equation_number: 'DIN-EN-16941-2-03-D4',
    formula: 'bedarfsstellen_count = count_rows(bedarfsstellen)',
    input_symbols: ['bedarfsstellen'], output_symbol: 'bedarfsstellen_count', output_unit: null,
    clause_reference: '§6.2.4.3, Gl. (2)',
    description: 'Plan 3: Anzahl der erfassten Bedarfsstellen (0 bei leerem Register).',
    verification_quote: Q.L597,
  },
  {
    standard: STD, worksheet: W03, equation_number: 'DIN-EN-16941-2-03-D5',
    formula: "Y_G_vereinfacht = n * lookup('TABA1', 'ertrag', 'l_pd')",
    input_symbols: ['n'], output_symbol: 'Y_G_vereinfacht', output_unit: 'l/d',
    clause_reference: '§6.2.3, Anhang A Tab. A.1',
    description: 'Plan 3: vereinfachtes Verfahren — Grauwasserertrag = 60 l je Person und Tag (Tabelle A.1, Ertrag von Dusche, Badewanne und/oder Waschbecken) · n; die Übergabe an Y_G / CR-12 ist STAGED (din16941_2-R-1).',
    verification_quote: `${Q.L547} — ${Q.L741}`,
  },
  {
    standard: STD, worksheet: W03, equation_number: 'DIN-EN-16941-2-03-D6',
    formula: "D_G_vereinfacht = n * (if(vorgesehene_nutzung == 'wc_spuelung', lookup('TABA1', 'bedarf_wc', 'l_pd'), 0) + if(vorgesehene_nutzung == 'waesche', lookup('TABA1', 'bedarf_waesche', 'l_pd'), 0) + if(vorgesehene_nutzung == 'gartenbewaesserung' OR vorgesehene_nutzung == 'reinigung', lookup('TABA1', 'bedarf_andere', 'l_pd'), 0))",
    input_symbols: ['n', 'vorgesehene_nutzung'], output_symbol: 'D_G_vereinfacht', output_unit: 'l/d',
    clause_reference: '§6.2.3, Anhang A Tab. A.1',
    description: 'Plan 3: vereinfachtes Verfahren — Bedarf je Person und Tag nach Tabelle A.1 (WC 35 / Wäsche waschen 15 / andere Nicht-Trinkwasser-Nutzungen 10, z. B. Gartenbewässerung — Reinigung ist der Spalte „andere“ zugeordnet) · n, Spalte nach der vererbten Einzelauswahl vorgesehene_nutzung; „Toilettenspülung und/oder Reinigen der Wäsche“ ist mit einer Einzelauswahl nicht kombinierbar (din16941_2-J-1); Übergabe an D_G / CR-12 STAGED (din16941_2-R-2).',
    verification_quote: `${Q.L518} — ${Q.L741}`,
  },
  {
    standard: STD, worksheet: W03, equation_number: 'DIN-EN-16941-2-03-D7',
    formula: 'bemessungswert_massgebend_calc = min(Y_G, D_G)',
    input_symbols: ['Y_G', 'D_G'], output_symbol: 'bemessungswert_massgebend_calc', output_unit: 'l/d',
    clause_reference: '§6.1',
    description: 'Plan 3: „Für die Gesamtauslegung des Systems muss der niedrigste berechnete Wert für den Ertrag oder den Bedarf verwendet werden“ — min der Gl.-1/2-Ausgaben (Satz, keine gedruckte Formel); das Eingabefeld bemessungswert_massgebend (CR-12, an -02 / -04 vererbt) bleibt — Ablösung STAGED (din16941_2-D-5).',
    verification_quote: Q.L511,
  },
  {
    standard: STD, worksheet: W03, equation_number: 'DIN-EN-16941-2-03-D8',
    formula: 'speicher_max_50 = 0.5 * D_G',
    input_symbols: ['D_G'], output_symbol: 'speicher_max_50', output_unit: 'l',
    clause_reference: '§6.1',
    description: 'Plan 3: „wird normalerweise eine Speicherung in Höhe von bis zu 50 % des Tagesbedarfs ausreichend sein“ — 0,5 · D_G als Obergrenze der Speicherung behandelten Grauwassers; Warn-Gate gegen die vererbte nennkapazitaet STAGED (din16941_2-G-5).',
    verification_quote: Q.L511,
  },

  // ---- -04: Probenahmen ----
  {
    standard: STD, worksheet: W04, equation_number: 'DIN-EN-16941-2-04-D1',
    formula: 'probenahmen_count = count_rows(probenahmen)',
    input_symbols: ['probenahmen'], output_symbol: 'probenahmen_count', output_unit: null,
    clause_reference: '§11',
    description: 'Plan 3: Anzahl der erfassten Stichproben (0 bei leerem Register).',
    verification_quote: Q.L697,
  },
  {
    standard: STD, worksheet: W04, equation_number: 'DIN-EN-16941-2-04-D2',
    formula: 'probenahmen_rot = count_rows(probenahmen, status_max == 3)',
    input_symbols: ['probenahmen'], output_symbol: 'probenahmen_rot', output_unit: null,
    clause_reference: '§11, Anhang D Tab. D.3',
    description: 'Plan 3: Stichproben mit Status rot (> 10 G bei E. coli / Enterokokken / Legionella / Coliformen, Tabelle D.3) — „Nutzung des Grauwassers ausschließen, bis Problem gelöst ist“; Gate STAGED (din16941_2-D-1).',
    verification_quote: Q.L886,
  },
  {
    standard: STD, worksheet: W04, equation_number: 'DIN-EN-16941-2-04-D3',
    formula: 'probenahmen_gelb = count_rows(probenahmen, status_max == 2)',
    input_symbols: ['probenahmen'], output_symbol: 'probenahmen_gelb', output_unit: null,
    clause_reference: '§11, Anhang D Tab. D.3 / D.4',
    description: 'Plan 3: Stichproben mit Status gelb (G bis 10 G nach Tabelle D.3 bzw. > G / außerhalb des pH-Bereichs nach Tabelle D.4) — „erneute Probenahme zur Bestätigung des Ergebnisses und Prüfen des Systembetriebs“.',
    verification_quote: `${Q.L885} — ${Q.L901}`,
  },
  {
    standard: STD, worksheet: W04, equation_number: 'DIN-EN-16941-2-04-D4',
    formula: 'status_letzte_probe = sum_rows(last_rows(probenahmen, 1), status_max)',
    input_symbols: ['probenahmen'], output_symbol: 'status_letzte_probe', output_unit: null,
    clause_reference: '§11, Anhang D Tab. D.3 / D.4',
    description: 'Plan 3: Ampel der letzten vollständigen Stichprobe (Eingabereihenfolge; 1 grün · 2 gelb · 3 rot · 0 nicht bewertet); der manuelle bewertung_status (CR-17, an -05 vererbt) bleibt — Ableitung STAGED (din16941_2-D-1).',
    verification_quote: `${Q.L703} — ${Q.L884}`,
  },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
