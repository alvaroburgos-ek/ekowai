/**
 * DIN-276 — Plan 3 Task 13 field configs (the stage × KG matrix, one KG-item
 * register per KG worksheet, the Sonderkosten / Vergabeeinheiten / Abweichungen /
 * Flurstücke / Kennwert-Quellen registers, the Tab.-2 reference-unit selector +
 * fills on the Kennwert analysis, visibility) as DATA for
 * `scripts/regulation-tables/emit-field-configs-sql.ts din276`.
 *
 * Every `verification_quote` is lifted verbatim from the transcript
 * `Desktop\Guidelines\DWA DIN Scribd\DIN-276\DIN-276.md` (the `Q` spans of the
 * seed module, line in the key). Prod facts come from the captured
 * `din276.prior.json` (2026-09-18, read-only): every worksheet carries the flat
 * sections A … M (fields in B / C / D / F / L); the eight KG worksheets add one
 * coded section per second-level KG ("KG 110", "KG 120", …, parent C) holding the
 * typed `kg_NNN` inputs; 12 of 544 fields are orphans (the `attest_*` booleans).
 * Registers are created in C, their outputs in D, the selector / fills in C.
 *
 * Placement rules applied (a register-fed equation lives on the register's
 * worksheet — the engine sees a register of its own worksheet only, m277e trap 2;
 * a `create` never sets `consumer_worksheets`):
 *   - the stage × KG matrix and every derivation over it (per-stage Σ, current /
 *     previous stage, deviation) live on DIN-276-18 (Kostenrahmen); the -26 / -27
 *     inputs `current_stage_total` / `previous_stage_total` / `KK_*` /
 *     `deviation_percentage` stay and are D-blocks with the STAGED consumer edit
 *     din276-C-3 (the brief's "-26-D1 / -27-D1" placement is impossible as data).
 *   - ONE KG-item register per KG worksheet (`kg1_positionen` on -09 … `kg8_positionen`
 *     on -16) instead of the brief's single register on -09: the Σ per second-level KG
 *     must sit beside the prod `kg_NN0_total` it twins (D-blocks din276-D-3), which
 *     lives on that KG's worksheet. The row picker offers the whole Table 1 (grouped
 *     by parent KG); a row picked under the wrong first-level KG is flagged by the
 *     `im_kg` badge and excluded from every Σ (m820_3 pattern).
 *   - the Tab.-2 selector + fills sit on DIN-276-24 (the Kennwert analysis, where
 *     prod's `reference_unit` / `cost_parameter` live); `reference_unit` (a NUMBER —
 *     the quantity of the reference unit, IDENT-03 input) is NOT re-bound (amendment J):
 *     the printed unit / designation / determination are TEXT twins beside it.
 *
 * Consumer tokens: prod declares most cross-worksheet consumers as RANGE strings
 * (`"DIN-276-09..16"`, `"DIN-276-02..29"`, `"DIN-276-18..22"`) which
 * `loadInheritedFields` (`code = ANY(consumer_worksheets)`) never matches (fll_gar
 * trap 1) — `applicable_cost_groups`, `planning_stage_active`, `cost_breakdown_depth`,
 * `vat_treatment`, `separate_calculations_per_building`, `building_count` reach NO
 * worksheet today (din276-C-1 STAGED). Rules keyed on them are emitted only where the
 * target is consumer-free (they read `pending` = visible, inert, until C-1).
 *
 * NOT here (each a sign-off block; STAGED SQL in scripts/verification/din276-STAGED-plan3-rulings.sql):
 *   KG worksheet / stage worksheet sections on the two select_many checklists (M-1 / M-2);
 *   the 266 third-level `kg_NNN` inputs by `cost_breakdown_depth` (every one feeds a
 *   roll-up whose first-level total is consumed by -17 / -23 — transitive producer guard,
 *   C-2); `separate_calculations_per_building`, `existing_substance_value`, the -28 limits
 *   (consumed / refuted by L416, C-4 / J-5); the free-text → select retypes (T-1 … T-3);
 *   REQ-10 … 14 onto the Sonderkosten sums (G-2); every register ↔ scalar pair (D-1 … D-9).
 */
import type { FieldConfigEntry, SectionVisibilityEntry } from './types';
import { Q, T1_ROWS, T2_ROWS, KG_LEVEL1, STAGE_TOKENS, STAGE_LABELS, SONDERKOSTEN_ART, SONDERKOSTEN_LABELS } from '../regulation-tables-seed-din276';
import type { RegisterUiConfig } from '../field-config';

const STD = 'DIN-276';
const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS04 = on('DIN-276-04');
const WS07 = on('DIN-276-07');
const WS08 = on('DIN-276-08');
const WS18 = on('DIN-276-18');
const WS21 = on('DIN-276-21');
const WS23 = on('DIN-276-23');
const WS24 = on('DIN-276-24');
const WS27 = on('DIN-276-27');

const EUR = 'EUR';
const TABLE1_KG_COLUMN = { key: 'kg', label: 'Kostengruppe (Tab. 1)', type: 'lookup_key', lookup: { table_code: 'TABLE1', group_by: 'group_label' } } as const;
const TABLE1_DESIGNATION = { key: 'bezeichnung', label: 'Bezeichnung (Tab. 1)', type: 'lookup_value', lookup: { table_code: 'TABLE1', key_column: 'kg', value: 'designation' } } as const;

// ---- drivers (prod enum tokens, capture 2026-09-18) ----
/** §4.2.15 L267–L272: the VAT rate matters for the "gross figure" and when VAT "is only shown for individual cost details" (prod token `mixed`). */
export const VAT_RATE_VISIBLE = 'vat_treatment IN {gross, mixed}';

// ---- register row expressions ----
/** §6.2 L1022: Table 2 applies to every KG "Unless further specifications are made under 6.3 and Table 3 as well as under 6.4 and Table 4" — the chain
 * Tab.-4 item (kg, tab4_nr) → Tab.-4 KG row (kg, '0'; a printed-blank unit there = no specification → Tab. 2) → Tab. 3 (every 3xx row carries a
 * printed determination, so a blank Tab.-3 unit stays blank: din276-U-1) → Tab. 2 by the first-level ancestor (`kg1_key`). Routed by `ebene1`
 * (Tab. 3 covers every KG 3xx, Tab. 4 every KG 4xx — no lookup miss; `lookup(…) IS NULL` is not grammar, so the Tab.-4 KG unit is the helper
 * column `tab4_kg_einheit`). Fix round 1. */
