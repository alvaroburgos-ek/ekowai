/**
 * DIN-14021 — Plan 3 Task 25 field configs (the claims register — one row per
 * self-declared claim with the §7 type-specific block per row —, the §6.5.3 a) – g)
 * documentation checklist, the §5.3 – §5.10 general-requirements checklist, the
 * `unqualified_claim` attestation) as DATA for
 * `scripts/regulation-tables/emit-field-configs-sql.ts din14021`.
 *
 * Every `verification_quote` is a span of the bilingual (DE / EN) markdown transcript
 * `Desktop\Guidelines\DWA DIN Scribd\DIN-14021\DIN-EN-ISO-14021.md` (DIN EN ISO
 * 14021:2016; the GERMAN column is the primary span), lifted by line range into
 * `regulation-tables-quotes-din14021.ts` (the line range is the constant's name;
 * clause numbers in the comments). Prod facts come from the captured
 * `din14021.prior.json` (2026-09-18, read-only): section codes are single letters
 * (-01 B "Eingabeparameter"; -03 C "Allgemeine Anforderungen (5.3-5.7)", D "Symbole &
 * Drei-Pfeile-Symbol (5.8-5.10)"; -04 D "Vergleichende Aussagen (6.3)", E
 * "Verfahrensauswahl & Informationszugang (6.4-6.5)"; -05 C "Master_Per_Type Matrix
 * (7.2-7.17)"; -06 F "Zusammenfassung"); `selected_claim_type` (-01 B, 23 tokens)
 * is inherited on -05 ONLY (consumer_worksheets ["DIN-14021-05"]).
 *
 * Placement (a262e trap 1 / iso5667_10 trap 9): the `claims` register lives on -01
 * (where the single-claim scalars live) and carries its OWN `claim_type` column over
 * the same 23 tokens (CLAIMMAP keys, D-1 / G-A3); the `unqualified_claim` scalar lives
 * on -05, where `selected_claim_type` resolves. The register's per-type columns are
 * switched in ROW scope by `numeric_block` (a CLAIMMAP lookup_value, refilled on key
 * pick) and by `claim_type` itself.
 *
 * Emitted rules on EXISTING fields: NONE — every brief target is refused by the
 * emitter's guards (Task 19 trap 7 at corpus scale): the -04 comparison fields, the
 * -03 symbol / Möbius fields and the -05 numeric fields are all consumed by -06
 * (producer guard; the -05 inputs transitively through EQ-01 / EQ-02 / EQ-03), and
 * REQ-11 / -14 / -15 / -16 / -20 / -21 / -22 / -23 / -24 / -25 / -46 / -48 / -49 read them
 * (gate-aware guard). Each refusal is pinned in `field-configs-din14021.test.ts` and
 * routed to a STAGED block (scripts/verification/din14021-STAGED-plan3-rulings.sql:
 * G-19 the -04 comparison block, G-22 the -03 symbol pair, G-23 … G-27 the -05 blocks,
 * G-28 the Möbius pair). The visibility story therefore lives on the CREATED fields
 * (the register's row-scope rules + `unqualified_claim`).
 *
 * NOT emitted (STAGED / sign-off):
 *   - `contains()`-based completeness codes over the two checklists (the brief's
 *     -06 D2 / D3) and the verdict D4 — neither the save-path materialiser nor the
 *     form / report engines pass json checklist carriers to `contains()`, and booleans
 *     (`verifiable_without_confidential`) never reach scalar equations → din14021-F-1
 *     ([CODE]); the intended formulas are recorded there.
 *   - the retirement of the scalars the register twins → the D-blocks (amendment K).
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import { Q } from '../regulation-tables-quotes-din14021';
import { CLAIMMAP_ROWS, S5_3_5_10_ROWS, S6_5_3_ROWS, headingText, itemText } from '../regulation-tables-seed-din14021';

const STD = 'DIN-14021';

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS01 = on('DIN-14021-01');
const WS03 = on('DIN-14021-03');
const WS04 = on('DIN-14021-04');
const WS05 = on('DIN-14021-05');

// ---- prod tokens as captured 2026-09-18 (value + label_de byte-for-byte; pinned against the prior) ----
export const CLAIM_TYPES = CLAIMMAP_ROWS.map((r) => r.claim_type); // = prod selected_claim_type tokens, in prod order
export const CLAIM_SCOPES = [
  { value: 'complete_product', label_de: 'gesamtes Produkt' }, { value: 'product_component', label_de: 'Produktbestandteil' },
  { value: 'packaging', label_de: 'Verpackung' }, { value: 'service_element', label_de: 'Dienstleistungselement' },
] as const; // prod claim_scope (-01)
export const CHANNELS = [
  { value: 'product_packaging_label', label_de: 'Produkt-/Verpackungsaufschrift' }, { value: 'product_literature', label_de: 'Produktliteratur' },
  { value: 'technical_bulletin', label_de: 'technisches Bulletin' }, { value: 'advertising', label_de: 'Werbung' },
  { value: 'telemarketing', label_de: 'Telemarketing' }, { value: 'digital_electronic_media', label_de: 'digitale/elektronische Medien' },
] as const; // prod communication_channel (-01)
export const COMPARISON_BASES = [
  { value: 'own_prior_process', label_de: 'eigenes vorheriges Verfahren' }, { value: 'own_prior_product', label_de: 'eigenes vorheriges Produkt' },
  { value: 'other_org_process', label_de: 'Verfahren anderer Organisation' }, { value: 'other_org_product', label_de: 'Produkt anderer Organisation' },
] as const; // prod comparison_basis (-04)
const labels = (xs: ReadonlyArray<{ value: string; label_de: string }>) => Object.fromEntries(xs.map((x) => [x.value, x.label_de]));

// ---- drivers (quoted enum tokens — Task 13 rule; booleans `== true`) ----
/** §7.14.2 / §7.15.2 / §7.16.1 / §7.17.3.2 — the four types whose clause prints an "uneingeschränkte Aussage" rule (grep in the report §3). */
export const UNQUALIFIED_TYPES = ['renewable_material', 'renewable_energy', 'sustainable', 'carbon_neutral'] as const;
export const UNQUALIFIED_SCALAR = `selected_claim_type IN {${UNQUALIFIED_TYPES.map((t) => `'${t}'`).join(', ')}}`;
// row-scope drivers of the claims register (column names; tokens = CLAIMMAP keys / numeric_block values)
export const ROW_UNQUALIFIED = `claim_type IN {${UNQUALIFIED_TYPES.map((t) => `'${t}'`).join(', ')}}`;
export const ROW_MOBIUS = "claim_type IN {'recyclable', 'recycled_content'}"; // §5.10.2.4 L910
export const ROW_CARBON_NEUTRAL = "claim_type == 'carbon_neutral'"; // §7.17.3.3 L1864
export const ROW_COMPARATIVE = 'comparative == true'; // §6.3.1 L958–L962
export const ROW_RECOVERED = "numeric_block == 'recovered_energy'"; // §7.6.3
export const ROW_RECYCLED = "numeric_block == 'recycled_content'"; // §7.8.4
export const ROW_REDUCED = "numeric_block == 'reduced_resource'"; // §7.10.3
export const ROW_RENEWABLE = "numeric_block IN {'renewable_material', 'renewable_energy'}"; // §7.14.2 / §7.15.2
export const ROW_CARBON = "numeric_block == 'carbon'"; // §7.17.2.2 / §7.17.3

