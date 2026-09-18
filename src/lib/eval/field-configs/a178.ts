/**
 * DWA-A-178 — Plan 3 Task 14 field configs (Teilflächen / Frachtpfade /
 * Iterationen / Betriebsbefunde registers, the Vorstufentyp select, Tab.-1 and
 * §6.1.4.5 fills, `system_type` / `becken_typ` / `rrl_vorhanden` visibility) as
 * DATA for `scripts/regulation-tables/emit-field-configs-sql.ts a178`.
 *
 * Every `verification_quote` is lifted verbatim from the transcript
 * `Desktop\Guidelines\DWA-A-178\DWA-A_178.md` (the `Q` spans of the seed module,
 * line in the key). Prod facts come from the captured `a178.prior.json`
 * (2026-09-18, read-only): every worksheet carries the generic sections
 * A Purpose · B Input Parameters · C Worksheet-Specific Content · D Results /
 * Derived Values · F · I · J · K · L · M; created inputs / selects go to B,
 * registers to C, derived outputs to D.
 *
 * Placement facts that shaped this module (the capture, not the brief):
 *   - `system_type` (A178-02) is consumed by A178-04 / -06 / -09 ONLY. Every rule
 *     keyed on it on another worksheet (-07 v_spez_grobstoff, -10 A_F_strasse,
 *     -17 t_RR_E_n1) is emitted and stays `pending` = visible and inert until
 *     the consumer edit a178-C-1 (fll_gar trap 1) — the same edit the prod gates
 *     REQ-09 / -10 / -12 / -21 need (a178-X-1). The §6.1.4.5 h_FK fill therefore
 *     sits on A178-02 beside its key (a262e trap 1); the existing `h_FK_required`
 *     (-07) keeps its input — re-bind STAGED (a178-E-1).
 *   - the Teilflächen register lives on A178-04 (where `A_E_b_a_i` / `A_E_b_a`
 *     live and `system_type` IS inherited); A178-04 does NOT inherit `b_R_a`
 *     (-06) or `e_0` (-07), so both are per-row columns (Gl. 2 / 3 print them
 *     inside the Σ — a178-J-2) and the two Σ live on -04 (m277e trap 2; the
 *     brief's A178-09-D1 could never be register-fed there) → a178-R-1 re-points
 *     Gl. 2 / 3.
 *   - the Frachtpfade register lives on A178-13 (C_RBFA_zu, eta_VS, A_F,
 *     becken_typ, rrl_vorhanden are all in scope there); one row-Σ reproduces
 *     Gl. 5 / 6 / 7 (a178-R-2) and the per-path loads (L967–L970 in words,
 *     a178-F-2) give B_RBF_ab_calc; B_VS lives on -14 and is not inherited, so the
 *     brief's `B_RBFA_ab_calc = Σ + B_VS` is STAGED with the consumer edit (R-4).
 *   - `eta_VS` (-13) is self-consumed only (not a producer, Task 12b) but a
 *     lookup_fill re-bind turns the input read-only while `vorstufe_typ` is
 *     unset (amendment J) → twin `eta_VS_tab1` beside the created select,
 *     re-bind STAGED (a178-E-2).
 *
 * Deliberately NOT here (each on the sign-off sheet; STAGED SQL in
 * scripts/verification/a178-STAGED-plan3-rulings.sql):
 *   - `e_0` ← Misch: consumed by A178-09 (producer) → a178-C-2;
 *   - `VQ_FU` / `eta_RR` ← Durchlauf, `VQ_Dr_RRL` / `eta_RRL` / `B_RRL` ← RRL:
 *     inputs of Gl. 6 / 7 / 11 whose outputs b_F / B_RBFA_ab are consumed by -16
 *     (transitive guard) → a178-C-3;
 *   - `n_RBF` ← Misch: read by the unguarded gate REQ-22 on -17 → a178-G-1;
 *   - the Nachweis waiver on A178-12 … -16 as section rules: every field-bearing
 *     section holds a consumed producer, the drivers are not inherited there and
 *     the field-less sections would be inert (Task 8 lesson) → a178-C-4;
 *   - `attest_a178_12_req_11` under the WSG condition: gate-bearing (REQ-11) →
 *     the created attestation on -02 + a178-G-3.
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import { Q, VORSTUFE_TYPEN } from '../regulation-tables-seed-a178';

const STD = 'DWA-A-178';

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS02 = on('A178-02');
const WS04 = on('A178-04');
const WS05 = on('A178-05');
const WS07 = on('A178-07');
const WS10 = on('A178-10');
const WS11 = on('A178-11');
const WS13 = on('A178-13');
const WS17 = on('A178-17');
const WS18 = on('A178-18');

export const MISCH = "system_type == 'misch'";
export const TRENN_STRASSE = "system_type IN {'trenn', 'strasse'}";
export const STRASSE = "system_type == 'strasse'";
export const STRASSE_WSG = "system_type == 'strasse' AND wasserschutzgebiet != 'zone_none'";
export const RRL = 'rrl_vorhanden == true';

/** Gl. 2 (L723) vs Gl. 3 (L730) per Teilfläche i, switched on the inherited `system_type`; e_0 is printed in % (L739) → /100 (a178-J-6). */
export const B_ROW_EXPR = `if(${MISCH}, a_e_b_a_i * b_r_a_i * e_0_i / 100, a_e_b_a_i * b_r_a_i)`;
/** Tab. 1 (L870) Rechenwert of the path's component: Filterablauf → η_F, Filterbeckenüberlauf → η_RR, RRL-Drossel → η_RRL. */
export const ETA_TAB1_EXPR = "if(pfad == 'dr_rbf', lookup('TABELLE1', 'f', 'eta_afs63'), if(pfad == 'fue', lookup('TABELLE1', 'rr', 'eta_afs63'), lookup('TABELLE1', 'rrl', 'eta_afs63')))";
/** A path is part of the configuration Gl. 5 / 6 / 7 name: FÜ only for Durchlauffilterbecken (L819), the RRL drain only with a Regenrückhaltelamelle (L826). */
export const ZULAESSIG_EXPR = "if(pfad == 'fue', if(becken_typ == 'durchlauf', 1, 0), if(pfad == 'dr_rrl', if(rrl_vorhanden == true, 1, 0), 1))";
/** Per-path load leaving the Retentionsbodenfilterbecken — the complement of the retained term VQ·η·C_RBFA,zu·(1−η_VS) of Gl. 5–7 (L815 / L822 / L829); not printed as an equation (a178-F-2). */
export const B_AB_EXPR = 'vq_m3 * C_RBFA_zu * (1 - eta_VS) * (1 - eta_tab1) / 1000';

