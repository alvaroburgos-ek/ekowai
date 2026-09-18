/**
 * DWA-M-1200-2 — Plan 3 Task 16 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts m1200_2` (NEW equation rows
 * only; `ON CONFLICT DO NOTHING`). Every `verification_quote` is a span lifted
 * from the transcript `Desktop\Guidelines\DWA-M-1200-2\DWA-M_1200-2_GD.md`
 * (the `Q` object carries the line in every key). Text-only derivations ship
 * `imported_unverified` and carry the printed sentence they encode (class F).
 *
 * Single-source (checked against the FOUR prod equation rows read in-session,
 * all on M12002-05, all `verified_against_standard`): Gl. 1 `log10_reduktion =
 * log10(c_zulauf / c_ablauf)` (0ad3e66f-…), Gl. C.2-1 `perzentil_10_log10 =
 * mw_log10 - 1.282 * sd_log10` (e872edf5-…), Gl. C.2-2 `perzentil_50_log10 =
 * median(log10_reduktionen)` (0f237c28-…), Gl. C.2-3 `lrv_i = log10(x_i / y_i)`
 * (93bc49a5-…). Nothing below outputs any of those four symbols; the per-row
 * LRV_i (Gl. C.2-3 / Gl. 1) lives in the register's `derived` column, the
 * per-organism statistics are NEW `_calc` twins of the typed mw_log10 /
 * sd_log10 / perzentil_*_log10 (m1200_2-D-4), and the prod rows stay the only
 * producers of their symbols (their retirement is STAGED, never emitted).
 *
 * Every per-organism equation is SELF-CONTAINED (aggregates inlined, no chain
 * over another new output): the save-path materialiser reads scalar inputs
 * from the persisted values, so a chained twin would lag one save behind.
 * Every output is a CREATED field of the register's own worksheet
 * (field-configs/m1200_2.ts); the register-fed ones are server-materialised,
 * the scalar-only ones (M12002-02-D1, -05-D2 … -D5) compute on the hook /
 * report / snapshot / PDF paths only (2a design, controller amendment D).
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { Q, frag } from '../regulation-tables-seed-m1200_2';
import { ORGANISMEN, ORG_OUTPUTS } from '../field-configs/m1200_2';

const STD = 'DWA-M-1200-2';
const REG = 'validierungsproben';
const K = "lookup('GL_C2_1', 'k', 'wert')";

/** The per-organism formula for one ORG_OUTPUTS key (all self-contained; `c` = the row condition). */
export function orgFormula(key: string, token: string, col: string, out: string): string {
  const c = `organismus == '${token}'`;
  const mean = `mean_rows(${REG}, lrv_i, ${c})`, sd = `stdev_rows(${REG}, lrv_i, ${c})`, median = `median_rows(${REG}, lrv_i, ${c})`;
  switch (key) {
    case 'n': return `${out} = count_rows(${REG}, ${c})`;
    case 'n_erreicht': return `${out} = count_rows(${REG}, ${c} AND erreicht == 1)`;
    case 'max_unterschreitung': return `${out} = max_rows(${REG}, shortfall, ${c})`;
    case 'mw': return `${out} = ${mean}`;
    case 'sd': return `${out} = ${sd}`;
    case 'p10': return `${out} = ${mean} - ${K} * ${sd}`;
    case 'p50': return `${out} = ${median}`;
    // J-6 (fix round 1): the MISS count is bounded (n_total − n_pass_min = 1 for A, 8 for B-1 / C-1 — L681 "einmal nicht erreicht"), not the hit count — with more than 16 pairs a hit-count rule would let extra misses pass.
    case 'validierung_ok': return `${out} = if(count_rows(${REG}, ${c}) >= lookup('S3_3_3', wassergueteklasse, 'n_total') AND count_rows(${REG}, ${c} AND erreicht == 0) <= lookup('S3_3_3', wassergueteklasse, 'n_total') - lookup('S3_3_3', wassergueteklasse, 'n_pass_min') AND max_rows(${REG}, shortfall, ${c}) <= lookup('S3_3_3', wassergueteklasse, 'max_shortfall_log10'), 1, 0)`;
    case 'perzentil_ok': return `${out} = if(if(lookup('ANHANGC1', wassergueteklasse, 'percentile') == 10, ${mean} - ${K} * ${sd}, ${median}) >= lookup('TAB3', wassergueteklasse, '${col}'), 1, 0)`;
    default: throw new Error(`unknown org output ${key}`);
  }
}
const ORG_QUOTE: Record<string, string> = {
  n: Q.L679, n_erreicht: `${Q.L681} — ${Q.L683}`, max_unterschreitung: `${Q.L681} — ${Q.L683}`, mw: Q.L1821, sd: Q.L1821, p10: Q.L1822, p50: Q.L1823,
  validierung_ok: `${Q.L679} — ${Q.L681} — ${Q.L683}`, perzentil_ok: `${Q.L1800} — ${Q.L1802} — ${Q.L1822} — ${Q.L1823}`,
};
const ORG_INPUTS: Record<string, string[]> = { validierung_ok: [REG, 'wassergueteklasse'], perzentil_ok: [REG, 'wassergueteklasse'] };