export const TAB4_KG_EINHEIT_EXPR = "lookup('TABLE4', kg, '0', 'unit')";
export const EINHEIT_EXPR = "if(tab4_nr IS NULL, if(ebene1 == 'KG 400', if(tab4_kg_einheit IS NULL, lookup('TABLE2', lookup('TABLE1', kg, 'kg1_key'), 'unit'), tab4_kg_einheit), if(ebene1 == 'KG 300', lookup('TABLE3', kg, 'unit'), lookup('TABLE2', lookup('TABLE1', kg, 'kg1_key'), 'unit'))), lookup('TABLE4', kg, tab4_nr, 'unit'))";
/** §3.13 L175 "Value that represents the ratio of costs to a reference unit" — Kosten = Menge · Kennwert (the printed definition, inverted). */
export const KOSTEN_CALC_EXPR = 'menge * kennwert';
/** Typed cost ≠ Menge · Kennwert (only when both are entered; compared to the cent — `round()` is one-argument in `functions.ts`, so |Δ| < 0,005). */
export const ABWEICHUNG_EXPR = 'if(menge IS NULL OR kennwert IS NULL, 0, if(abs(kosten_eur - menge * kennwert) < 0.005, 0, 1))';
export const EBENE1_EXPR = "lookup('TABLE1', kg, 'kg1')";
export const EBENE2_EXPR = "if(lookup('TABLE1', kg, 'level') == 1, '-', lookup('TABLE1', kg, 'kg2'))";
export const imKgExpr = (kg1: string) => `if(ebene1 == '${kg1}', 1, 0)`;
/** Matrix: Σ KG 100–800 (§3.11 L163 "Costs resulting from the sum of cost groups 100 to 800") and building costs (§3.12 L169 "sum of cost groups 300 and 400"). */
export const GESAMT_EXPR = 'kg100 + kg200 + kg300 + kg400 + kg500 + kg600 + kg700 + kg800';
export const BAUWERK_EXPR = 'kg300 + kg400';
/** §4.3.6 L346: the compiled cost "on the basis of the current cost status (offer, order or invoice)". */
export const AKTUELL_EXPR = "if(status == 'rechnung', rechnung_eur, if(status == 'auftrag', auftrag_eur, angebot_eur))";

// ---- the eight KG worksheets (prod codes; capture) ----
export const KG_WORKSHEETS = [
  { n: 1, ws: 'DIN-276-09', kg1: 'KG 100', token: 'kg_100', title: 'KG 100 — Grundstück' },
  { n: 2, ws: 'DIN-276-10', kg1: 'KG 200', token: 'kg_200', title: 'KG 200 — Vorbereitende Maßnahmen' },
  { n: 3, ws: 'DIN-276-11', kg1: 'KG 300', token: 'kg_300', title: 'KG 300 — Bauwerk-Baukonstruktionen' },
  { n: 4, ws: 'DIN-276-12', kg1: 'KG 400', token: 'kg_400', title: 'KG 400 — Bauwerk-Technische Anlagen' },
  { n: 5, ws: 'DIN-276-13', kg1: 'KG 500', token: 'kg_500', title: 'KG 500 — Außenanlagen & Freiflächen' },
  { n: 6, ws: 'DIN-276-14', kg1: 'KG 600', token: 'kg_600', title: 'KG 600 — Ausstattung & Kunstwerke' },
  { n: 7, ws: 'DIN-276-15', kg1: 'KG 700', token: 'kg_700', title: 'KG 700 — Baunebenkosten' },
  { n: 8, ws: 'DIN-276-16', kg1: 'KG 800', token: 'kg_800', title: 'KG 800 — Finanzierung' },
] as const;
/** The printed second-level KGs of a first-level KG (Table 1, `level == 2`). */
export const secondLevelOf = (kg1: string) => T1_ROWS.filter((r) => r.level === 2 && r.kg1 === kg1).map((r) => ({ code: r.code, token: `kg_${r.code}`, kg2: `KG ${r.code}`, designation: r.designation, line: r.line }));
export const kgRegisterSymbol = (n: number) => `kg${n}_positionen`;
export const kgSumSymbol = (n: number) => `kg${n}_positionen_sum`;
export const kgCountSymbol = (n: number) => `kg${n}_positionen_count`;
export const kgFremdSymbol = (n: number) => `kg${n}_positionen_fremd`;
export const kgAbwSymbol = (n: number) => `kg${n}_positionen_abweichend`;
export const kg2SumSymbol = (code: string) => `kg_${code}_from_rows`;

function kgRegisterUi(k: (typeof KG_WORKSHEETS)[number]): RegisterUiConfig {
  const level2 = secondLevelOf(k.kg1);
  return {
    title: `Kostenpositionen ${k.kg1} (Menge × Kennwert = Kosten)`,
    subtitle: 'Tab. 1 / §6 — je Zeile eine Kostengruppe der Tab. 1 mit Menge, Bezugseinheit (Tab. 4 → Tab. 3 → Tab. 2, §6.2), Kostenkennwert und Kosten',
    add_label: '+ Kostenposition', placement: 'section',
    columns: [
      { ...TABLE1_KG_COLUMN, required: true },
      TABLE1_DESIGNATION,
      { key: 'tab4_nr', label: 'Tab.-4-Position (nur KG 4xx)', type: 'text', placeholder: 'z. B. 1', aria_label: 'Nummer der Position in Tabelle 4 (nur für Kostengruppen 4xx)' },
      { key: 'ebene1', label: 'KG 1. Ebene', type: 'derived', expr: EBENE1_EXPR },
      { key: 'ebene2', label: 'KG 2. Ebene', type: 'derived', expr: EBENE2_EXPR },
      { key: 'tab4_kg_einheit', label: 'Einheit der KG (Tab. 4)', type: 'derived', expr: TAB4_KG_EINHEIT_EXPR },
      { key: 'menge', label: 'Menge', type: 'number', min: 0 },
      { key: 'einheit', label: 'Einheit (Tab. 2 / 3 / 4)', type: 'derived', expr: EINHEIT_EXPR },
      { key: 'kennwert', label: 'Kostenkennwert', type: 'number', unit: 'EUR/Einheit', min: 0 },
      { key: 'kosten_calc', label: 'Menge × Kennwert', type: 'derived', expr: KOSTEN_CALC_EXPR },
      { key: 'kosten_eur', label: 'Kosten', type: 'number', unit: EUR, required: true, min: 0 },
      { key: 'abw', label: 'Kosten ≠ Menge × Kennwert', type: 'derived', expr: ABWEICHUNG_EXPR, display: 'badge', value_labels: { '1': 'abweichend', '0': 'ok' } },
      { key: 'im_kg', label: `Position gehört zu ${k.kg1}`, type: 'derived', expr: imKgExpr(k.kg1), display: 'badge', value_labels: { '1': 'ja', '0': 'nein' } },
      { key: 'hinweis', label: 'Hinweise (Tab. 1)', type: 'lookup_value', lookup: { table_code: 'TABLE1', key_column: 'kg', value: 'notes' } },
    ],
    footer: [kgSumSymbol(k.n), kgCountSymbol(k.n), kgFremdSymbol(k.n), kgAbwSymbol(k.n), ...level2.map((l) => kg2SumSymbol(l.code))],
    note: `${Q.L457} ${Q.L1022} Zeilen anderer Kostengruppen werden gekennzeichnet und in keiner Summe gezählt. Die Einzelwerte kg_NNN dieses Arbeitsblatts bleiben bis din276-D-3.`,
  };
}