/** L799 / L801 / L802 — the three Abflussvolumina of the Langzeitsimulation that carry an η in Gl. 5–7. */
export const FRACHTPFADE = [
  { value: 'dr_rbf', label_de: 'Drosselorgan des Retentionsbodenfilterbeckens (VQ_Dr,RBF · η_F)' },
  { value: 'fue', label_de: 'Filterbeckenüberlauf (VQ_FÜ · η_RR)' },
  { value: 'dr_rrl', label_de: 'Drosselorgan der Regenrückhaltelamelle (VQ_Dr,RRL · η_RRL)' },
] as const;

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- A178-02: system_type is the master switch (its own worksheet) ----
  WS02({
    symbol: 'spezifische_ziele_formuliert', widget: 'attestation', ui_config: null, visible_when: STRASSE, // L781 / L786 / L794
    verification_quote: `${Q.L781} — ${Q.L794}`,
    create: { section_code: 'B', label_de: 'Spezifische Reinigungs-/Behandlungsziele durch die Aufsichtsbehörden formuliert (Straßenabflüsse)', data_type: 'boolean', unit: null, clause_reference: '§6.2.2.2, §6.2.2.3',
      description: 'Plan 3: Nein = vereinfachte Bemessung nach §6.2.2.2 (A_F = 100 m²/ha A_E,b,a, h_RR ≥ 0,5 m) und Verzicht auf das Nachweisverfahren (§6.2.2.3); Ja = Bemessung und Nachweis wie im Trennsystem. Das Ausblenden der Nachweis-Arbeitsblätter A178-12…-16 ist STAGED (a178-C-4), das Gate A_F ≥ A_F_strasse STAGED (a178-G-4).' },
  }),
  WS02({
    symbol: 'leichtfluessigkeitsfang_vorgesehen', widget: 'attestation', ui_config: null, visible_when: STRASSE_WSG, // L683
    verification_quote: Q.L683,
    create: { section_code: 'B', label_de: 'Zusätzlicher Auffangraum für Leichtflüssigkeiten gemäß RiStWag vorgesehen (Straßenentwässerung im Wasserschutzgebiet)', data_type: 'boolean', unit: null, clause_reference: '§6.2.1.3',
      description: 'Plan 3: nur sichtbar für Straßenentwässerung innerhalb eines Wasserschutzgebiets (wasserschutzgebiet ≠ zone_none); außerhalb gelten die Vorgaben für das Trennsystem. Das bestehende Attest auf A178-12 (REQ-11) bleibt; die bedingte Gate-Fassung ist STAGED (a178-G-3).' },
  }),
  WS02({
    symbol: 'h_FK_min_tab', widget: 'lookup_fill', ui_config: { source_label: '§6.1.4.5' },
    lookup: { table_code: 'S6_1_4_5', role: 'limit', keys: [{ column: 'system_type', from_symbol: 'system_type' }], value: 'h_fk_min_m' },
    verification_quote: `${Q.L589} ${Q.L590} ${Q.L591}`,
    create: { section_code: 'B', label_de: 'Erforderliche Höhe des Filterkörpers h_FK nach §6.1.4.5 (Mischsystem ≥ 0,75 m; Trennsystem und Straßenentwässerung ≥ 0,50 m)', data_type: 'number', unit: 'm', clause_reference: '§6.1.4.5',
      description: 'Plan 3: aus dem Entwässerungssystemtyp gefüllt (locked); das Eingabefeld h_FK_required auf A178-07 bleibt — Umstellung STAGED (a178-E-1); REQ-12 auf A178-12 liest system_type / h_FK_required, die dort nicht vererbt sind (a178-X-1 / C-1).' },
  }),

  // ---- A178-04: Teilflächen register (Gl. 2 / Gl. 3) ----
  WS04({
    symbol: 'teilflaechen_178', widget: 'register',
    ui_config: {
      title: 'Befestigte, angeschlossene Teilflächen A_E,b,a,i', subtitle: 'Gl. (2) Trennsystem / Gl. (3) Mischsystem — je Teilfläche i eine Zeile; die Summen → A_E,b,a und B_RBF,zu', add_label: '+ Teilfläche', placement: 'section',
      columns: [
        { key: 'label', label: 'Teilfläche', type: 'text', required: true },
        { key: 'a_e_b_a_i', label: 'A_E,b,a,i', type: 'number', unit: 'ha', required: true, min: 0, aria_label: 'Befestigte, angeschlossene Teilfläche A_E,b,a,i' },
        { key: 'b_r_a_i', label: 'b_R,a', type: 'number', unit: 'kg/(ha·a)', required: true, min: 0, placeholder: 'Rechenwert 530', aria_label: 'Spezifisches AFS63-Jahresfrachtpotenzial b_R,a der Teilfläche' },
        { key: 'b_r_a_rechenwert', label: 'Rechenwert b_R,a (§6.2.2.1)', type: 'derived', expr: "lookup('S6_2_RECHENWERTE', 'b_r_a', 'wert')" },
        { key: 'abw_rechenwert', label: 'b_R,a', type: 'derived', expr: 'if(b_r_a_i == b_r_a_rechenwert, 0, 1)', display: 'badge', value_labels: { '0': 'Rechenwert', '1': 'abweichend vom Rechenwert (Messwert / Nachweisführung)' } },
        { key: 'e_0_i', label: 'e_0', type: 'number', unit: '%', required: true, min: 0, max: 100, visible_when: MISCH, aria_label: 'Mittlere Jahresentlastungsrate der Vorstufe e_0 (Mischsystem)' },
        { key: 'b_row', label: 'Fracht der Teilfläche', type: 'derived', expr: B_ROW_EXPR, unit: 'kg/a' },
      ],
      footer: ['A_E_b_a_calc', 'B_RBF_zu_calc', 'teilflaechen_count'],
      note: `${Q.L716} Mischsystem: e_0 je Teilfläche in % (Gl. 3, ${Q.L739}); die Spalte ist im Trenn-/Straßensystem ausgeblendet. Nur vollständige Zeilen gehen in die Summen ein — eine Mischsystem-Zeile ohne e_0 fällt aus B_RBF_zu_calc (und aus A_E_b_a_calc) heraus, bis e_0 eingetragen ist. Der Rechenwert 530 kg/(ha·a) ist zur Vorbemessung anzusetzen; im Nachweis sind alle frachtmindernden Komponenten zu berücksichtigen (§6.2.2.1).`,
    },
    verification_quote: `${Q.L723} — ${Q.L730} — ${Q.L737}`,
    create: { section_code: 'C', label_de: 'Teilflächen im Einzugsgebiet (A_E,b,a,i · b_R,a [· e_0])', data_type: 'json', unit: null, clause_reference: '§6.2.2.1, Gl. (2), Gl. (3)',
      description: 'Plan 3: Zeilen je befestigter, angeschlossener Teilfläche; Σ A_E,b,a,i → A_E_b_a_calc (A178-04-D1), Σ (A_E,b,a,i · b_R,a [· e_0]) → B_RBF_zu_calc (A178-04-D2), Anzahl → teilflaechen_count (-D3). Ablösung des Einzelskalars A_E_b_a_i, der Handeingabe A_E_b_a und der Gl. 2 / 3 auf A178-09 STAGED (a178-D-1 / R-1); b_R,a und e_0 je Zeile statt der Skalare auf A178-06 / -07 (a178-D-2 / D-3).' },
  }),
  WS04({
    symbol: 'A_E_b_a_calc', widget: 'derived', ui_config: null, verification_quote: Q.L915,
    create: { section_code: 'D', label_de: 'A_E,b,a — Summe aller befestigten, angeschlossenen Teilflächen (aus dem Register)', data_type: 'number', unit: 'ha', clause_reference: '§6.2.2.1, Gl. (2)',
      description: 'Plan 3: Ausgabe der Gleichung A178-04-D1 (sum_rows über teilflaechen_178.a_e_b_a_i); Ablösung der Handeingabe A_E_b_a STAGED (a178-D-1).' },
  }),
  WS04({
    symbol: 'B_RBF_zu_calc', widget: 'derived', ui_config: null, verification_quote: `${Q.L723} — ${Q.L730}`,
    create: { section_code: 'D', label_de: 'B_RBF,zu — mittlere jährliche AFS63-Zulauffracht zum Retentionsbodenfilterbecken (Gl. 2 / Gl. 3 aus dem Register)', data_type: 'number', unit: 'kg/a', clause_reference: '§6.2.2.1, Gl. (2), Gl. (3)',
      description: 'Plan 3: Ausgabe der Gleichung A178-04-D2 (sum_rows über teilflaechen_178.b_row — Gl. 2 im Trenn-/Straßensystem, Gl. 3 mit e_0 im Mischsystem, umgeschaltet über system_type); Umstellung der Gl. 2 / 3 auf A178-09 und Übergabe an A178-10 STAGED (a178-R-1 / C-5).' },
  }),
  WS04({
    symbol: 'teilflaechen_count', widget: 'derived', ui_config: null, verification_quote: Q.L737,
    create: { section_code: 'D', label_de: 'Anzahl der erfassten Teilflächen', data_type: 'number', unit: null, clause_reference: '§6.2.2.1, Gl. (2)',
      description: 'Plan 3: Ausgabe der Gleichung A178-04-D3 (count_rows über teilflaechen_178).' },
  }),

  // ---- A178-05: Fremdwasser (§5.2.2) ----
  WS05({
    symbol: 'fremdwasser_massnahmen_geprueft', widget: 'attestation', ui_config: null, visible_when: 'fremdwasser_relevant == true', // L451
    verification_quote: Q.L451,
    create: { section_code: 'B', label_de: 'Fremdwasser: Sanierungsvorschläge erarbeitet und Erfolg der Maßnahmen vor der Planung geprüft (§5.2.2)', data_type: 'boolean', unit: null, clause_reference: '§5.2.2',
      description: 'Plan 3: nur sichtbar, wenn ein Fremdwasserzufluss festgestellt wurde (fremdwasser_relevant); kann der Zufluss nicht beseitigt werden, sind betriebliche Maßnahmen (alternierende Beschickung hydraulisch getrennter Filterbeete) vorzusehen oder der Bau muss unterbleiben. REQ-05 (leere Bedingung) → bedingtes Gate STAGED (a178-G-7).' },
  }),

  // ---- A178-07: Bemessungsparameter — system-driven visibility + printed twins ----
  WS07({
    symbol: 'v_spez_grobstoff', widget: 'scalar', ui_config: null, visible_when: TRENN_STRASSE, // L677 (Trennsystem) + L683 (Straße außerhalb WSG: Vorgaben des Trennsystems)
    verification_quote: `${Q.L677} — ${Q.L683}`,
  }),
  WS07({
    symbol: 'v_spez_grobstoff_min', widget: 'derived', ui_config: null, visible_when: TRENN_STRASSE, verification_quote: Q.L677,
    create: { section_code: 'D', label_de: 'Mindest-Sammelvolumen des Grobstoffrückhalts nach §6.2.1.2 (0,5 m³/ha A_E,b,a)', data_type: 'number', unit: 'm³/ha', clause_reference: '§6.2.1.2',
      description: 'Plan 3: Ausgabe der Gleichung A178-07-D3 (lookup S6_LIMITS v_spez_min); Vorgabe für Trennsystem und Straßenentwässerung; REQ-10 auf A178-12 liest v_spez_grobstoff / system_type, die dort nicht vererbt sind (a178-X-1 / C-1).' },
  }),
  WS07({
    symbol: 'b_krit_tab', widget: 'derived', ui_config: null, verification_quote: Q.L689,
    create: { section_code: 'D', label_de: 'b_krit — maximal zulässige AFS63-Filterflächenbelastung nach §6.2.2.1 (7 kg/(m²·a))', data_type: 'number', unit: 'kg/(m²·a)', clause_reference: '§6.2.2.1, Gl. (9)',
      description: 'Plan 3: Ausgabe der Gleichung A178-07-D1 (lookup S6_LIMITS b_krit); das Eingabefeld b_krit bleibt (a178-D-10); REQ-19 prüft den Literalwert 7 statt b_krit (a178-G-2).' },
  }),
  WS07({
    symbol: 'q_Dr_RBF_vorgabe', widget: 'derived', ui_config: null, verification_quote: `${Q.L767} — ${Q.L639}`,
    create: { section_code: 'D', label_de: 'q_Dr,RBF — konstante Abflussspende für die Vorbemessung nach §6.2.2.1 (0,05 l/(s·m²), zugleich Obergrenze bei Volleinstau §6.1.4.10)', data_type: 'number', unit: 'l/(s·m²)', clause_reference: '§6.1.4.10, §6.2.2.1',
      description: 'Plan 3: Ausgabe der Gleichung A178-07-D2 (lookup S6_2_ANHALT q_dr_rbf_vorbemessung); für die Nachweisrechnung muss die Kennlinie des geplanten Drosselorgans angesetzt werden; das Eingabefeld q_Dr_RBF (REQ-14 ≤ 0,05) bleibt (a178-D-11).' },
  }),

  // ---- A178-10: Straße simplification (A_F = 100 m²/ha) ----
  WS10({
    symbol: 'A_F_strasse', widget: 'derived', ui_config: null, visible_when: STRASSE, verification_quote: `${Q.L781} ${Q.L782}`,
    create: { section_code: 'D', label_de: 'A_F nach §6.2.2.2 (vereinfachte Bemessung Straßenabflüsse: 100 m²/ha · A_E,b,a)', data_type: 'number', unit: 'm²', clause_reference: '§6.2.2.2',
      description: 'Plan 3: Ausgabe der Gleichung A178-10-D1 (lookup S6_2_RECHENWERTE a_f_strasse_m2_ha · A_E_b_a); gilt, wenn keine spezifischen Behandlungsziele formuliert wurden (spezifische_ziele_formuliert auf A178-02); Gate A_F ≥ A_F_strasse STAGED (a178-G-4). Die Sichtbarkeitsregel ist bis zur Vererbung von system_type (a178-C-1) pending.' },
  }),

  // ---- A178-11: V_RBF = V_RR + 15 % · V_FK (§6.2.2.1 Schritt 4) ----
  WS11({
    symbol: 'V_RR', widget: 'scalar', ui_config: null, verification_quote: Q.L775,
    create: { section_code: 'C', label_de: 'V_RR — Volumen des Retentionsraums (bis Höhe Filterbeckenüberlauf)', data_type: 'number', unit: 'm³', clause_reference: '§6.2.2.1 Schritt 4',
      description: 'Plan 3: Eingabe aus der Geometrie des Retentionsraums (Böschungsneigung nach örtlicher Situation, §6.2.2.1); Summand von V_RBF_calc (A178-11-D1).' },
  }),
  WS11({
    symbol: 'V_FK', widget: 'scalar', ui_config: null, verification_quote: Q.L775,
    create: { section_code: 'C', label_de: 'V_FK — Filterkörpervolumen', data_type: 'number', unit: 'm³', clause_reference: '§6.2.2.1 Schritt 4',
      description: 'Plan 3: Eingabe (Bodenfilteroberfläche · Höhe des Filterkörpers im konsolidierten Zustand); 15 % davon gehen als nutzbares Porenvolumen in V_RBF_calc (A178-11-D1) ein.' },
  }),
  WS11({
    symbol: 'V_RBF_calc', widget: 'derived', ui_config: null, verification_quote: Q.L775,
    create: { section_code: 'D', label_de: 'V_RBF — nutzbares Volumen des Retentionsbodenfilterbeckens (V_RR + 15 % · V_FK)', data_type: 'number', unit: 'm³', clause_reference: '§6.2.2.1 Schritt 4',
      description: 'Plan 3: Ausgabe der Gleichung A178-11-D1 (V_RR + Porenvolumen 15 % des Filterkörpervolumens, lookup S6_2_RECHENWERTE); das Eingabefeld V_RBF bleibt — Ablösung STAGED (a178-D-8); die Formel ist im Arbeitsblatt in Worten beschrieben (a178-F-3).' },
  }),
  WS11({
    symbol: 'V_RRL', widget: 'scalar', ui_config: null, visible_when: RRL, // L777 "gegebenenfalls erforderlichen Regenrückhaltelamelle"; L663
    verification_quote: `${Q.L777} — ${Q.L663}`,
  }),

  // ---- A178-13: Vorstufentyp → η_VS, Frachtpfade register (Gl. 5 / 6 / 7) ----
  WS13({
    symbol: 'vorstufe_typ', widget: 'select_one', ui_config: null,
    enum_values: VORSTUFE_TYPEN.map((v, i) => ({ value: v.value, label_de: v.label_de, order_index: i })),
    verification_quote: `${Q.L873} — ${Q.L671}`,
    create: { section_code: 'B', label_de: 'Vorstufentyp (Tabelle 1, Anmerkung 1: RKB q_A ≤ 10 m/h / RÜB-DB → η_VS = 0,2; sonst 0)', data_type: 'enum', unit: null, clause_reference: '§6.2.2.3 Tab. 1 Anmerkung 1), §6.2.1.1',
      description: 'Plan 3: Treiber der Tab.-1-Fußnote (füllt eta_VS_tab1; das Eingabefeld eta_VS bleibt — Umstellung STAGED, a178-E-2). „Stauraumkanal mit unten liegender Entlastung“: die Ausnahme e_0 > 55 % im Bestand ist nicht zulässig (§6.2.1.1; Gate STAGED a178-G-6). Tokens und Beschriftungen sind Sache des Eigentümers (a178-J-1).' },
  }),
  WS13({
    symbol: 'eta_VS_tab1', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 1 Anm. 1)' },
    lookup: { table_code: 'TABELLE1_VS', role: 'value', keys: [{ column: 'vorstufe_typ', from_symbol: 'vorstufe_typ' }], value: 'eta_vs' },
    verification_quote: Q.L873,
    create: { section_code: 'B', label_de: 'η_VS — Frachtrückhaltegrad der Vorstufe nach Tabelle 1 (0; bei RKB q_A ≤ 10 m/h oder RÜB-DB kann 0,2 angesetzt werden)', data_type: 'number', unit: '-', clause_reference: '§6.2.2.3 Tab. 1 Anmerkung 1)',
      description: 'Plan 3: aus dem Vorstufentyp gefüllt; Policy „kann“ = Wahl zwischen den gedruckten Alternativen 0 / 0,2 (die Auswahl steht auch für Zeilen mit Basiswert 0 offen — a178-O-4); das Eingabefeld eta_VS (Gl. 5–7) bleibt — Umstellung STAGED (a178-E-2).' },
  }),
  WS13({
    symbol: 'frachtpfade', widget: 'register',
    ui_config: {
      title: 'Abflusspfade der Langzeitsimulation (Gl. 5 / 6 / 7)', subtitle: 'je Pfad das mittlere jährliche Abflussvolumen VQ; η aus Tabelle 1; Fangfilterbecken: nur Drosselabfluss RBF — Durchlauffilterbecken: + Filterbeckenüberlauf — mit Regenrückhaltelamelle: + RRL-Drossel', add_label: '+ Abflusspfad', placement: 'section',
      columns: [
        { key: 'pfad', label: 'Abflusspfad', type: 'enum', required: true, options: FRACHTPFADE.map((p) => p.value), option_labels: Object.fromEntries(FRACHTPFADE.map((p) => [p.value, p.label_de])) },
        { key: 'vq_m3', label: 'VQ', type: 'number', unit: 'm³/a', required: true, min: 0, aria_label: 'Mittleres jährliches Abflussvolumen VQ des Pfads' },
        { key: 'eta_tab1', label: 'η (Tab. 1)', type: 'derived', expr: ETA_TAB1_EXPR },
        { key: 'zulaessig', label: 'Konfiguration', type: 'derived', expr: ZULAESSIG_EXPR, display: 'badge', value_labels: { '1': 'zur Anlagenkonfiguration passend', '0': 'nicht zur Anlagenkonfiguration passend (Beckentyp / RRL)' } },
        { key: 'b_ab', label: 'Frachtaustrag des Pfads', type: 'derived', expr: B_AB_EXPR, unit: 'kg/a' },
      ],
      footer: ['b_F_calc', 'B_RBF_ab_calc', 'frachtpfade_unzulaessig'],
      note: `${Q.L797} ${Q.L799} ${Q.L801} ${Q.L802} Die Rechenwerte η_F = 0,95 / η_RR = 0,50 / η_RRL = 0,60 (Tab. 1) sind zur Anwendung in Gl. (5) bis Gl. (7) festgelegt (locked); der nach Gl. (13) ausgewertete η_F ist eine eigene Größe (a178-R-3).`,
    },
    verification_quote: `${Q.L815} — ${Q.L822} — ${Q.L829}`,
    create: { section_code: 'C', label_de: 'Abflusspfade der Langzeitsimulation (VQ_Dr,RBF / VQ_FÜ / VQ_Dr,RRL mit η nach Tabelle 1)', data_type: 'json', unit: null, clause_reference: '§6.2.2.3, Gl. (5)–(7), Tab. 1',
      description: 'Plan 3: eine Zeile je Abflusspfad; Σ (VQ · η) · C_RBFA,zu · (1 − η_VS) / (A_F · 1.000) → b_F_calc (A178-13-D1, reproduziert Gl. 5 / 6 / 7 je nach erfassten Pfaden), Σ Frachtaustrag → B_RBF_ab_calc (-D3), Pfade außerhalb der Anlagenkonfiguration → frachtpfade_unzulaessig (-D4). Ablösung der Skalare VQ_Dr_RBF / VQ_FU / VQ_Dr_RRL / eta_RR / eta_RRL und der drei Gl.-5/6/7-Zeilen STAGED (a178-D-4 / D-5 / R-2).' },
  }),
  WS13({
    symbol: 'b_F_calc', widget: 'derived', ui_config: null, verification_quote: `${Q.L815} — ${Q.L822} — ${Q.L829}`,
    create: { section_code: 'D', label_de: 'b_F — mittlere jährliche spezifische Bodenfilteroberflächenbelastung (AFS63) aus den Abflusspfaden', data_type: 'number', unit: 'kg/(m²·a)', clause_reference: '§6.2.2.3, Gl. (5)–(7)',
      description: 'Plan 3: Ausgabe der Gleichung A178-13-D1 — die eine Zeilensumme, die Gl. 5 (nur Drosselabfluss), Gl. 6 (+ Filterbeckenüberlauf) und Gl. 7 (+ RRL-Drossel) je nach erfassten Pfaden wiedergibt; Umstellung der drei Gleichungszeilen und Übergabe an A178-16 STAGED (a178-R-2 / C-5); Prüfung 4 ≤ b_F ≤ b_krit (Gl. 9) auf b_F_calc STAGED (a178-G-5).' },
  }),
  WS13({
    symbol: 'C_RBF_zu_calc', widget: 'derived', ui_config: null, verification_quote: `${Q.L975} — ${Q.L815}`,
    create: { section_code: 'D', label_de: 'C_RBF,zu — mittlere Konzentration im Zulauf zum Retentionsbodenfilterbecken (C_RBFA,zu · (1 − η_VS))', data_type: 'number', unit: 'mg/l', clause_reference: '§6.2.2.3 b), Gl. (5)–(7)',
      description: 'Plan 3: Ausgabe der Gleichung A178-13-D2 — mit η_VS = 0 gleich C_RBFA,zu nach Gl. (8), sonst die „entsprechende Abminderung“ um den Faktor (1 − η_VS), der in Gl. (5) bis (7) gedruckt ist (in Worten beschrieben, a178-F-1); das Eingabefeld C_RBF_zu auf A178-12 bleibt (a178-D-6).' },
  }),
  WS13({
    symbol: 'B_RBF_ab_calc', widget: 'derived', ui_config: null, verification_quote: Q.L967_970,
    create: { section_code: 'D', label_de: 'B_RBF,ab — mittlerer jährlicher Frachtaustrag aus dem Retentionsbodenfilterbecken (Σ der Abflusspfade)', data_type: 'number', unit: 'kg/a', clause_reference: '§6.2.2.3 b), Gl. (11)',
      description: 'Plan 3: Ausgabe der Gleichung A178-13-D3 (Σ VQ · C_RBFA,zu · (1 − η_VS) · (1 − η) / 1.000 über die Pfade = Restfracht filtriert + Entlastung über den Filterbeckenüberlauf + RRL, wie zu Gl. 13 beschrieben; Pfadform in Worten, a178-F-2); die Eingabefelder B_Dr_RBF / B_FU / B_RRL / B_RBF_ab auf A178-14 bleiben (a178-D-7); B_RBFA,ab = Σ + B_VS (Gl. 11) ist STAGED (a178-R-4).' },
  }),
  WS13({
    symbol: 'frachtpfade_unzulaessig', widget: 'derived', ui_config: null, verification_quote: `${Q.L819} — ${Q.L826}`,
    create: { section_code: 'D', label_de: 'Abflusspfade außerhalb der Anlagenkonfiguration (Filterbeckenüberlauf ohne Durchlauffilterbecken, RRL-Drossel ohne Regenrückhaltelamelle)', data_type: 'number', unit: null, clause_reference: '§6.2.2.3, Gl. (5)–(7)',
      description: 'Plan 3: Ausgabe der Gleichung A178-13-D4 (count_rows über frachtpfade mit zulaessig == 0, aus becken_typ und rrl_vorhanden); Gate „= 0“ STAGED (a178-G-5).' },
  }),

  // ---- A178-17: Misch-only Kenngröße ----
  WS17({
    symbol: 't_RR_E_n1', widget: 'scalar', ui_config: null, visible_when: MISCH, // L806 "(Mischsystem)", L979
    verification_quote: `${Q.L806} — ${Q.L979}`,
  }),

  // ---- A178-18: Iterationen (§6.2.2.4) + Betriebsbefunde (Tab. 2) ----
  WS18({
    symbol: 'iterationen', widget: 'register',
    ui_config: {
      title: 'Iterationsschritte (§6.2.2.4)', subtitle: 'A_F und/oder h_RR so lange variieren, bis alle Vorgaben und Nachweise erfüllt sind — je Schritt eine Zeile (Reihenfolge = Eingabereihenfolge)', add_label: '+ Iterationsschritt', placement: 'section',
      columns: [
        { key: 'schritt', label: 'Schritt', type: 'number', required: true, min: 1 },
        { key: 'a_f', label: 'A_F', type: 'number', unit: 'm²', required: true, min: 0, aria_label: 'Bodenfilteroberfläche A_F im Iterationsschritt' },
        { key: 'h_rr', label: 'h_RR', type: 'number', unit: 'm', min: 0, aria_label: 'Einstauhöhe h_RR im Iterationsschritt' },
        { key: 'v_rbf', label: 'V_RBF', type: 'number', unit: 'm³', min: 0, aria_label: 'Nutzbares Volumen V_RBF im Iterationsschritt' },
        { key: 'b_f', label: 'b_F', type: 'number', unit: 'kg/(m²·a)', required: true, min: 0, aria_label: 'Bodenfilteroberflächenbelastung b_F im Iterationsschritt' },
        { key: 'konvergiert', label: 'alle Vorgaben und Nachweise erfüllt', type: 'boolean' },
      ],
      footer: ['iteration_count_calc', 'A_F_last', 'b_F_last', 'iterationen_konvergiert'],
      note: `${Q.L983} Der letzte vollständige Schritt (Eingabereihenfolge) liefert A_F_last / b_F_last.`,
    },
    verification_quote: Q.L983,
    create: { section_code: 'C', label_de: 'Iterationsschritte (A_F, h_RR, V_RBF, b_F je Schritt)', data_type: 'json', unit: null, clause_reference: '§6.2.2.4',
      description: 'Plan 3: Zeilen je Iterationsschritt; Anzahl → iteration_count_calc (A178-18-D1), letzter Schritt → A_F_last / b_F_last (-D2 / -D3), erfüllte Schritte → iterationen_konvergiert (-D4). Ablösung der Einzelwerte A_F_iterated / V_RBF_iterated / b_F_iterated / iteration_count / convergence_achieved STAGED (a178-D-9).' },
  }),
  WS18({
    symbol: 'iteration_count_calc', widget: 'derived', ui_config: null, verification_quote: Q.L983,
    create: { section_code: 'D', label_de: 'Anzahl der Iterationsschritte (aus dem Register)', data_type: 'number', unit: null, clause_reference: '§6.2.2.4',
      description: 'Plan 3: Ausgabe der Gleichung A178-18-D1 (count_rows über iterationen); das Eingabefeld iteration_count bleibt (a178-D-9).' },
  }),
  WS18({
    symbol: 'A_F_last', widget: 'derived', ui_config: null, verification_quote: Q.L983,
    create: { section_code: 'D', label_de: 'A_F des letzten Iterationsschritts', data_type: 'number', unit: 'm²', clause_reference: '§6.2.2.4',
      description: 'Plan 3: Ausgabe der Gleichung A178-18-D2 (sum_rows über last_rows(iterationen, 1)); das Eingabefeld A_F_iterated bleibt (a178-D-9).' },
  }),
  WS18({
    symbol: 'b_F_last', widget: 'derived', ui_config: null, verification_quote: Q.L983,
    create: { section_code: 'D', label_de: 'b_F des letzten Iterationsschritts', data_type: 'number', unit: 'kg/(m²·a)', clause_reference: '§6.2.2.4',
      description: 'Plan 3: Ausgabe der Gleichung A178-18-D3 (sum_rows über last_rows(iterationen, 1)); das Eingabefeld b_F_iterated bleibt (a178-D-9).' },
  }),
  WS18({
    symbol: 'iterationen_konvergiert', widget: 'derived', ui_config: null, verification_quote: Q.L983,
    create: { section_code: 'D', label_de: 'Iterationsschritte, in denen alle Vorgaben und Nachweise erfüllt sind', data_type: 'number', unit: null, clause_reference: '§6.2.2.4',
      description: 'Plan 3: Ausgabe der Gleichung A178-18-D4 (count_rows über iterationen mit konvergiert == true); REQ-24 liest weiterhin das Boolean convergence_achieved (a178-D-9).' },
  }),
  WS18({
    symbol: 'betriebsbefunde', widget: 'register',
    ui_config: {
      title: 'Sichtkontrolle — einfache Indikatoren (Tabelle 2)', subtitle: '§8.3.1 — je Begehung und Befund eine Zeile; der Hinweis auf den Betriebszustand kommt aus Tabelle 2', add_label: '+ Befund', placement: 'section',
      columns: [
        { key: 'datum', label: 'Datum der Begehung', type: 'date' },
        { key: 'befund', label: 'Befund', type: 'lookup_key', required: true, lookup: { table_code: 'TABELLE2', group_by: 'group_label' } },
        { key: 'bereich', label: 'Bereich', type: 'lookup_value', lookup: { table_code: 'TABELLE2', key_column: 'befund', value: 'bereich' } },
        { key: 'hinweis', label: 'Hinweis auf', type: 'lookup_value', lookup: { table_code: 'TABELLE2', key_column: 'befund', value: 'hinweis' } },
        { key: 'bemerkung', label: 'Bemerkung / Maßnahme', type: 'text' },
      ],
      footer: ['befunde_count'],
      note: Q.L1078,
    },
    verification_quote: `${Q.L1078} — ${Q.L1085}`,
    create: { section_code: 'C', label_de: 'Betriebsbefunde der Sichtkontrolle (Tabelle 2: Bereich · Befund · Hinweis auf)', data_type: 'json', unit: null, clause_reference: '§8.3.1, Tab. 2',
      description: 'Plan 3: Zeilen je Befund mit Bereich und Hinweis aus Tabelle 2 (anhaltswert); Anzahl → befunde_count (A178-18-D5). Tabelle 2 hatte bisher kein Feldziel.' },
  }),
  WS18({
    symbol: 'befunde_count', widget: 'derived', ui_config: null, verification_quote: Q.L1078,
    create: { section_code: 'D', label_de: 'Anzahl der erfassten Betriebsbefunde', data_type: 'number', unit: null, clause_reference: '§8.3.1',
      description: 'Plan 3: Ausgabe der Gleichung A178-18-D5 (count_rows über betriebsbefunde).' },
  }),
];

/**
 * No section rules: the Nachweis waiver for Straßenabflüsse without specific goals (A178-12 … -16, L794) cannot be
 * a section rule today — every field-bearing section of those worksheets holds a producer another worksheet consumes
 * (C_RBFA_zu → -13, VQ_RBF_zu / C_RBF_zu → -15, b_F → -16, B_RBF_ab / B_RBFA_ab → -15 / -16, eta_RBF_hyd → -19,
 * n_FU → -17), the drivers (system_type, spezifische_ziele_formuliert) are not inherited there, and the field-less
 * sections would be inert rules (Task 8 lesson). STAGED as a178-C-4.
 */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