const eq = (worksheet: string, n: string, formula: string, input_symbols: string[], output_unit: string | null, clause_reference: string, description: string, verification_quote: string | null): EquationEntry => ({
  standard: STD, worksheet, equation_number: n, formula, input_symbols, output_symbol: formula.split('=')[0].trim(), output_unit, clause_reference, description, verification_quote,
});

export const EQUATIONS: EquationEntry[] = [
  // ---- M12002-02: is validation required for the chosen class (Tab. 3 prints targets for A, B-1, C-1 only) ----
  eq('M12002-02', 'M12002-02-D1', "validierung_erforderlich_tab3 = lookup('TAB3', wassergueteklasse, 'leistungsziele')", ['wassergueteklasse'], null, '§3.1, Tab. 3; §3.3.1',
    'Plan 3: 1 wenn Tab. 3 für die gewählte Klasse Leistungsziele druckt (A, B-1, C-1 — L616 "auch für die Güteklassen B und C gefordert (entspricht den Güteklassen B-1 und C-1)"), 0 für B-2 / C-2 / D ("－"); skalar (nicht materialisiert, Amendment D); die Abschnittsregeln auf -04 / -05 sind STAGED (m1200_2-C-2).', `${Q.L616} — ${Q.L553_554}`),

  // ---- M12002-05: the paired validation samples → class-driven thresholds and per-organism statistics / verdicts ----
  eq('M12002-05', 'M12002-05-D1', `n_proben_validierung = count_rows(${REG})`, [REG], null, '§3.3.3',
    'Plan 3: Anzahl vollständiger Probenpaare über alle Organismen ("sind je 16 korrespondierende Proben im Zulauf und Ablauf zu nehmen", L679); Übernahme als probenanzahl_zulauf / REQ-05 STAGED (m1200_2-D-3 / -G-1).', Q.L679),
  eq('M12002-05', 'M12002-05-D2', "n_pass_min_tab = lookup('S3_3_3', wassergueteklasse, 'n_pass_min')", ['wassergueteklasse'], null, '§3.3.3',
    'Plan 3: Mindestzahl der Probenpaare mit erreichtem Leistungsziel je Klasse (A 15, B-1 / C-1 8 von 16; L681 / L683); keine S3_3_3-Zeile für B-2 / C-2 / D ⇒ unentscheidbar (Tab. 3 druckt "－"); skalar, nicht materialisiert.', `${Q.L681} — ${Q.L683}`),
  eq('M12002-05', 'M12002-05-D3', "max_unterschreitung_zul = lookup('S3_3_3', wassergueteklasse, 'max_shortfall_log10')", ['wassergueteklasse'], 'log10', '§3.3.3',
    'Plan 3: zulässige größte Unterschreitung des Leistungsziels je Klasse (A 1,0, B-1 / C-1 2,0 log10; L681 / L683); skalar, nicht materialisiert.', `${Q.L681} — ${Q.L683}`),
  eq('M12002-05', 'M12002-05-D4', "perzentil_erforderlich = lookup('ANHANGC1', wassergueteklasse, 'percentile')", ['wassergueteklasse'], null, 'Anhang C.1',
    'Plan 3: das geprüfte Perzentil der umfänglichen Validierung je Klasse (A 10, B-1 / C-1 50; L1800 / L1802); skalar, nicht materialisiert; REQ-06 STAGED (m1200_2-G-2).', `${Q.L1800} — ${Q.L1802}`),
  eq('M12002-05', 'M12002-05-D5', `k_faktor_tab = ${K}`, [], null, 'Anhang C.2, Gl. C.2-1',
    'Plan 3: der k-Faktor 1,282 aus GL_C2_1 (L1822; L1860 "k-Faktor & k & 1,282"); skalar, nicht materialisiert; Anzeige-Zwilling des typbaren k_faktor_normal (m1200_2-D-5).', Q.L1822),
  ...ORGANISMEN.flatMap((o, oi) => ORG_OUTPUTS.map((d, di) => eq('M12002-05', `M12002-05-D${6 + oi * ORG_OUTPUTS.length + di}`, orgFormula(d.key, o.token, o.col, d.sym(o.stem)), ORG_INPUTS[d.key] ?? [REG], d.unit, d.clause,
    `Plan 3: ${d.label(o.label)} — ${d.note}; Zeilen mit organismus = '${o.token}'${d.key === 'sd' || d.key === 'p10' || d.key === 'perzentil_ok' ? '; Stichproben-Standardabweichung (n − 1), mindestens 2 Zeilen' : ''}${d.key === 'max_unterschreitung' || d.key === 'mw' || d.key === 'sd' || d.key === 'p10' || d.key === 'p50' ? '; ohne Zeile des Organismus unentscheidbar' : ''}${d.key === 'validierung_ok' ? '; REQ-04 / REQ-05 STAGED (m1200_2-G-7 / -G-1)' : d.key === 'perzentil_ok' ? '; REQ-06 STAGED (m1200_2-G-2)' : d.key === 'mw' || d.key === 'sd' ? '; Zwilling der typbaren mw_log10 / sd_log10 (m1200_2-D-4)' : d.key === 'p10' || d.key === 'p50' ? '; Zwilling der prod-Gleichung Gl. C.2-1 / C.2-2 über die Skalare (m1200_2-D-4)' : ''}.`,
    ORG_QUOTE[d.key]))),

  // ---- M12002-06: routine samples → compliance share ----
  eq('M12002-06', 'M12002-06-D1', 'konformitaet_calc = count_rows(routineproben_1200_2, ok == 1) * 100 / count_rows(routineproben_1200_2, relevant == 1)', ['routineproben_1200_2'], '%', '§3.1; §6.4',
    'Plan 3: Anteil der Routineproben, die den Tab.-3-Wert ihrer Klasse einhalten (Legionella strikt "<", sonst "≤"; Proben ohne gedruckten Wert zählen weder im Zähler noch im Nenner; 100 = Prozent; keine Probe mit Wert ⇒ unentscheidbar, nie 0); "in mindestens 90 % der Proben eingehalten" (L534 / L1283); bis zur Konsumenten-Ergänzung m1200_2-C-1 (wassergueteklasse → -06) sind alle Zeilen "kein Wert"; REQ-03 / perzentil_konformitaet STAGED (m1200_2-G-5 / -D-6); die Abweichungsgrenze (1 log10 / 100 %) ist nicht kodiert (Residuum).', `${Q.L534} — ${Q.L1283}`),

  // ---- M12002-12: the chain's indicative log10 sums and the comparison with the Tab.-3 targets ----
  ...(['viren', 'protozoen', 'bakterien'] as const).map((g, i) => eq('M12002-12', `M12002-12-D${i + 1}`, `credit_sum_${g} = sum_rows(verfahrenskette_stufen, credit_${g})`, ['verfahrenskette_stufen'], 'log10', '§3.3.2; Anhang B, Tab. B.2',
    `Plan 3: Σ erreichbare log10-Reduktion (${g}) über die Stufen der Verfahrenskette ("werden … jeweils zu einer Gesamtreduktion addiert (Mehrfachbehandlung, Multibarrierenansatz)", L640); indikative Tab.-B.2-Werte bzw. die je Zeile begründet abweichenden Werte; kein Nachweis (L1913).`, `${Q.L640} — ${Q.L1748}`)),
  ...([['viren', 'log10_somatische_coliphagen', 'Coliphagen ≥ 6,0 (somatische und f-spezifische drucken denselben Wert)'], ['protozoen', 'log10_clostridium', 'Clostridium-perfringens-Sporen ≥ 4,0 (das alternativ gedruckte Ziel sulfatreduzierende Sporenbildner ≥ 5,0 ist strenger — m1200_2-J-3)'], ['bakterien', 'log10_e_coli', 'E. coli ≥ 5,0']] as const).map(([g, col, what], i) =>
    eq('M12002-12', `M12002-12-D${i + 4}`, `credit_ok_${g} = if(sum_rows(verfahrenskette_stufen, credit_${g}) >= lookup('TAB3', wassergueteklasse, '${col}'), 1, 0)`, ['verfahrenskette_stufen', 'wassergueteklasse'], null, '§3.3.2; §3.1, Tab. 3',
      `Plan 3: 1 wenn die Σ der indikativen Credits (${g}) das Tab.-3-Leistungsziel der geerbten Klasse erreicht — ${what}; Planungs-Hinweis (Bild 1), kein Gate: die Validierung nach §3.3.3 / Anhang C bleibt der Nachweis.`, `${Q.L640} — ${Q.L549_552}`)),
  eq('M12002-12', 'M12002-12-D7', 'stufen_count = count_rows(verfahrenskette_stufen)', ['verfahrenskette_stufen'], null, '§3.3.2',
    'Plan 3: Anzahl vollständiger Stufen der Verfahrenskette.', Q.L640),

  // ---- M12002-13: the monitoring rows → counts and the largest alarm delay ----
  eq('M12002-13', 'M12002-13-D1', 'parameter_count = count_rows(betriebsparameter)', ['betriebsparameter'], null, '§6.4, Tab. 6',
    'Plan 3: Anzahl vollständiger Betriebsparameter-Zeilen ("Es sind mindestens die Betriebsparameter gemäß Tabelle 6 zu berücksichtigen", L663).', Q.L663),
  eq('M12002-13', 'M12002-13-D2', 'parameter_nicht_online = count_rows(betriebsparameter, online_ok == 0)', ['betriebsparameter'], null, '§6.4',
    'Plan 3: Betriebsparameter ohne Online-Messung ("Durch Online-Monitoring von relevanten Betriebsparametern sind der Betriebszustand und die Einhaltung der Anforderungen zu allen Zeitpunkten sicherzustellen", L1289); REQ-11 (messhauefigkeit == online) STAGED (m1200_2-G-6).', frag(Q.L1289, 'Durch Online-Monitoring', ' Die Mess-wertaktualisierung')),
  eq('M12002-13', 'M12002-13-D3', 'alarm_verzoegerung_max_calc = max_rows(betriebsparameter, alarm_verzoegerung_min, alarm_verzoegerung_min IS NOT NULL)', ['betriebsparameter'], 'min', '§6.4',
    'Plan 3: größte eingetragene Alarmverzögerung über die Zeilen ("Abweichungen vom zulässigen Betriebsfenster sollten je nach System nach 5 min bis 30 min eine Alarmierung auslösen", L1289 — SR-2: der Bereich wird angezeigt, geprüft wird das prod-Gate-Maximum 30 min); Zeilen ohne Eintrag zählen nicht; Übernahme als alarm_verzoegerung_min / REQ-11 STAGED (m1200_2-D-8 / -G-6).', Q.L1289),

  // ---- M12002-15: cost items → Σ ----
  eq('M12002-15', 'M12002-15-D1', 'kosten_summe_calc = sum_rows(kostenpositionen, kostenkennwert)', ['kostenpositionen'], '€/m³ SW', '§8.2',
    'Plan 3: Σ der Kostenkennwerte über die Verfahrensstufen — Text-Ableitung: §8.2 druckt spezifische Kosten je Stufe (L1450 "Für die einzelnen Stufen der Wasseraufbereitung sind nachfolgend spezifische Kosten … wiedergegeben"), keine Summenformel (m1200_2-F-1); Übernahme als kostenkennwert_aufbereitung STAGED (m1200_2-D-9).', Q.L1450),
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