function kgEntries(k: (typeof KG_WORKSHEETS)[number]): FieldConfigEntry[] {
  const W = on(k.ws);
  const level2 = secondLevelOf(k.kg1);
  return [
    W({
      symbol: kgRegisterSymbol(k.n), widget: 'register', ui_config: kgRegisterUi(k),
      verification_quote: `${Q.L457} — ${Q.L175}`,
      create: { section_code: 'C', label_de: `Kostenpositionen ${k.kg1} (je Position KG, Menge, Einheit, Kennwert, Kosten)`, data_type: 'json', unit: null, clause_reference: '§5.4 Table 1, §6 Tables 2–4, §3.13',
        description: `Plan 3: Zeilen je Kostenposition der ${k.kg1} (Tab.-1-Zeile als Zeilenschlüssel; Bezugseinheit aus Tab. 2 / 3 / 4); Σ Kosten → ${kgSumSymbol(k.n)}, Σ je KG 2. Ebene → kg_NN0_from_rows (${k.ws}-D-Zeilen). Die getippten Einzelwerte kg_NNN und die Summengleichungen KG${k.n}-xx bleiben (din276-D-3).` },
    }),
    W({ symbol: kgSumSymbol(k.n), widget: 'derived', ui_config: null, verification_quote: Q.L163,
      create: { section_code: 'D', label_de: `Σ Kostenpositionen ${k.kg1} (aus dem Register)`, data_type: 'number', unit: EUR, clause_reference: '§5.4 Table 1', description: `Plan 3: Ausgabe der Gleichung ${k.ws}-D1 (sum_rows über ${kgRegisterSymbol(k.n)}.kosten_eur, nur Zeilen der ${k.kg1}); Zwilling zu kg_${k.kg1.slice(3)}_total (din276-D-3).` } }),
    W({ symbol: kgCountSymbol(k.n), widget: 'derived', ui_config: null, verification_quote: Q.L457,
      create: { section_code: 'D', label_de: `Anzahl Kostenpositionen ${k.kg1}`, data_type: 'number', unit: null, clause_reference: '§5.4 Table 1', description: `Plan 3: Ausgabe der Gleichung ${k.ws}-D2 (count_rows über ${kgRegisterSymbol(k.n)} mit im_kg == 1).` } }),
    W({ symbol: kgFremdSymbol(k.n), widget: 'derived', ui_config: null, verification_quote: Q.L457,
      create: { section_code: 'D', label_de: `Positionen anderer Kostengruppen im Register ${k.kg1} (Anzahl)`, data_type: 'number', unit: null, clause_reference: '§5.4 Table 1', description: `Plan 3: Ausgabe der Gleichung ${k.ws}-D3 (count_rows über ${kgRegisterSymbol(k.n)} mit im_kg == 0) — solche Zeilen zählen in keiner Summe; auf das richtige KG-Arbeitsblatt übertragen.` } }),
    W({ symbol: kgAbwSymbol(k.n), widget: 'derived', ui_config: null, verification_quote: Q.L175,
      create: { section_code: 'D', label_de: `Positionen mit Kosten ≠ Menge × Kennwert (Anzahl)`, data_type: 'number', unit: null, clause_reference: '§3.13', description: `Plan 3: Ausgabe der Gleichung ${k.ws}-D4 (count_rows über ${kgRegisterSymbol(k.n)} mit abw == 1); nur Zeilen mit eingetragener Menge und Kennwert werden geprüft.` } }),
    ...level2.map((l, i) => W({ symbol: kg2SumSymbol(l.code), widget: 'derived', ui_config: null, verification_quote: T1_ROWS.find((r) => r.code === l.code)!.span,
      create: { section_code: 'D', label_de: `Σ Kostenpositionen KG ${l.code} ${l.designation} (aus dem Register)`, data_type: 'number', unit: EUR, clause_reference: `§5.4 Table 1 (KG ${l.code})`, description: `Plan 3: Ausgabe der Gleichung ${k.ws}-D${5 + i} (sum_rows über ${kgRegisterSymbol(k.n)}.kosten_eur mit ebene2 == 'KG ${l.code}' — Positionen der KG ${l.code} und ihrer Untergruppen; 0 ohne Zeilen); Zwilling zu kg_${l.code}${T1_ROWS.some((r) => r.level === 3 && r.kg2 === l.kg2) ? '_total' : ''} (din276-D-3).` } })),
  ];
}