// ---- the printed per-row formulas / conditions as row exprs (structural constants: the printed × 100; the printed 100 % of §7.14.2 / §7.15.2) ----
/** §7.6.3 b) L1300–L1303: Zurückgewonnene Nettoenergie (%) = (R−E) / ((R−E)+P) × 100 (prod EQ-01 on the scalars). */
export const NET_RECOVERED_EXPR = '(r - e) / ((r - e) + p) * 100';
/** §7.8.4.1 L1480: X(%) = A / P × 100 (prod EQ-02). */
export const RECYCLED_EXPR = 'a_mass / p_mass * 100';
/** §7.10.3 L1570: U(%) = (I−N) / I × 100 (prod EQ-03). */
export const REDUCED_EXPR = '(i_res - n_res) / i_res * 100';
/** §7.6.3 a) L1297 "Die Aussage darf nur erfolgen, wenn R-E>0." — 0 when R or E is not entered (decidable badge, never a null cell); 1 on every other type. The badge follows the printed a) condition literally: R and E entered with R−E>0 ⇒ 1 even while P (needed only for the b) percentage) is blank — the net percentage stays open until P is typed (label says so; fix round 1). */
export const RECOVERED_OK_EXPR = `if(${ROW_RECOVERED}, if(r IS NULL OR e IS NULL, 0, if(r - e > 0, 1, 0)), 1)`;
/** §7.14.2 L1719 / §7.15.2 L1763 "Eine uneingeschränkte Aussage … ist nur zulässig, wenn … 100 %" — an unqualified renewable claim needs the printed 100; a qualified one passes; 0 when the share is not entered. */
export const RENEWABLE_OK_EXPR = `if(${ROW_RENEWABLE}, if(unqualified == true, if(renewable_pct IS NULL, 0, if(renewable_pct == 100, 1, 0)), 1), 1)`;
/** §7.17.3.2 L1856 "Eine uneingeschränkte Aussage zu „CO2-neutral“ darf nicht gemacht werden." / §7.16.1 L1801 "uneingeschränkte Anbietererklärungen zu „nachhaltig“ … nicht verwendet werden dürfen". */
export const UNQUALIFIED_OK_EXPR = "if(claim_type IN {'carbon_neutral', 'sustainable'}, if(unqualified == true, 0, 1), 1)";
/** §7.5.2.1 / 7.9.2.1 / 7.10.2.4 / 7.11.2.1 / 7.13.2.1 "Weil … eine vergleichende Aussage ist, müssen die Anforderungen von 6.3 erfüllt sein" — CLAIMMAP.comparative_by_clause; the box must be ticked for those types. */
export const COMPARATIVE_OK_EXPR = 'if(comparative_required == true, if(comparative == true, 1, 0), 1)';
/** The row verdict over the four per-block checks (declared after them — derived cells are evaluated in declaration order). */
export const TYPE_OK_EXPR = 'if(recovered_ok == 1 AND renewable_ok == 1 AND unqualified_ok == 1 AND comparative_ok == 1, 1, 0)';

