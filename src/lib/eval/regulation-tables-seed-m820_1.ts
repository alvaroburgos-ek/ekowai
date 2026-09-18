/**
 * DWA-M-820-1 regulation-table seed builders (Plan 3 Task 18, 2026-09-18).
 *
 * SR-1: every seeded value and every `verbatim_quote` was read in this session
 * from the transcript `Desktop\Guidelines\DWA-M-820-1\DWA-M_820-1.md` (2010
 * lines; the line is in the comment next to each row). Verified by
 * `scripts/regulation-tables/verify-regulation-tables.ts m820_1 "<transcript>"`.
 * Emitted as `20260917101800_regulation_tables_seed_m820_1.sql` (no earlier
 * DWA-M-820-1 table seed exists — nothing superseded; the Plan-1 selection
 * configs `20260911120000_selection_configs_DWA_M_820_1.sql` carry no tables).
 *
 * Edition: title page L9 / L19 "März 2020", imprint L48 "© DWA, 1. Auflage,
 * Hennef 2020" = prod `standards.version` 'März 2020' → `'2020'`.
 *
 * The legal figures (§ 134 GWB standstill, § 3 Abs. 9 VgV lot constants, the
 * EU thresholds of Anh. B.2.3) are PRINTED VALUES of this edition: they are
 * seeded exactly as printed with the printed regulation / date cue (ANHB23
 * carries `verordnung` + `gueltig_ab`) and are time-bound — L1255 / L1327 print
 * the two-year review rule; a newer regulation is a NEW edition row, never an
 * update from memory (sign-off m820_1-J-1). Nothing here is updated from the web.
 *
 * Verification status: `md_verified` only where every printed row is lifted AND
 * every displayed cell is legible (amendment F). All six tables qualify: the
 * Tab. D.1 cells, the two threshold lines, the two standstill figures, the
 * three lot constants, the review interval and the two revenue factors print
 * cleanly (no image, no empty cell).
 */
import type { RegulationTable, RegulationRow } from './regulation-tables';

const STD = 'DWA-M-820-1';
export const M820_1_EDITION = '2020';
const ED = M820_1_EDITION;