/** Stage × KG matrix (DIN-276-18): one row per Kostenermittlungsstufe with KG 100–800, Σ, building costs, Eigenleistung / Prognose / Risiko. */
export const MATRIX_UI: RegisterUiConfig = {
  title: 'Kostenermittlungsstufen × Kostengruppen', subtitle: '§4.3.2–4.3.7 — je Stufe eine Zeile mit KG 100–800, Σ (§3.11), Bauwerkskosten (§3.12), Eigenleistungen / Prognosekosten / Risikokosten', add_label: '+ Stufe', placement: 'section',
  columns: [
    { key: 'stufe', label: 'Stufe', type: 'enum', options: [...STAGE_TOKENS], option_labels: STAGE_LABELS, required: true, discriminator: true },
    { key: 'datum', label: 'Kostenstand (Datum)', type: 'date', required: true },
    ...KG_LEVEL1.map((t) => ({ key: `kg${t.slice(3)}`, label: `KG ${t.slice(3)}`, type: 'number' as const, unit: EUR, required: true, min: 0 })),
    { key: 'gesamt', label: 'Σ KG 100–800', type: 'derived', expr: GESAMT_EXPR },
    { key: 'bauwerk', label: 'Bauwerkskosten (300+400)', type: 'derived', expr: BAUWERK_EXPR },
    { key: 'eigenleistung_eur', label: 'Eigenleistungen', type: 'number', unit: EUR, min: 0 },
    { key: 'prognose_eur', label: 'Prognosekosten', type: 'number', unit: EUR, min: 0 },
    { key: 'risiko_eur', label: 'Risikokosten', type: 'number', unit: EUR, min: 0 },
    { key: 'bemerkung', label: 'Bemerkung', type: 'text' },
  ],
  footer: ['KR_gesamt_calc', 'KSch_gesamt_calc', 'KBer_gesamt_calc', 'KA_gesamt_calc', 'KF_gesamt_calc', 'stufen_count', 'stufe_aktuell_gesamt', 'stufe_vorher_gesamt', 'stufen_abweichung', 'stufen_abweichung_pct', 'bauwerk_aktuell'],
  note: `${Q.L223} ${Q.L219} Alle acht KG-Spalten sind je Zeile auszufüllen (0, wenn keine Kosten); „aktuell“ / „vorher“ sind die letzten beiden vollständigen Zeilen in Eingabereihenfolge (last_rows — kein Datumssort, din276-F-1). Die Einzelwerte KR_KG_100 … KF_gesamt der Arbeitsblätter DIN-276-18 … -22 bleiben bis din276-D-1 / X-2.`,
};

export const SONDERKOSTEN_UI: RegisterUiConfig = {
  title: 'Sonderkosten / besondere Kostenarten', subtitle: '§4.2.10–4.2.14 — je Zeile Art, Kostengruppe, Betrag, Annahmen / Ermittlung, separat ausgewiesen', add_label: '+ Sonderkosten-Zeile', placement: 'section',
  columns: [
    { key: 'art', label: 'Art', type: 'enum', options: [...SONDERKOSTEN_ART], option_labels: SONDERKOSTEN_LABELS, required: true, discriminator: true },
    TABLE1_KG_COLUMN,
    TABLE1_DESIGNATION,
    { key: 'betrag', label: 'Betrag', type: 'number', unit: EUR, required: true },
    { key: 'annahmen', label: 'Annahmen / Art der Ermittlung', type: 'text' },
    { key: 'separat_ausgewiesen', label: 'separat ausgewiesen', type: 'boolean' },
  ],
  footer: ['sonderkosten_bausubstanz_sum', 'sonderkosten_beigestellt_sum', 'sonderkosten_besondere_sum', 'sonderkosten_prognose_sum', 'sonderkosten_risiko_sum', 'sonderkosten_nicht_separat'],
  note: `${Q.L247} ${Q.L251} ${Q.L255} ${Q.L259} ${Q.L263} Die fünf Einzelwerte existing_substance_value … risk_costs_value bleiben bis din276-D-4 (REQ-10 … 14 auf die Summen: din276-G-2).`,
};

export const VERGABE_UI: RegisterUiConfig = {
  title: 'Vergabeeinheiten (Angebot / Auftrag / Rechnung)', subtitle: '§4.3.5 / §4.3.6 — je Vergabeeinheit Gewerk, Kostengruppe, Angebots-, Auftrags-, Rechnungssumme und Kostenstand', add_label: '+ Vergabeeinheit', placement: 'section',
  columns: [
    { key: 'label', label: 'Vergabeeinheit', type: 'text', required: true },
    { key: 'gewerk', label: 'Gewerk / Leistungsbereich', type: 'text' },
    TABLE1_KG_COLUMN,
    TABLE1_DESIGNATION,
    { key: 'angebot_eur', label: 'Angebot', type: 'number', unit: EUR, min: 0 },
    { key: 'auftrag_eur', label: 'Auftrag', type: 'number', unit: EUR, min: 0 },
    { key: 'rechnung_eur', label: 'Rechnung', type: 'number', unit: EUR, min: 0 },
    { key: 'status', label: 'Kostenstand', type: 'enum', options: ['angebot', 'auftrag', 'rechnung'], option_labels: { angebot: 'Angebot (offer)', auftrag: 'Auftrag (order)', rechnung: 'Rechnung (invoice)' }, required: true, discriminator: true },
    { key: 'aktuell', label: 'Betrag zum Kostenstand', type: 'derived', expr: AKTUELL_EXPR },
  ],
  footer: ['KA_kostenstand_calc', 'vergabeeinheiten_count', 'KA_angebote_count', 'KA_auftraege_count', 'KA_rechnungen_count'],
  note: `${Q.L341} ${Q.L346} Die Einzelwerte KA_angebote_eingegangen / KA_kostenstatus / KA_vergabeeinheiten_struktur bleiben bis din276-D-5 / T-1.`,
};

export const ABWEICHUNGEN_UI: RegisterUiConfig = {
  title: 'Abweichungen je Kostengruppe', subtitle: '§4.4.3 — je Zeile Kostengruppe, Betrag, %, Art, Ursache (Erläuterung), Maßnahme, Dokumentation', add_label: '+ Abweichung', placement: 'section',
  columns: [
    { ...TABLE1_KG_COLUMN, required: true },
    TABLE1_DESIGNATION,
    { key: 'betrag', label: 'Abweichung', type: 'number', unit: EUR, required: true },
    { key: 'pct', label: 'Abweichung', type: 'number', unit: '%' },
    { key: 'typ', label: 'Art', type: 'text', datalist: ['Planungsänderung', 'Preisentwicklung', 'Mengenänderung', 'Sonstige'] },
    { key: 'ursache', label: 'Ursache / Erläuterung', type: 'text', required: true },
    { key: 'massnahme', label: 'Maßnahme (Kostensteuerung)', type: 'text' },
    { key: 'dokumentiert', label: 'Dokumentiert in', type: 'text' },
  ],
  footer: ['abweichungen_sum', 'abweichungen_count'],
  note: `${Q.L386} Die Norm druckt keine Liste der Abweichungsarten — „Art“ ist Freitext mit Vorschlägen (din276-J-1). Die Einzelwerte AA_* bleiben bis din276-D-6.`,
};