/** §6.5.3 a) – g): value = the printed line "a) …" (the checklist renders enum_values[].value — m820_2 trap 1), one per S6_5_3 row. */
export const DOCUMENTATION_ITEMS = S6_5_3_ROWS.map((r, i) => ({ value: `${r.item}) ${itemText(r.item, r.quote)}`, label_de: `${r.item}) ${itemText(r.item, r.quote)}`, order_index: i }));
/** §5.3 – §5.10: value = the printed heading ("5.3 Unbestimmte oder unspezifische Aussagen"), one per S5_3_5_10 row. */
export const GENERAL_REQUIREMENT_ITEMS = S5_3_5_10_ROWS.map((r, i) => ({ value: headingText(r.headingSpan), label_de: headingText(r.headingSpan), order_index: i }));

const CLAIMS_NOTE = `${Q.L1059} Je Aussage eine Zeile; der Aussagetyp füllt Abschnitt, gedruckte Bedingung und Zahlenblock aus CLAIMMAP. Die Zahlenspalten des gewählten Blocks sind Zwillinge der Einzelfelder auf DIN-14021-05 (R/E/P → EQ-01, A/P → EQ-02, I/N → EQ-03, Anteile, Carbon Footprint) und die Kopfspalten Zwillinge von selected_claim_type / claim_scope / communication_channel / symbol_used (-01), mobius_loop_used / explanatory_statement (-03), comparative_claim / comparison_basis / comparison_time_interval (-04) — die Einzelfelder bleiben bis zur Ratifizierung (din14021-D-1 … D-24). Die gedruckte Bedingung („darf nur … wenn“) ist je Zeile vom Ingenieur zu beurteilen (din14021-J-4); nur R−E>0, die 100 % der uneingeschränkten Erneuerbarkeits-Aussagen, das Verbot der uneingeschränkten „CO2-neutral“- / „nachhaltig“-Aussage und die Vergleichspflicht der fünf vergleichenden Aussagetypen sind als Zeilenprüfung berechnet (type_ok). Die 18 Typ-Gates REQ-28 … REQ-45 auf -01 und die Zahlen-Gates REQ-20 … REQ-25 / REQ-49 auf -05 sind heute unbedingt — IF-Guards STAGED (din14021-G-1 … G-27).`;

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- DIN-14021-01: the claims register (§7 — one row per claim) + its three outputs ----
  WS01({
    symbol: 'claims', widget: 'register',
    ui_config: {
      title: 'Umweltbezogene Anbietererklärungen (Aussagen)', subtitle: '§7 — je Aussage eine Zeile; der Aussagetyp bestimmt die spezifischen Anforderungen (Abschnitt, gedruckte Bedingung, Zahlenblock)', add_label: '+ Aussage', placement: 'section',
      columns: [
        { key: 'claim_type', label: 'Aussagetyp', type: 'lookup_key', required: true, lookup: { table_code: 'CLAIMMAP' }, discriminator: true, aria_label: 'Aussagetyp (§7)' },
        { key: 'clause', label: 'Abschnitt', type: 'lookup_value', lookup: { table_code: 'CLAIMMAP', key_column: 'claim_type', value: 'clause' }, width: '6rem' },
        { key: 'numeric_block', label: 'Zahlenblock (§7)', type: 'lookup_value', lookup: { table_code: 'CLAIMMAP', key_column: 'claim_type', value: 'numeric_block' }, width: '8rem' },
        { key: 'condition_text', label: 'Bedingung (§7.x, gedruckt)', type: 'lookup_value', lookup: { table_code: 'CLAIMMAP', key_column: 'claim_type', value: 'condition_text' }, width: '22rem' },
        { key: 'comparative_required', label: 'vergleichend lt. Abschnitt', type: 'lookup_value', lookup: { table_code: 'CLAIMMAP', key_column: 'claim_type', value: 'comparative_by_clause' }, width: '6rem' },
        { key: 'scope', label: 'Geltungsbereich', type: 'enum', options: CLAIM_SCOPES.map((o) => o.value), option_labels: labels(CLAIM_SCOPES), aria_label: 'Geltungsbereich der Aussage (§5.7 d)' },
        { key: 'channel', label: 'Kommunikationsweg', type: 'enum', options: CHANNELS.map((o) => o.value), option_labels: labels(CHANNELS), aria_label: 'Kommunikationsweg der Aussage (§3.1.4)' },
        { key: 'symbol', label: 'Symbol', type: 'boolean', aria_label: 'Symbol verwendet (§5.8.1)' },
        { key: 'mobius', label: 'Drei-Pfeile-Symbol', type: 'boolean', visible_when: ROW_MOBIUS, aria_label: 'Drei-Pfeile-Symbol verwendet (§5.10.2.4, nur Recyclatgehalt / Recyclingfähigkeit)' },
        { key: 'explanatory', label: 'ergänzende Erklärung', type: 'text', aria_label: 'Ergänzende Erklärung zur Aussage (§5.6)' },
        { key: 'unqualified', label: 'uneingeschränkte Aussage', type: 'boolean', visible_when: ROW_UNQUALIFIED, aria_label: 'Uneingeschränkte Aussage (§7.14.2 / §7.15.2 / §7.16.1 / §7.17.3.2)' },
        { key: 'comparative', label: 'vergleichend', type: 'boolean', aria_label: 'Vergleichende Aussage (§6.3)' },
        { key: 'comparison_basis', label: 'Vergleichsbasis', type: 'enum', options: COMPARISON_BASES.map((o) => o.value), option_labels: labels(COMPARISON_BASES), visible_when: ROW_COMPARATIVE, aria_label: 'Vergleichsbasis (§6.3.1 a–d)' },
        { key: 'comparison_months', label: 'Zeitraum (Monate)', type: 'number', min: 0, visible_when: ROW_COMPARATIVE, aria_label: 'Berechnungszeitraum des Vergleichs in Monaten (§6.3.2 c, gewöhnlich 12)' },
        // §7.6.3 recovered energy
        { key: 'r', label: 'R', type: 'number', unit: 'MJ', min: 0, visible_when: ROW_RECOVERED, aria_label: 'R — Energiemenge aus dem Prozess der Energierückgewinnung' },
        { key: 'e', label: 'E', type: 'number', unit: 'MJ', min: 0, visible_when: ROW_RECOVERED, aria_label: 'E — Energie aus Primärquellen für den Rückgewinnungsprozess' },
        { key: 'p', label: 'P', type: 'number', unit: 'MJ', min: 0, visible_when: ROW_RECOVERED, aria_label: 'P — Energie aus Primärquellen beim Herstellungsverfahren' },
        { key: 'net_recovered_pct', label: 'Zurückgewonnene Nettoenergie (%)', type: 'derived', expr: NET_RECOVERED_EXPR, visible_when: ROW_RECOVERED },
        // §7.8.4 recycled content
        { key: 'a_mass', label: 'A', type: 'number', unit: 'kg', min: 0, visible_when: ROW_RECYCLED, aria_label: 'A — Masse des recycelten Materials' },
        { key: 'p_mass', label: 'P', type: 'number', unit: 'kg', min: 0, visible_when: ROW_RECYCLED, aria_label: 'P — Produktmasse' },
        { key: 'recycled_pct', label: 'X (%)', type: 'derived', expr: RECYCLED_EXPR, visible_when: ROW_RECYCLED },
        // §7.10.3 reduced resource use
        { key: 'i_res', label: 'I', type: 'number', min: 0, visible_when: ROW_REDUCED, aria_label: 'I — anfänglicher Ressourcenverbrauch je Produktionseinheit' },
        { key: 'n_res', label: 'N', type: 'number', min: 0, visible_when: ROW_REDUCED, aria_label: 'N — neuer Ressourcenverbrauch je Produktionseinheit' },
        { key: 'reduced_pct', label: 'U (%)', type: 'derived', expr: REDUCED_EXPR, visible_when: ROW_REDUCED },
        // §7.14.2 / §7.15.2 renewable
        { key: 'renewable_pct', label: 'Anteil erneuerbar (%)', type: 'number', unit: '%', min: 0, max: 100, visible_when: ROW_RENEWABLE, aria_label: 'Anteil erneuerbares Material / erneuerbare Energie in Prozent' },
        // §7.17 carbon
        { key: 'carbon_footprint', label: 'CO2-Fußabdruck (ISO/TS 14067)', type: 'number', unit: 'kg CO2e', visible_when: ROW_CARBON, aria_label: 'Carbon Footprint des Produktes nach ISO/TS 14067' },
        { key: 'carbon_offset_declared', label: 'Ausgleich erklärt', type: 'boolean', visible_when: ROW_CARBON_NEUTRAL, aria_label: 'Ausgleich erklärt — Carbon Footprint angegeben und Ausgleich erläutert (§7.17.3.3)' },
        // row verdicts (declaration order matters: type_ok reads the four checks)
        { key: 'recovered_ok', label: '§7.6.3 a)', type: 'derived', expr: RECOVERED_OK_EXPR, display: 'badge', value_labels: { '1': 'R−E>0 erfüllt (oder nicht zutreffend; Nettoenergie erst mit P)', '0': 'R−E>0 nicht erfüllt oder R / E nicht eingetragen (§7.6.3 a)' } },
        { key: 'renewable_ok', label: '§7.14.2 / §7.15.2', type: 'derived', expr: RENEWABLE_OK_EXPR, display: 'badge', value_labels: { '1': '100 % erfüllt, eingeschränkte Aussage oder nicht zutreffend', '0': 'uneingeschränkte Aussage ohne 100 % (§7.14.2 / §7.15.2)' } },
        { key: 'unqualified_ok', label: '§7.16.1 / §7.17.3.2', type: 'derived', expr: UNQUALIFIED_OK_EXPR, display: 'badge', value_labels: { '1': 'zulässig (eingeschränkt oder nicht zutreffend)', '0': 'uneingeschränkte Aussage unzulässig (§7.16.1 / §7.17.3.2)' } },
        { key: 'comparative_ok', label: '§6.3', type: 'derived', expr: COMPARATIVE_OK_EXPR, display: 'badge', value_labels: { '1': 'Vergleichspflicht erfüllt oder nicht zutreffend', '0': 'Aussagetyp ist vergleichend (6.3), Vergleich nicht angegeben' } },
        { key: 'type_ok', label: 'Typbedingung erfüllt', type: 'derived', expr: TYPE_OK_EXPR, display: 'badge', value_labels: { '1': 'Typbedingung erfüllt', '0': 'Typbedingung nicht erfüllt' } },
      ],
      footer: ['claims_count', 'claims_type_fail', 'specific_requirements_met_code'],
      note: CLAIMS_NOTE,
    },
    verification_quote: `${Q.L1059} — ${Q.L1297}`,
    create: { section_code: 'B', label_de: 'Umweltbezogene Anbietererklärungen (je Aussage: Typ, Abschnitt, gedruckte Bedingung, Geltungsbereich, Kommunikationsweg, Symbol, ergänzende Erklärung, Vergleich, Zahlenblock nach §7)', data_type: 'json', unit: null, clause_reference: '§7.2–§7.17, §5.6, §5.7 d), §5.8, §5.10.2, §6.3',
      description: 'Plan 3: Zeilen je Aussage — der Aussagetyp (CLAIMMAP, die 23 Token von selected_claim_type) füllt Abschnitt, gedruckte Bedingung und Zahlenblock; je Block die gedruckten Formeln als Zeilenwerte (§7.6.3 (R−E)/((R−E)+P)×100, §7.8.4 A/P×100, §7.10.3 (I−N)/I×100) und die gedruckten Prüfungen (R−E>0, 100 % bei uneingeschränkter Erneuerbarkeits-Aussage, keine uneingeschränkte CO2-neutral- / nachhaltig-Aussage, Vergleichspflicht nach 6.3) → type_ok; Anzahl → claims_count (DIN-14021-01-D1), Zeilen mit nicht erfüllter Typbedingung → claims_type_fail (-D2), spezifische Anforderungen erfüllt → specific_requirements_met_code (-D3). Die Einzelskalare bleiben (din14021-D-1 … D-24); IF-Guards der Typ-Gates STAGED (din14021-G-1 … G-27).' },
  }),
  WS01({
    symbol: 'claims_count', widget: 'derived', ui_config: null, verification_quote: Q.L1063_1074,
    create: { section_code: 'B', label_de: 'Anzahl Aussagen (aus dem Register)', data_type: 'number', unit: null, clause_reference: '§7.1',
      description: 'Plan 3: Ausgabe der Gleichung DIN-14021-01-D1 (count_rows über claims) — mehrere Aussagen je Produkt (z. B. recyclingfähig + Recyclatgehalt).' },
  }),
  WS01({
    symbol: 'claims_type_fail', widget: 'derived', ui_config: null, verification_quote: Q.L1297,
    create: { section_code: 'B', label_de: 'Aussagen mit nicht erfüllter Typbedingung (R−E>0, 100 % uneingeschränkt, uneingeschränkt CO2-neutral / nachhaltig, Vergleichspflicht 6.3)', data_type: 'number', unit: null, clause_reference: '§7.6.3 a), §7.14.2, §7.15.2, §7.16.1, §7.17.3.2, §6.3',
      description: 'Plan 3: Ausgabe der Gleichung DIN-14021-01-D2 (count_rows über claims, type_ok == 0); Grundlage der STAGED IF-Guards (din14021-G-23 … G-27) und von specific_requirements_met_code.' },
  }),
  WS01({
    symbol: 'specific_requirements_met_code', widget: 'derived', ui_config: null, verification_quote: `${Q.L1059} — ${Q.L1297}`,
    create: { section_code: 'B', label_de: 'Spezifische Anforderungen erfüllt (1 = jede Aussage besteht ihre Typprüfung, 0 = sonst oder keine Aussage erfasst)', data_type: 'number', unit: null, clause_reference: '§7',
      description: 'Plan 3: Ausgabe der Gleichung DIN-14021-01-D3 — 1, wenn mindestens eine Aussage erfasst ist und keine Zeile type_ok == 0 hat (leeres Register ⇒ 0, nie ein Phantom-Pass); Zwilling des Hand-Booleans specific_requirements_met auf DIN-14021-06 („Aggregat“, din14021-D-25) — Vererbung nach -06 STAGED (din14021-C-1).' },
  }),

  // ---- DIN-14021-03: the §5.3 – §5.10 general requirements as a checklist (the twelve prod booleans stay — D-blocks) ----
  WS03({
    symbol: 'general_requirements_items', widget: 'select_many',
    ui_config: {
      title: 'Anforderungen an alle umweltbezogenen Anbietererklärungen (§5.3 – §5.10)', subtitle: '„Die in Abschnitt 5 aufgeführten Anforderungen gelten für sämtliche umweltbezogenen Anbietererklärungen“ — ankreuzen, welche Abschnitte geprüft und erfüllt sind', note: `${Q.L757} Die zwölf Einzel-Booleans dieses Arbeitsblatts (5.3 … 5.7 a/b/h/i/r, 5.8.3, 5.8.5, 5.10.2) bleiben bis zur Ratifizierung (din14021-D-26 … D-35); ein Vollständigkeits-Code (alle acht angekreuzt) ist noch nicht codiert — Entscheidung auf dem Sign-off-Bogen (din14021-F-1).`,
      groups: [{ label: '§5.3 – §5.10', options: GENERAL_REQUIREMENT_ITEMS.map((m) => m.value) }],
    },
    enum_values: GENERAL_REQUIREMENT_ITEMS.map((m) => ({ value: m.value, label_de: m.label_de, order_index: m.order_index })),
    verification_quote: `${Q.L757} — ${Q.L823}`,
    create: { section_code: 'C', label_de: 'Allgemeine Anforderungen §5.3 – §5.10 (Prüfliste, Mehrfachauswahl)', data_type: 'json', unit: null, clause_reference: '§5.3–§5.10',
      description: 'Plan 3: Mehrfachauswahl über die acht gedruckten Abschnitte 5.3 … 5.10 (S5_3_5_10); die zwölf Einzel-Booleans bleiben (din14021-D-26 … D-35); general_requirements_met_code ist STAGED (din14021-F-1 — seit Plan 3 Welle A erreicht contains() den Materialisierer; der Block bleibt bis zur Ratifizierung STAGED).' },
  }),

  // ---- DIN-14021-04: the §6.5.3 a) – g) minimum documentation as a checklist (info_documented_min stays — D-block) ----
  WS04({
    symbol: 'documentation_items', widget: 'select_many',
    ui_config: {
      title: 'Mindestangaben der Dokumentation (§6.5.3 a) – g))', subtitle: '„Die Mindestangaben, die nach 6.2 zu dokumentieren und aufzubewahren sind, müssen Folgendes enthalten:“ — ankreuzen, was dokumentiert und aufbewahrt ist', note: `${Q.L1032} Das Einzelfeld info_documented_min (ein Boolean für alle sieben) bleibt bis zur Ratifizierung (din14021-D-36); REQ-19 liest heute den Skalar — ein Vollständigkeits-Code ist noch nicht codiert — Entscheidung auf dem Sign-off-Bogen (din14021-F-1).`,
      groups: [{ label: '§6.5.3 a) – g)', options: DOCUMENTATION_ITEMS.map((m) => m.value) }],
    },
    enum_values: DOCUMENTATION_ITEMS.map((m) => ({ value: m.value, label_de: m.label_de, order_index: m.order_index })),
    verification_quote: `${Q.L1032} — ${Q.L1033}`,
    create: { section_code: 'E', label_de: 'Mindestangaben der Dokumentation §6.5.3 a) – g) (Prüfliste, Mehrfachauswahl)', data_type: 'json', unit: null, clause_reference: '§6.5.3',
      description: 'Plan 3: Mehrfachauswahl über die sieben gedruckten Mindestangaben a) – g) (S6_5_3); das Einzelfeld info_documented_min bleibt (din14021-D-36); verification_requirements_met_code ist STAGED (din14021-F-1).' },
  }),

  // ---- DIN-14021-05: the "unqualified vs qualified" driver (scalar mirror for the single-claim worksheets; selected_claim_type is inherited here) ----
  WS05({
    symbol: 'unqualified_claim', widget: 'attestation', ui_config: null, visible_when: UNQUALIFIED_SCALAR,
    verification_quote: `${Q.L1719_1721} — ${Q.L1763}`,
    create: { section_code: 'C', label_de: 'Uneingeschränkte Aussage (§7.14.2 / §7.15.2: nur bei 100 %; §7.16.1 / §7.17.3.2: unzulässig)', data_type: 'boolean', unit: null, clause_reference: '§7.14.2, §7.15.2, §7.16.1, §7.17.3.2',
      description: 'Plan 3: der in den Prod-Validierungsregeln genannte, aber nicht vorhandene Treiber („renewable_material_pct eq 100 when unqualified_claim“) — Bestätigung, dass die Aussage uneingeschränkt gemacht wird; nur für die vier Aussagetypen sichtbar, deren Abschnitt eine „uneingeschränkte Aussage“ regelt; die 100-%-Gates (REQ-22 / REQ-23) und das Verbot (CO2-neutral / nachhaltig) sind STAGED (din14021-G-25 / G-26 / G-27); die Registerspalte unqualified ist der Zwilling je Zeile (din14021-D-11).' },
  }),
];

/**
 * No section rules: every DIN-14021 section either holds consumed / gate-read fields (the worksheet-level
 * "applicability" of -05 by claim type is the 18 + 7 STAGED IF-guards, never a hide of consumed producers) or
 * is field-less (A / J / K / L / M — an inert rule).
 */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
