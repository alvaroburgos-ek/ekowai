/**
 * DWA-M-1200-3 — Plan 3 Task 6 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts m1200_3` (NEW equation rows
 * only; `ON CONFLICT DO NOTHING`). Every `verification_quote` is a span lifted
 * from the transcript `Desktop\Guidelines\DWA-M-1200-3\DWA-M_1200-3_GD.md`
 * (the `Q_*` constants carry their line ranges). Text-only derivations ship
 * `imported_unverified` and carry the printed sentence / table they encode
 * (class F on the sign-off sheet).
 *
 * Single-source (checked against the TEN prod equation rows read in-session —
 * five helpers, each stored twice: `Gl-Helper-1` speichervolumen = bewaesserungshoehe
 * * flaeche_groesse * 10 (-05 / -10), `-2` dauer_durchgang_h, `-3` dauer_befuellung_h,
 * `-4` frostschutz_volumen (-05 / -17), `-5` min_abstand = faktor * wurfweite (-05 / -13)):
 * nothing below outputs a prod producer symbol. `speichervolumen_calc` is a NEW
 * symbol beside prod's `speichervolumen` (the switch of Gl-Helper-1 from the
 * scalar `flaeche_groesse` to the register Σ is m1200_3-R-1, STAGED); the
 * per-row `min_abstand_m` lives in the register's derived column (Gl-Helper-5
 * per row) and no second scalar `min_abstand` is written; the duplicate -05
 * helper rows are m1200_3-R-2 (STAGED deactivation).
 *
 * Every output is a CREATED field (field-configs/m1200_3.ts) of the register's
 * own worksheet; the register-fed ones are server-materialised, the scalar-only
 * M12003-10-D1 / -D2 compute on the hook / report / snapshot / PDF paths only
 * (2a design, controller amendment D). M12003-10-D1 reads `flaeche_gesamt_ha`
 * from M12003-06 — `manual_required` until the consumer edit m1200_3-C-7 lands.
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { Q_T2_KOPF, Q_T2_HEAD, Q_T2_ROW, Q_L790, Q_T5, Q_L838, Q_L851, Q_L916, Q_L1040, Q_L1352, Q_L1369, Q_L655 } from '../regulation-tables-seed-m1200_3';

const STD = 'DWA-M-1200-3';

export const EQUATIONS: EquationEntry[] = [
  // ---- M12003-06: Schläge → Σ area, distance-rule violations ----
  {
    standard: STD, worksheet: 'M12003-06', equation_number: 'M12003-06-D1',
    formula: 'flaeche_gesamt_ha = sum_rows(schlaege, flaeche_ha)',
    input_symbols: ['schlaege'], output_symbol: 'flaeche_gesamt_ha', output_unit: 'ha',
    clause_reference: '§4.2, Tab. 2; §5.2.1, Tab. 5',
    description: 'Plan 3: Σ bewässerte Fläche über die Schlag-Zeilen (Tab.-2-Kopf "Bewässerte Fläche"; Basis der Tab.-5-Dimensionierung "Zu bewässernde Fläche 10 ha") — Text-Ableitung ohne gedruckte Formel; ersetzt den Skalar flaeche_groesse als Eingang von Gl-Helper-1 / -4 nach der Konsumenten-Ergänzung (m1200_3-C-7 / -R-1).',
    verification_quote: `${Q_T2_KOPF} — ${Q_T5}`,
  },
  {
    standard: STD, worksheet: 'M12003-06', equation_number: 'M12003-06-D2',
    formula: 'abstand_verletzungen = count_rows(schlaege, abstand_ok == 0)',
    input_symbols: ['schlaege'], output_symbol: 'abstand_verletzungen', output_unit: null,
    clause_reference: '§5.2.4.2, Tab. 7, Tab. 8; §5.4.4, Tab. 9',
    description: 'Plan 3: Anzahl der Schlag-Zeilen, deren vorhandener Abstand den Mindestabstand (Faktor aus TAB789 × Wurfweite, Gl-Helper-5 je Zeile) unterschreitet; Zeilen ohne Sprinklersystem und Zeilen mit steuerbarem Zugang (L1030) zählen als eingehalten; eine Zeile mit der leer gedruckten Tab.-8-Zelle D/mit (m1200_3-U-1) macht die Zählung unentscheidbar; CR-09 auf abstand_verletzungen == 0 STAGED (m1200_3-G-3).',
    verification_quote: `${Q_L916} — ${Q_L1040}`,
  },
  // ---- M12003-08: Wasseranalysen → Tab.-11 violations ----
  {
    standard: STD, worksheet: 'M12003-08', equation_number: 'M12003-08-D1',
    formula: 'analysen_verletzungen = count_rows(wasseranalysen, ok == 0)',
    input_symbols: ['wasseranalysen'], output_symbol: 'analysen_verletzungen', output_unit: null,
    clause_reference: '§5.6.2, Tab. 11',
    description: 'Plan 3: Anzahl der Analyse-Zeilen über dem Tab.-11-Toleranzwert (die (*)-Parameter nach pflanzentyp, pH als Bereich 5,0–9,5); CR-05-Erweiterung um Chlorid / Wasserhärte / Leitfähigkeit STAGED (m1200_3-G-5).',
    verification_quote: `${Q_L1352} — ${Q_L1369}`,
  },
  // ---- M12003-10: Tab.-5 dimensioning from the Σ area, the Tab.-5 default, Σ storage volume ----
  {
    standard: STD, worksheet: 'M12003-10', equation_number: 'M12003-10-D1',
    formula: 'speichervolumen_calc = bewaesserungshoehe * flaeche_gesamt_ha * 10',
    input_symbols: ['bewaesserungshoehe', 'flaeche_gesamt_ha'], output_symbol: 'speichervolumen_calc', output_unit: 'm³',
    clause_reference: '§5.2.1, Tab. 5',
    description: 'Plan 3: minimal erforderliches Speichervolumen = Bewässerungshöhe × Σ Schlagfläche × 10 (die gedruckte Tab.-5-Arithmetik: 20 mm × 10 ha = 2000 m³; Faktor 10 = mm·ha → m³) — dieselbe Form wie prod Gl-Helper-1, aber über die Register-Summe statt des Skalars flaeche_groesse (m1200_3-R-1); flaeche_gesamt_ha ist auf M12003-10 erst nach der Konsumenten-Ergänzung lesbar (m1200_3-C-7); skalare Gleichung (nicht materialisiert, Amendment D).',
    verification_quote: `${Q_L790} — ${Q_T5}`,
  },
  {
    standard: STD, worksheet: 'M12003-10', equation_number: 'M12003-10-D2',
    formula: "bewaesserungshoehe_tab5 = lookup('S_TAB5_BEISPIEL', 'normgroesse', 'bewaesserungshoehe_mm')",
    input_symbols: [], output_symbol: 'bewaesserungshoehe_tab5', output_unit: 'mm',
    clause_reference: '§5.2.1, Tab. 5',
    description: 'Plan 3: Normgröße Bewässerungshöhe des Tab.-5-Beispiels (20 mm) als Orientierungswert (L790 "als Orientierung dienlich") für das Eingabefeld bewaesserungshoehe; skalare Gleichung (nicht materialisiert, Amendment D).',
    verification_quote: `${Q_L790} — ${Q_T5}`,
  },
  {
    standard: STD, worksheet: 'M12003-10', equation_number: 'M12003-10-D3',
    formula: 'speichervolumen_ist_m3 = sum_rows(speicher_1200_3, volumen_m3)',
    input_symbols: ['speicher_1200_3'], output_symbol: 'speichervolumen_ist_m3', output_unit: 'm³',
    clause_reference: '§5.1.1; §5.2.1, Tab. 5',
    description: 'Plan 3: Σ vorhandenes Speichervolumen über die Speicher-Zeilen — Vergleichswert zum minimal erforderlichen Speichervolumen (Tab. 5); Text-Ableitung ohne gedruckte Formel.',
    verification_quote: `${Q_L655} — ${Q_T5}`,
  },
  // ---- M12003-11: Druckleitungen → Σ energy, Σ cost (Tab. 6 per 1.000 m, scaled by length) ----
  {
    standard: STD, worksheet: 'M12003-11', equation_number: 'M12003-11-D1',
    formula: 'energie_kwh_a = sum_rows(druckleitungen, kwh_abschnitt)',
    input_symbols: ['druckleitungen'], output_symbol: 'energie_kwh_a', output_unit: 'kWh/a',
    clause_reference: '§5.2.2, Tab. 6',
    description: 'Plan 3: Σ Energiebedarf der Abschnitte = Tab.-6-Wert (kWh p. a. je 1.000 m beim gewählten Arbeitsdruck) × Länge / 1000 — die lineare Skalierung auf die Länge ist Text-Ableitung aus "pro 1.000 m Länge" (Caption L838) unter den Annahmen von Anm. 1 (L851) — m1200_3-F-2.',
    verification_quote: `${Q_L838} — ${Q_L851}`,
  },
  {
    standard: STD, worksheet: 'M12003-11', equation_number: 'M12003-11-D2',
    formula: 'leitungskosten_eur = sum_rows(druckleitungen, kosten_abschnitt_eur)',
    input_symbols: ['druckleitungen'], output_symbol: 'leitungskosten_eur', output_unit: '€',
    clause_reference: '§5.2.2, Tab. 6; §5.2.3',
    description: 'Plan 3: Σ (Materialkosten + Einbaukosten je 1.000 m) × Länge / 1000 über die Abschnitte (Tab. 6, Stand Q3/2022, Beispiel ländlicher Raum Berlin-Brandenburg) — m1200_3-F-2.',
    verification_quote: Q_L838,
  },
  // ---- M12003-18: Tagebuch → Σ actual water use ----
  {
    standard: STD, worksheet: 'M12003-18', equation_number: 'M12003-18-D1',
    formula: 'wasserverbrauch_ist_m3 = sum_rows(bewaesserungstagebuch, wasser_m3)',
    input_symbols: ['bewaesserungstagebuch'], output_symbol: 'wasserverbrauch_ist_m3', output_unit: 'm³',
    clause_reference: '§4.2, Tab. 2',
    description: 'Plan 3: Σ "Wasserverbrauch total (m³)" über die Tagebuch-Zeilen (Tab. 2) — Ist-Verbrauch; Text-Ableitung ohne gedruckte Formel; die Schwermetall-Fracht Σ(Menge × Konzentration) gegen 1/3 BBodSchV (L614, CR-18-2) ist nicht kodiert (m1200_3-F-1).',
    verification_quote: `${Q_T2_HEAD} — ${Q_T2_ROW}`,
  },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