export const FLURSTUECKE_UI: RegisterUiConfig = {
  title: 'Flurstücke', subtitle: 'Tab. 2 KG 100 / 200 — Grundstücksfläche (GF) als Σ der Flurstücksflächen', add_label: '+ Flurstück', placement: 'section',
  columns: [
    { key: 'gemarkung', label: 'Gemarkung', type: 'text' },
    { key: 'flur', label: 'Flur', type: 'text' },
    { key: 'flurstueck', label: 'Flurstück', type: 'text', required: true },
    { key: 'flaeche_m2', label: 'Fläche', type: 'number', unit: 'm²', required: true, min: 0 },
  ],
  footer: ['grundstuecksflaeche_GF_calc', 'flurstuecke_count'],
  note: `${Q.L1022} Tab. 2: KG 100 / 200 — „Plot area (GF)“, „Total plot area according to DIN 277-1“. Die Einzelwerte flurstuecksnummer / grundstuecksflaeche_GF bleiben bis din276-D-7.`,
};

export const KENNWERT_QUELLEN_UI: RegisterUiConfig = {
  title: 'Kostenkennwert-Quellen', subtitle: '§4.2.7 — je Quelle Kostengruppe, Quelle, Stand, Region, Preisstand, Standard', add_label: '+ Quelle', placement: 'section',
  columns: [
    TABLE1_KG_COLUMN,
    TABLE1_DESIGNATION,
    { key: 'quelle', label: 'Quelle', type: 'text', required: true, datalist: ['BKI', 'Vergleichsprojekt', 'eigene Datenbank'] },
    { key: 'stand', label: 'Datenstand', type: 'date' },
    { key: 'region', label: 'Region / Regionalfaktor', type: 'text' },
    { key: 'preisstand', label: 'Preisstand (Index)', type: 'text' },
    { key: 'standard', label: 'Standard', type: 'text' },
    { key: 'bemerkung', label: 'Bemerkung', type: 'text' },
  ],
  footer: ['kennwert_quellen_count'],
  note: `${Q.L235} Die sieben Einzelwerte KKW_* bleiben bis din276-D-8.`,
};