// ---------------------------------------------------------------------------
// Tab. D.1 — Deckungssummen für eine Haftpflichtversicherung in Abhängigkeit zu den Herstellungskosten (Anhang D,
// L1462–L1472). Key `baukosten_band` = one token per printed "bis … Mio. €" row; values `baukosten_max_mio` (the printed
// upper bound of the band, Mio. €), `personen_mio` / `sonstige_mio` (the two printed Deckungssummen, Mio. €) and the printed
// band text. Costs above 50 Mio. € have NO printed row (sign-off m820_1-J-2): the derived chain deliberately misses on
// that band (`lookup('TABD1', 'gt50', …)` → no row → manual_required), never a guessed figure.
// Policy `anhaltswert`: L1629 "Anhaltspunkt für die Höhe der geforderten Versicherungssumme kann Tabelle D. 1 in Anhang D
// geben." — L1454 prints the table as the Bundesministerium's RBBau recommendation ("empfiehlt … im Wesentlichen folgende
// Beträge"), not a DWA requirement.
// ---------------------------------------------------------------------------
export const TABD1_BANDS = [
  { value: 'le0_5', max_mio: 0.5, personen: 1.5, sonstige: 0.25, gedruckt: 'bis 0,5 Mio. €', quote: String.raw`\hline bis 0,5 Mio. € & 1,5 Mio. € & 0,25 Mio. € \\` }, // L1465
  { value: 'le1_5', max_mio: 1.5, personen: 1.5, sonstige: 0.5, gedruckt: 'bis 1,5 Mio. €', quote: String.raw`\hline bis 1,5 Mio. € & 1,5 Mio. € & 0,5 Mio. € \\` },   // L1466
  { value: 'le4', max_mio: 4.0, personen: 1.5, sonstige: 1.0, gedruckt: 'bis 4,0 Mio. €', quote: String.raw`\hline bis 4,0 Mio. € & 1,5 Mio. € & 1,0 Mio. € \\` },      // L1467
  { value: 'le10', max_mio: 10, personen: 2.0, sonstige: 2.0, gedruckt: 'bis 10 Mio. €', quote: String.raw`\hline bis 10 Mio. € & 2,0 Mio. € & 2,0 Mio. € \\` },         // L1468
  { value: 'le25', max_mio: 25, personen: 3.0, sonstige: 3.0, gedruckt: 'bis 25 Mio. €', quote: String.raw`\hline bis 25 Mio. € & 3,0 Mio. € & 3,0 Mio. € \\` },         // L1469
  { value: 'le50', max_mio: 50, personen: 3.0, sonstige: 5.0, gedruckt: 'bis 50 Mio. €', quote: String.raw`\hline bis 50 Mio. € & 3,0 Mio. € & 5,0 Mio. € \\` },         // L1470
] as const;
export function tabD1AsTable(): RegulationTable {
  const rows: RegulationRow[] = TABD1_BANDS.map((b, i) => ({
    row_key: b.value, keys: { baukosten_band: b.value }, group_label: null, label_de: `Geschätzte Baukosten ${b.gedruckt}`, order_index: i,
    values: { baukosten_max_mio: b.max_mio, personen_mio: b.personen, sonstige_mio: b.sonstige, band_gedruckt: b.gedruckt }, verbatim_quote: b.quote,
  }));
  return { standard_code: STD, edition: ED, table_code: 'TABD1', title_de: 'Deckungssummen für eine Haftpflichtversicherung in Abhängigkeit zu den Herstellungskosten', clause_reference: 'Anhang D, Tab. D.1; Anh. E.1.4.2', page_ref: null,
    key_columns: ['baukosten_band'],
    value_columns: [{ name: 'baukosten_max_mio', type: 'number', unit: 'Mio. €' }, { name: 'personen_mio', type: 'number', unit: 'Mio. €' }, { name: 'sonstige_mio', type: 'number', unit: 'Mio. €' }, { name: 'band_gedruckt', type: 'string' }],
    override_policy: 'anhaltswert',
    // L1629 — L1454 (the RBBau recommendation sentence introducing the table)
    override_quote: 'Anhaltspunkt für die Höhe der geforderten Versicherungssumme kann Tabelle D. 1 in Anhang D geben. Dabei sind für die Festlegung der Höhe auch projektspezifische Risiken abzuschätzen. — Als Deckungssummen für eine Haftpflichtversicherung empfiehlt das für das Bauwesen zuständige Bundesministerium in seinen Vertragsmustern ${ }^{7)}$ im Wesentlichen folgende Beträge, in Abhängigkeit zu den Herstellungskosten (siehe Tabelle D.1).',
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// Anh. B.2.3 "Schwellenwerte" — the EU thresholds printed for this edition (L1327–L1330). Key `organisation` = the prod
// `client_organization_type` tokens (captured m820_1.prior.json, M820-01: municipality | utility | association |
// bundesbehoerde | sonstige_auftraggeber | other — G-A3: key strings equal the enum values exactly). Two printed rows map
// onto six tokens: `bundesbehoerde` (prod label "Oberste/obere Bundesbehörde") → L1329 139.000 €; every other token →
// L1330 "für alle anderen" 214.000 €. Whether a token such as `association` (Verband) can be a "vergleichbare Institution"
// of the first line is the owner's judgment (sign-off m820_1-J-3) — the fail-safe mapping puts only the explicit
// Bundesbehörde token on the lower threshold. Values: `schwellenwert_eur`, the printed group text, the regulation and the
// effective date as PRINTED (time-bound — m820_1-J-1).
// ---------------------------------------------------------------------------
const Q_L1329 = String.raw`I der obersten oder oberen Bundesbehörden oder vergleichbarer Institutionen $139.000 €$,`; // L1329
const Q_L1330 = String.raw`- für alle anderen $214.000 €$.`; // L1330
export const ANHB23_VERORDNUNG = 'Verordnung (EU) 2019/1828 vom 30.10.2019'; // L1327
export const ANHB23_GUELTIG_AB = '01.01.2020'; // L1327
const GRUPPE_BUND = 'der obersten oder oberen Bundesbehörden oder vergleichbarer Institutionen';
const GRUPPE_ANDERE = 'für alle anderen';
export const ANHB23_ORGANISATIONEN = [
  { value: 'municipality', label: 'Kommune/Gemeinde', eur: 214000, gruppe: GRUPPE_ANDERE, quote: Q_L1330 },
  { value: 'utility', label: 'Versorger', eur: 214000, gruppe: GRUPPE_ANDERE, quote: Q_L1330 },
  { value: 'association', label: 'Verband', eur: 214000, gruppe: GRUPPE_ANDERE, quote: Q_L1330 },
  { value: 'bundesbehoerde', label: 'Oberste/obere Bundesbehörde', eur: 139000, gruppe: GRUPPE_BUND, quote: Q_L1329 },
  { value: 'sonstige_auftraggeber', label: 'Sonstige Auftraggeber', eur: 214000, gruppe: GRUPPE_ANDERE, quote: Q_L1330 },
  { value: 'other', label: 'Sonstige', eur: 214000, gruppe: GRUPPE_ANDERE, quote: Q_L1330 },
] as const;
export function anhB23AsTable(): RegulationTable {
  const rows: RegulationRow[] = ANHB23_ORGANISATIONEN.map((o, i) => ({
    row_key: o.value, keys: { organisation: o.value }, group_label: null, label_de: `${o.label} — ${o.gruppe}`, order_index: i,
    values: { schwellenwert_eur: o.eur, gruppe_gedruckt: o.gruppe, verordnung: ANHB23_VERORDNUNG, gueltig_ab: ANHB23_GUELTIG_AB }, verbatim_quote: o.quote,
  }));
  return { standard_code: STD, edition: ED, table_code: 'ANHB23', title_de: 'EU-Schwellenwerte für Planungsleistungen (Verordnung (EU) 2019/1828, ab 01.01.2020)', clause_reference: 'Anhang B.2.3 (§ 106 GWB); § 8.5', page_ref: null,
    key_columns: ['organisation'],
    value_columns: [{ name: 'schwellenwert_eur', type: 'number', unit: 'EUR' }, { name: 'gruppe_gedruckt', type: 'string' }, { name: 'verordnung', type: 'string' }, { name: 'gueltig_ab', type: 'string' }],
    override_policy: 'locked',
    // L1327 — L1255: statutory, fixed by regulation; reviewed every two years (edition rule)
    override_quote: 'Die Höhe der Schwellenwerte wird über eine Verweisung auf die jeweils aktuelle EU-Verordnung bestimmt. Die Schwellenwerte werden von der Europäischen Union alle zwei Jahre festgesetzt. — Die EU-Schwellenwerte werden von der EU-Kommission alle zwei Jahre geprüft und durch Verordnung festgelegt.',
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// § 8.10.3.6 / Anh. B.2.3 "Informations- und Wartepflichten" — the § 134 Abs. 2 GWB standstill (L1064; L1346 prints the
// same figures). Key `uebermittlung` = the STRINGIFIED prod boolean `electronic_transmission` ('true' = elektronisch,
// 'false' = sonstige Versendung — `resolveLookupFill` keys a boolean as String(boolean), G-15); value `frist_tage`
// (Kalendertage). Locked: a statutory minimum ("darf … frühestens … schließen").
// ---------------------------------------------------------------------------
const Q_L1064 = 'Der Auftraggeber darf den Vertrag frühestens 15 Kalendertage (bei Versendung auf elektronischem Weg 10 Kalendertage) nach Absendung dieser Informationen schließen (§ 134 Abs. 2 GWB).'; // L1064
export const S8_10_3_6_ROWS = [
  { value: 'false', tage: 15, gedruckt: '15 Kalendertage', label: 'sonstige Versendung (nicht elektronisch)' },
  { value: 'true', tage: 10, gedruckt: 'bei Versendung auf elektronischem Weg 10 Kalendertage', label: 'Versendung auf elektronischem Weg' },
] as const;
export function s81036AsTable(): RegulationTable {
  const rows: RegulationRow[] = S8_10_3_6_ROWS.map((r, i) => ({
    row_key: r.value, keys: { uebermittlung: r.value }, group_label: null, label_de: r.label, order_index: i,
    values: { frist_tage: r.tage, gedruckt: r.gedruckt }, verbatim_quote: Q_L1064,
  }));
  return { standard_code: STD, edition: ED, table_code: 'S8_10_3_6', title_de: 'Wartepflicht vor Vertragsschluss (§ 134 Abs. 2 GWB)', clause_reference: '§ 8.10.3.6; Anhang B.2.3', page_ref: null,
    key_columns: ['uebermittlung'], value_columns: [{ name: 'frist_tage', type: 'number', unit: 'Kalendertage' }, { name: 'gedruckt', type: 'string' }],
    override_policy: 'locked',
    override_quote: Q_L1064,
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// Anh. B.2.4 — § 3 Abs. 9 VgV lot constants (L1366 statute quote; L1368 the Merkblatt's paraphrase). Key `konstante`;
// values `wert`, `unit`, the printed comparator ("unter" for the per-lot bounds, "nicht übersteigt" for the share) and the
// printed fragment. Locked (statute).
// ---------------------------------------------------------------------------
const Q_L1366 = ',,Der [...] Auftraggeber kann bei der Vergabe einzelner Lose von Absatz 7 Satz 3 sowie Absatz 8 abweichen, wenn der geschätzte Nettowert des betreffenden Loses bei Liefer- und Dienstleistungen unter 80000 Euro und bei Bauleistungen unter 1 Million Euro liegt und die Summe der Nettowerte dieser Lose 20 Prozent des Gesamtwertes aller Lose nicht übersteigt."'; // L1366
export const S3_9_VGV_ROWS = [
  { value: 'los_dienstleistung', wert: 80000, unit: 'EUR', comparator: '<', gedruckt: 'bei Liefer- und Dienstleistungen unter 80000 Euro', label: 'Nettowert je Los — Liefer- und Dienstleistungen' },
  { value: 'los_bau', wert: 1000000, unit: 'EUR', comparator: '<', gedruckt: 'bei Bauleistungen unter 1 Million Euro', label: 'Nettowert je Los — Bauleistungen' },
  { value: 'anteil_pct', wert: 20, unit: '%', comparator: '<=', gedruckt: 'die Summe der Nettowerte dieser Lose 20 Prozent des Gesamtwertes aller Lose nicht übersteigt', label: 'Summe der Nettowerte dieser Lose — Anteil am Gesamtwert aller Lose' },
] as const;
export function s39VgvAsTable(): RegulationTable {
  const rows: RegulationRow[] = S3_9_VGV_ROWS.map((r, i) => ({
    row_key: r.value, keys: { konstante: r.value }, group_label: null, label_de: r.label, order_index: i,
    values: { wert: r.wert, unit: r.unit, comparator: r.comparator, gedruckt: r.gedruckt }, verbatim_quote: Q_L1366,
  }));
  return { standard_code: STD, edition: ED, table_code: 'S3_9_VGV', title_de: 'Loseausnahme nach § 3 Abs. 9 VgV', clause_reference: 'Anhang B.2.4 (§ 3 Abs. 9 VgV)', page_ref: null,
    key_columns: ['konstante'], value_columns: [{ name: 'wert', type: 'number' }, { name: 'unit', type: 'string' }, { name: 'comparator', type: 'string' }, { name: 'gedruckt', type: 'string' }],
    override_policy: 'locked',
    override_quote: Q_L1366,
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// Anh. B.1.1 — the EU threshold review interval (L1255). One row; locked (the EU sets the interval).
// ---------------------------------------------------------------------------
const Q_L1255 = 'Welche gesetzlichen Grundlagen bei der Vergabe von Ingenieurleistungen gelten, hängt davon ab, ob der voraussichtliche Gesamtwert den sogenannten EU-Schwellenwert erreicht oder überschreitet. Die EU-Schwellenwerte werden von der EU-Kommission alle zwei Jahre geprüft und durch Verordnung festgelegt.'; // L1255
export function anhB11AsTable(): RegulationTable {
  const rows: RegulationRow[] = [{
    row_key: 'pruefintervall_jahre', keys: { konstante: 'pruefintervall_jahre' }, group_label: null, label_de: 'Prüfintervall der EU-Schwellenwerte', order_index: 0,
    values: { wert: 2, unit: 'Jahre', gedruckt: 'alle zwei Jahre' }, verbatim_quote: Q_L1255,
  }];
  return { standard_code: STD, edition: ED, table_code: 'ANHB11', title_de: 'Prüfintervall der EU-Schwellenwerte', clause_reference: 'Anhang B.1.1', page_ref: null,
    key_columns: ['konstante'], value_columns: [{ name: 'wert', type: 'number', unit: 'Jahre' }, { name: 'unit', type: 'string' }, { name: 'gedruckt', type: 'string' }],
    override_policy: 'locked',
    override_quote: Q_L1255,
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// Anh. E.1.4.1 — Mindestjahresumsatz factor (L1623). Key `grossprojekt` = the STRINGIFIED prod boolean `large_long_project`
// ('true' = großes, langlaufendes Projekt → 1,5 "sollte … nicht überschreiten"; 'false' → 2 "darf … nicht mehr als das
// Zweifache … verlangen", § 45 Abs. 2 VgV). The `modal` column carries the printed verb per row; the table's policy follows
// the WEAKER printed modal (`anhaltswert` — "sollte"), the statutory 2,0 stays enforced by REQ-12 (sign-off m820_1-O-1).
// ---------------------------------------------------------------------------
const Q_L1623_ZWEIFACHE = 'Als Mindestjahresumsatz nach § 45 Abs .2 VgV darf der Auftraggeber nicht mehr als das Zweifache des geschätzten Auftragswerts verlangen.'; // L1623
const Q_L1623_FAKTOR15 = 'Bei großen, langlaufenden Projekten sollte das geforderte Verhältnis Jahresumsatz zu Jahresauftragswert den Faktor 1,5 nicht überschreiten.'; // L1623
export const E1_4_1_UMSATZ_ROWS = [
  { value: 'false', faktor: 2, modal: 'darf … nicht mehr als … verlangen', gedruckt: 'das Zweifache des geschätzten Auftragswerts', label: 'Regelfall (§ 45 Abs. 2 VgV)', quote: Q_L1623_ZWEIFACHE },
  { value: 'true', faktor: 1.5, modal: 'sollte … nicht überschreiten', gedruckt: 'den Faktor 1,5', label: 'großes, langlaufendes Projekt', quote: Q_L1623_FAKTOR15 },
] as const;
export function e141UmsatzAsTable(): RegulationTable {
  const rows: RegulationRow[] = E1_4_1_UMSATZ_ROWS.map((r, i) => ({
    row_key: r.value, keys: { grossprojekt: r.value }, group_label: null, label_de: r.label, order_index: i,
    values: { faktor_max: r.faktor, modal: r.modal, gedruckt: r.gedruckt }, verbatim_quote: r.quote,
  }));
  return { standard_code: STD, edition: ED, table_code: 'E1_4_1_UMSATZ', title_de: 'Mindestjahresumsatz — höchstzulässiger Faktor auf den geschätzten Auftragswert', clause_reference: 'Anhang E.1.4.1 (§ 45 Abs. 2 VgV)', page_ref: null,
    key_columns: ['grossprojekt'], value_columns: [{ name: 'faktor_max', type: 'number' }, { name: 'modal', type: 'string' }, { name: 'gedruckt', type: 'string' }],
    override_policy: 'anhaltswert',
    override_quote: Q_L1623_FAKTOR15,
    verification_status: 'md_verified', rows };
}

/** The live DWA-M-820-1 set (six tables), in the order the brief's Step 2 lists them (+ ANHB11 and E1_4_1_UMSATZ). */
export function m8201SeedTables(): RegulationTable[] {
  return [tabD1AsTable(), anhB23AsTable(), s81036AsTable(), s39VgvAsTable(), anhB11AsTable(), e141UmsatzAsTable()];
}