const T2 = (code: string) => T2_ROWS.find((r) => r.code === code)!;

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- DIN-276-04 Grundstücks- & Flurstücksdaten: Flurstücke → GF (Tab. 2) ----
  WS04({ symbol: 'flurstuecke', widget: 'register', ui_config: FLURSTUECKE_UI, verification_quote: `${T2('100').span} — ${Q.L1022}`,
    create: { section_code: 'C', label_de: 'Flurstücke (je Flurstück Gemarkung, Flur, Nummer, Fläche)', data_type: 'json', unit: null, clause_reference: '§6.2 Table 2 (KG 100)', description: 'Plan 3: Zeilen je Flurstück; Σ Fläche → grundstuecksflaeche_GF_calc (DIN-276-04-D1), Anzahl → flurstuecke_count (-D2). Die Einzelwerte flurstuecksnummer („Komma-getrennt“) / grundstuecksflaeche_GF sind Ablösekandidaten (din276-D-7).' } }),
  WS04({ symbol: 'grundstuecksflaeche_GF_calc', widget: 'derived', ui_config: null, verification_quote: T2('100').span,
    create: { section_code: 'D', label_de: 'Grundstücksfläche GF aus den Flurstücken (Σ)', data_type: 'number', unit: 'm²', clause_reference: '§6.2 Table 2 (KG 100)', description: 'Plan 3: Ausgabe der Gleichung DIN-276-04-D1 (sum_rows über flurstuecke.flaeche_m2); Tab. 2: „Plot area (GF) — Total plot area according to DIN 277-1“. Das Eingabefeld grundstuecksflaeche_GF bleibt (din276-D-7).' } }),
  WS04({ symbol: 'flurstuecke_count', widget: 'derived', ui_config: null, verification_quote: T2('100').span,
    create: { section_code: 'D', label_de: 'Anzahl der Flurstücke', data_type: 'number', unit: null, clause_reference: '§6.2 Table 2 (KG 100)', description: 'Plan 3: Ausgabe der Gleichung DIN-276-04-D2 (count_rows über flurstuecke).' } }),

  // ---- DIN-276-07 Kostenkennwert-Bibliothek: sources per KG (§4.2.7) ----
  WS07({ symbol: 'kennwert_quellen', widget: 'register', ui_config: KENNWERT_QUELLEN_UI, verification_quote: Q.L235,
    create: { section_code: 'C', label_de: 'Kostenkennwert-Quellen (je Quelle Kostengruppe, Quelle, Stand, Region, Preisstand, Standard)', data_type: 'json', unit: null, clause_reference: '§4.2.7', description: 'Plan 3: Zeilen je Kennwert-Quelle („the sources of the cost parameters used must be stated“); Anzahl → kennwert_quellen_count (DIN-276-07-D1). Die sieben Einzelwerte KKW_* sind Ablösekandidaten (din276-D-8).' } }),
  WS07({ symbol: 'kennwert_quellen_count', widget: 'derived', ui_config: null, verification_quote: Q.L235,
    create: { section_code: 'D', label_de: 'Anzahl der angegebenen Kostenkennwert-Quellen', data_type: 'number', unit: null, clause_reference: '§4.2.7', description: 'Plan 3: Ausgabe der Gleichung DIN-276-07-D1 (count_rows über kennwert_quellen); Gate ≥ 1 anstelle eines Freitexts ist STAGED (din276-G-3).' } }),

  // ---- DIN-276-08 Vorhandene Bausubstanz & Sonderkosten (§4.2.10–4.2.14) ----
  WS08({ symbol: 'sonderkosten', widget: 'register', ui_config: SONDERKOSTEN_UI, verification_quote: `${Q.L247} — ${Q.L251} — ${Q.L255} — ${Q.L259} — ${Q.L263}`,
    create: { section_code: 'C', label_de: 'Sonderkosten / besondere Kostenarten (je Zeile Art, Kostengruppe, Betrag, Annahmen, separat ausgewiesen)', data_type: 'json', unit: null, clause_reference: '§4.2.10–4.2.14', description: 'Plan 3: Zeilen je Sonderkosten-Position (Art = die fünf Kostenarten §4.2.10 … 4.2.14); Σ je Art → sonderkosten_<art>_sum (DIN-276-08-D1 … D5), nicht separat ausgewiesene Zeilen → sonderkosten_nicht_separat (-D6). Die fünf Einzelwerte *_value und die sechs separately_shown_* sind Ablösekandidaten (din276-D-4); REQ-10 … 14 auf die Summen: din276-G-2.' } }),
  ...SONDERKOSTEN_ART.map((art, i) => WS08({ symbol: `sonderkosten_${art}_sum`, widget: 'derived', ui_config: null, verification_quote: [Q.L247, Q.L251, Q.L255, Q.L259, Q.L263][i],
    create: { section_code: 'D', label_de: `Σ ${SONDERKOSTEN_LABELS[art]} (aus dem Register)`, data_type: 'number', unit: EUR, clause_reference: `§4.2.${10 + i}`, description: `Plan 3: Ausgabe der Gleichung DIN-276-08-D${i + 1} (sum_rows über sonderkosten mit art == '${art}'; 0 ohne Zeilen). Zwilling zum getippten Einzelwert (din276-D-4).` } })),
  WS08({ symbol: 'sonderkosten_nicht_separat', widget: 'derived', ui_config: null, verification_quote: Q.L251,
    create: { section_code: 'D', label_de: 'Sonderkosten-Zeilen, die nicht separat ausgewiesen sind (Anzahl)', data_type: 'number', unit: null, clause_reference: '§4.2.10–4.2.14', description: 'Plan 3: Ausgabe der Gleichung DIN-276-08-D6 (count_rows über sonderkosten mit separat_ausgewiesen == false); „must be allocated to the relevant cost groups but recognised separately“ — Gate == 0 ist STAGED (din276-G-2).' } }),

  // ---- DIN-276-09 … -16: one KG-item register per KG worksheet ----
  ...KG_WORKSHEETS.flatMap(kgEntries),

  // ---- DIN-276-18 Kostenrahmen: the stage × KG matrix (§4.3.2–4.3.7) and its derivations ----
  WS18({ symbol: 'kostenstufen_matrix', widget: 'register', ui_config: MATRIX_UI, verification_quote: `${Q.L296} — ${Q.L310} — ${Q.L322} — ${Q.L339} — ${Q.L370} — ${Q.L163} — ${Q.L169}`,
    create: { section_code: 'C', label_de: 'Kostenermittlungsstufen × Kostengruppen (je Stufe KG 100–800, Σ, Bauwerkskosten, Eigenleistungen / Prognose / Risiko)', data_type: 'json', unit: null, clause_reference: '§4.3.2–4.3.7, §3.11, §3.12, §4.4.2', description: 'Plan 3: eine Zeile je Kostenermittlungsstufe (Kostenrahmen … Kostenfeststellung) mit den acht KG-Summen; Σ je Stufe → KR_gesamt_calc … KF_gesamt_calc (DIN-276-18-D1 … D5), aktuelle / vorherige Stufe → stufe_aktuell_gesamt / stufe_vorher_gesamt (-D7 / -D8), Abweichung → stufen_abweichung / _pct (-D9 / -D10). Die fünf Stufen-Arbeitsblätter DIN-276-18 … -22 (≈ 90 getippte Werte) und die Eingaben current_stage_total / previous_stage_total (-26) sind Ablösekandidaten (din276-D-1 / D-2 / X-2; Konsumenten-Edit din276-C-3).' } }),
  ...(['KR', 'KSch', 'KBer', 'KA', 'KF'] as const).map((p, i) => WS18({ symbol: `${p}_gesamt_calc`, widget: 'derived', ui_config: null, verification_quote: [Q.L296, Q.L310, Q.L322, Q.L339, Q.L370][i],
    create: { section_code: 'D', label_de: `Σ KG 100–800 der Stufe ${STAGE_LABELS[STAGE_TOKENS[i]]} (aus der Matrix)`, data_type: 'number', unit: EUR, clause_reference: `§4.3.${2 + (i === 4 ? 3 : i)}, §3.11`, description: `Plan 3: Ausgabe der Gleichung DIN-276-18-D${i + 1} (sum_rows über kostenstufen_matrix, Zeilen mit stufe == '${STAGE_TOKENS[i]}'; 0 ohne Zeile). Zwilling zum getippten ${p}_gesamt („Σ KG 100-800“, din276-D-1).` } })),
  WS18({ symbol: 'stufen_count', widget: 'derived', ui_config: null, verification_quote: Q.L380,
    create: { section_code: 'D', label_de: 'Anzahl der erfassten Kostenermittlungsstufen', data_type: 'number', unit: null, clause_reference: '§4.4.2', description: 'Plan 3: Ausgabe der Gleichung DIN-276-18-D6 (count_rows über kostenstufen_matrix).' } }),
  WS18({ symbol: 'stufe_aktuell_gesamt', widget: 'derived', ui_config: null, verification_quote: Q.L380,
    create: { section_code: 'D', label_de: 'Aktuelle Kostenermittlung — Σ KG 100–800 (letzte Zeile der Matrix)', data_type: 'number', unit: EUR, clause_reference: '§4.4.2', description: 'Plan 3: Ausgabe der Gleichung DIN-276-18-D7 (sum_rows über last_rows(kostenstufen_matrix, 1)); Zeilen in Eingabereihenfolge (din276-F-1). Zwilling zu current_stage_total / KK_kosten_aktuell (DIN-276-26; din276-D-2, Konsumenten-Edit din276-C-3).' } }),
  WS18({ symbol: 'stufe_vorher_gesamt', widget: 'derived', ui_config: null, verification_quote: Q.L380,
    create: { section_code: 'D', label_de: 'Vorherige Kostenermittlung — Σ KG 100–800 (vorletzte Zeile der Matrix)', data_type: 'number', unit: EUR, clause_reference: '§4.4.2', description: 'Plan 3: Ausgabe der Gleichung DIN-276-18-D8 (Σ der letzten zwei Zeilen minus Σ der letzten Zeile; mit weniger als zwei Zeilen nicht berechenbar). Zwilling zu previous_stage_total / KK_kosten_vorher (din276-D-2).' } }),
  WS18({ symbol: 'stufen_abweichung', widget: 'derived', ui_config: null, verification_quote: Q.L386,
    create: { section_code: 'D', label_de: 'Abweichung aktuelle − vorherige Kostenermittlung', data_type: 'number', unit: EUR, clause_reference: '§4.4.2, §4.4.3', description: 'Plan 3: Ausgabe der Gleichung DIN-276-18-D9 (stufe_aktuell_gesamt − stufe_vorher_gesamt). Zwilling zu deviation_amount (IDENT-04 auf DIN-276-26 über getippte Eingaben; din276-E-1) / KK_delta_abs.' } }),
  WS18({ symbol: 'stufen_abweichung_pct', widget: 'derived', ui_config: null, verification_quote: Q.L386,
    create: { section_code: 'D', label_de: 'Abweichung in % der vorherigen Kostenermittlung', data_type: 'number', unit: '%', clause_reference: '§4.4.2, §4.4.3', description: 'Plan 3: Ausgabe der Gleichung DIN-276-18-D10 (stufen_abweichung · 100 / stufe_vorher_gesamt). Zwilling zu deviation_percentage (DIN-276-27) / KK_delta_pct.' } }),
  WS18({ symbol: 'bauwerk_aktuell', widget: 'derived', ui_config: null, verification_quote: Q.L169,
    create: { section_code: 'D', label_de: 'Bauwerkskosten (KG 300 + 400) der aktuellen Kostenermittlung', data_type: 'number', unit: EUR, clause_reference: '§3.12', description: 'Plan 3: Ausgabe der Gleichung DIN-276-18-D11 (sum_rows über last_rows(kostenstufen_matrix, 1), Spalte bauwerk); „Costs resulting from the sum of cost groups 300 and 400“.' } }),

  // ---- DIN-276-21 Kostenanschlag: award units (§4.3.5 L341, §4.3.6 L346) ----
  WS21({ symbol: 'vergabeeinheiten', widget: 'register', ui_config: VERGABE_UI, verification_quote: `${Q.L341} — ${Q.L346}`,
    create: { section_code: 'C', label_de: 'Vergabeeinheiten (je Einheit Gewerk, Kostengruppe, Angebot / Auftrag / Rechnung, Kostenstand)', data_type: 'json', unit: null, clause_reference: '§4.3.5, §4.3.6', description: 'Plan 3: Zeilen je Vergabeeinheit („organised according to the award units … so that the offers, orders and invoices … can be compiled, checked and compared“); Σ zum Kostenstand → KA_kostenstand_calc (DIN-276-21-D1), Anzahl je Kostenstand → KA_angebote_count / KA_auftraege_count / KA_rechnungen_count (-D3 … D5). Die Einzelwerte KA_angebote_eingegangen / KA_kostenstatus / KA_vergabeeinheiten_struktur sind Ablösekandidaten (din276-D-5 / T-1).' } }),
  WS21({ symbol: 'KA_kostenstand_calc', widget: 'derived', ui_config: null, verification_quote: Q.L346,
    create: { section_code: 'D', label_de: 'Σ der Vergabeeinheiten zum jeweiligen Kostenstand (Angebot / Auftrag / Rechnung)', data_type: 'number', unit: EUR, clause_reference: '§4.3.6', description: 'Plan 3: Ausgabe der Gleichung DIN-276-21-D1 (sum_rows über vergabeeinheiten.aktuell — je Zeile der Betrag zum gewählten Kostenstand); „compiling the costs on the basis of the current cost status (offer, order or invoice)“.' } }),
  WS21({ symbol: 'vergabeeinheiten_count', widget: 'derived', ui_config: null, verification_quote: Q.L341,
    create: { section_code: 'D', label_de: 'Anzahl der Vergabeeinheiten', data_type: 'number', unit: null, clause_reference: '§4.3.5', description: 'Plan 3: Ausgabe der Gleichung DIN-276-21-D2 (count_rows über vergabeeinheiten).' } }),
  ...(['angebote', 'auftraege', 'rechnungen'] as const).map((k, i) => WS21({ symbol: `KA_${k}_count`, widget: 'derived', ui_config: null, verification_quote: Q.L346,
    create: { section_code: 'D', label_de: `Vergabeeinheiten mit Kostenstand ${['Angebot', 'Auftrag', 'Rechnung'][i]} (Anzahl)`, data_type: 'number', unit: null, clause_reference: '§4.3.6', description: `Plan 3: Ausgabe der Gleichung DIN-276-21-D${3 + i} (count_rows über vergabeeinheiten mit status == '${['angebot', 'auftrag', 'rechnung'][i]}').${i === 0 ? ' Zwilling zu KA_angebote_eingegangen (din276-D-5).' : ''}` } })),

  // ---- DIN-276-23 Gesamtkostenkompilation: VAT rate only for gross / mixed (§4.2.15 L267–L272) ----
  WS23({ symbol: 'GK_mwst_satz_pct', widget: 'scalar', ui_config: null, visible_when: VAT_RATE_VISIBLE, verification_quote: Q.L267_272 }), // vat_treatment (DIN-276-03) reaches -23 only after din276-C-1 (range token "DIN-276-18..23") — the rule reads pending (visible) until then

  // ---- DIN-276-24 Kostenkennwert-Analyse: Tab.-2 selector + reference-unit fills (§3.13 / §3.14 / §6.2) ----
  WS24({ symbol: 'kg_selector', widget: 'select_one', ui_config: null, enum_values: KG_LEVEL1.map((t, i) => ({ value: t, label_de: `${T2(t.slice(3)).code} ${T2(t.slice(3)).designation_kg}`, order_index: i })), verification_quote: Q.L1022,
    create: { section_code: 'C', label_de: 'Kostengruppe (1. Ebene) der Kennwertanalyse', data_type: 'enum', unit: null, clause_reference: '§6.2 Table 2', description: 'Plan 3: wählt die Tab.-2-Zeile, aus der Einheit / Bezeichnung / Ermittlung der Bezugseinheit gefüllt werden (reference_unit_einheit / _bezeichnung / _ermittlung); das Mengenfeld reference_unit bleibt frei eintragbar (din276-E-2).' } }),
  WS24({ symbol: 'reference_unit_einheit', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 2' }, lookup: { table_code: 'TABLE2', role: 'value', keys: [{ column: 'kg', from_symbol: 'kg_selector' }], value: 'unit' }, verification_quote: Q.L1022,
    create: { section_code: 'C', label_de: 'Einheit der Bezugseinheit (Tab. 2)', data_type: 'text', unit: null, clause_reference: '§6.2 Table 2', description: 'Plan 3: aus TABLE2 für die gewählte Kostengruppe gefüllt (m²); ersetzt den Platzhalter „(Engineer: Label/Einheit pruefen)“ an reference_unit / cost_parameter fachlich (din276-S-1).' } }),
  WS24({ symbol: 'reference_unit_bezeichnung', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 2' }, lookup: { table_code: 'TABLE2', role: 'value', keys: [{ column: 'kg', from_symbol: 'kg_selector' }], value: 'designation' }, verification_quote: Q.L1022,
    create: { section_code: 'C', label_de: 'Bezeichnung der Bezugseinheit (Tab. 2)', data_type: 'text', unit: null, clause_reference: '§6.2 Table 2', description: 'Plan 3: aus TABLE2 gefüllt — „Plot area (GF)“ / „Gross floor area (GFA)“ / „Outdoor area (AF)“.' } }),
  WS24({ symbol: 'reference_unit_ermittlung', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 2' }, lookup: { table_code: 'TABLE2', role: 'value', keys: [{ column: 'kg', from_symbol: 'kg_selector' }], value: 'determination' }, verification_quote: Q.L1022,
    create: { section_code: 'C', label_de: 'Ermittlung der Bezugseinheit (Tab. 2)', data_type: 'text', unit: null, clause_reference: '§6.2 Table 2', description: 'Plan 3: aus TABLE2 gefüllt — „Total … according to DIN 277-1“.' } }),
  WS24({ symbol: 'KKW_bauwerk_eur_m2_BGF', widget: 'derived', ui_config: null, verification_quote: `${Q.L175} — ${T2('300').span}`,
    create: { section_code: 'D', label_de: 'Kennwert Bauwerkskosten je m² BGF (KG 300 + 400 / BGF)', data_type: 'number', unit: 'EUR/m²', clause_reference: '§3.13, §6.2 Table 2 (KG 300 / 400)', description: 'Plan 3: Ausgabe der Gleichung DIN-276-24-D1 (building_costs / gross_floor_area_BGF — beide auf DIN-276-24 vererbt); Tab. 2: KG 300 / 400 → „Gross floor area (GFA)“.' } }),
  WS24({ symbol: 'KKW_bauwerk_eur_m3_BRI', widget: 'derived', ui_config: null, verification_quote: Q.L175,
    create: { section_code: 'D', label_de: 'Kennwert Bauwerkskosten je m³ BRI', data_type: 'number', unit: 'EUR/m³', clause_reference: '§3.13', description: 'Plan 3: Ausgabe der Gleichung DIN-276-24-D2 (building_costs / gross_volume_BRI); die Norm nennt BRI nicht als Bezugseinheit (Tab. 2: GF / GFA / AF) — Zwilling zum getippten KKW_analyse_eur_m3_BRI (din276-D-9).' } }),
  WS24({ symbol: 'GK_kennwert_BGF_calc', widget: 'derived', ui_config: null, verification_quote: `${Q.L175} — ${Q.L163}`,
    create: { section_code: 'D', label_de: 'Kennwert Gesamtkosten je m² BGF (berechnet)', data_type: 'number', unit: 'EUR/m²', clause_reference: '§3.13, §3.11', description: 'Plan 3: Ausgabe der Gleichung DIN-276-24-D3 (GK_total / gross_floor_area_BGF); GK_total (DIN-276-23) erreicht DIN-276-24 erst nach dem Konsumenten-Edit din276-C-5 — bis dahin „nicht berechenbar“. Zwilling zu GK_kennwert_BGF (-23) / cost_parameter_per_BGF / KKW_analyse_eur_m2_BGF (din276-D-9).' } }),
  WS24({ symbol: 'KKW_analyse_kg300_anteil_calc', widget: 'derived', ui_config: null, verification_quote: Q.L163,
    create: { section_code: 'D', label_de: 'Anteil KG 300 an den Gesamtkosten (berechnet)', data_type: 'number', unit: '%', clause_reference: '§3.11', description: 'Plan 3: Ausgabe der Gleichung DIN-276-24-D4 (kg_300_total · 100 / GK_total); beide Eingänge erreichen DIN-276-24 erst nach din276-C-5. Zwilling zum getippten KKW_analyse_kg300_anteil (din276-D-9).' } }),

  // ---- DIN-276-27 Abweichungsanalyse: deviations per KG (§4.4.3 L386) ----
  WS27({ symbol: 'abweichungen', widget: 'register', ui_config: ABWEICHUNGEN_UI, verification_quote: Q.L386,
    create: { section_code: 'C', label_de: 'Abweichungen je Kostengruppe (je Zeile KG, Betrag, %, Art, Ursache, Maßnahme, Dokumentation)', data_type: 'json', unit: null, clause_reference: '§4.4.3', description: 'Plan 3: Zeilen je Abweichung („presented, explained and documented according to type and scope“); Σ Betrag → abweichungen_sum (DIN-276-27-D1), Anzahl → abweichungen_count (-D2). Die Einzelwerte AA_betroffene_kg / AA_abweichungsursache / AA_typ / AA_massnahmen / AA_dokumentiert sind Ablösekandidaten (din276-D-6).' } }),
  WS27({ symbol: 'abweichungen_sum', widget: 'derived', ui_config: null, verification_quote: Q.L386,
    create: { section_code: 'D', label_de: 'Σ der dokumentierten Abweichungen', data_type: 'number', unit: EUR, clause_reference: '§4.4.3', description: 'Plan 3: Ausgabe der Gleichung DIN-276-27-D1 (sum_rows über abweichungen.betrag).' } }),
  WS27({ symbol: 'abweichungen_count', widget: 'derived', ui_config: null, verification_quote: Q.L386,
    create: { section_code: 'D', label_de: 'Anzahl der dokumentierten Abweichungen', data_type: 'number', unit: null, clause_reference: '§4.4.3', description: 'Plan 3: Ausgabe der Gleichung DIN-276-27-D2 (count_rows über abweichungen).' } }),
];

/** No section rule is emitted: the KG / stage worksheet drivers are `select_many` checklists (din276-M-1 / M-2) and every KG section holds roll-up producers (din276-C-2). */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];

