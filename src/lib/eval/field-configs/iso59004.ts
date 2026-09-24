/**
 * ISO-59004 — Plan 3 Task 29 field configs (the §5.2 principles checklist, the §3.6.1 circularity-aspect
 * checklist, the §6.7 actions register, the §7.3.2 goals register and the §7.6 indicator register, plus
 * the two §6.7 / §7.1.3 conditionals) as DATA for
 * `scripts/regulation-tables/emit-field-configs-sql.ts iso59004`. LAST of the 29 standards.
 *
 * SOURCE. Every `verification_quote` is a span of the IN-SESSION `pdftotext -layout` extraction of the
 * standard's own PDF (`regulation-tables-quotes-iso59004.ts`, PDF page in the span's doc comment) — grade
 * VA under SR-3. iso59004-J-1: the PDF is a FINAL DRAFT (`Q.L409` = "FINAL DRAFT International Standard"
 * beside "ISO/FDIS 59004:2024(en)"), NOT the published ISO 59004:2024; every quote in this module comes
 * from that draft and the owner rules whether the corpus may be encoded against a draft at all.
 *
 * Prod facts come from the captured `iso59004.prior.json` / `iso59004.text.prior.json` (read-only
 * 2026-09-24): 6 worksheets, 33 fields, 0 equations, 44 gates of which 24 carry an EMPTY condition
 * (the inventory said 22 — the capture is the authority, see the report). Section codes are single
 * letters: -02 H "Terms related to measurement & assessment (3.6)"; -04 C "The Six Principles
 * (5.2.1-5.2.6)"; -05 B "Preliminary Actions", G "Guidance for resource management actions (6.7,
 * Table 1)"; -06 B "Overview & Levels (7.1)", D "Purpose, mission, vision & goals (7.3)", G
 * "Monitoring, reviewing & reporting (7.6)".
 *
 * WHAT IS NOT HERE, and why (each one is a sign-off block, none is a silent drop):
 *
 *   - iso59004-F-1 — `all_principles_considered_code` (the brief's ISO-59004-04-D1,
 *     `if(contains(principles, 'p1') AND … , 1, 0)`). `contains()` over a json `select_many` carrier has
 *     NO engine path: no production `evaluateFormula` caller passes `carriers`, so the aref resolves to
 *     nothing. PROBED in this session — `evaluateFormula` on that exact formula returns
 *     `{kind:'manual_required', reason:'Unbekanntes Symbol "principles" im Ausdruck.'}`. The formula is
 *     recorded verbatim in the sign-off with the [CODE] gap; the prod hand boolean
 *     `all_principles_considered` (is_required, CR-013) is untouched and keeps enforcing.
 *
 *   - iso59004-J-4 — the five `implementation_stage == '<stage>'` rules of the brief's Step 4. They are
 *     NOT emitted, for two independent reasons. (a) The standard itself refutes stage-gating: §7.1.4
 *     prints "NOTE The sequence of stages can differ and can also occur at the same time or in parallel."
 *     (`Q.L2736`) and §7.1.4 calls the process iterative (`Q.L2731_2736`) — hiding four fifths of -06
 *     because ONE current stage is selected contradicts the printed text. (b) Independently, the
 *     gate-aware guard (amendment M) REFUSES eight of the eleven candidate hides because a same-worksheet
 *     gate reads the symbol; the refusals are asserted through the emitter in the test
 *     (`WITHHELD_STAGE_RULES`). The three the guard would accept (`feasibility_dimension`,
 *     `pilot_project`, `selected_circularity_indicator`) are withheld by (a) alone and say so.
 *
 *   - iso59004-J-3 — the brief's per-row rule `life_cycle_note visible_when "action IN {recycle, recover,
 *     re_mine}"`. Refuted twice: the token `recover` does NOT exist in prod (the prod `selected_action`
 *     enum has `recover_energy`; the failing grep is in the report), and §6.7's FIRST sentence makes the
 *     life-cycle perspective apply to EVERY action — "A life cycle perspective should guide the
 *     organization in the identification of the best action for their value creation model and to avoid
 *     unwanted trade-offs." (`Q.L2537_2540`). The printed ordering rule (`Q.L2561_2563`) names repair /
 *     remanufacture / recycle, not recycle / recover / re-mine. Fail-safe: the column has NO
 *     `visible_when` and is always offered; the sign-off proposes the source-grounded
 *     `action IN {'repair', 'remanufacture', 'recycle'}` as the alternative.
 *
 *   - iso59004-S-1 — deactivating `defined_term` (the 23-term glossary single-select, consumer_worksheets
 *     ["ALL"]). A field deactivation is structural ⇒ STAGED only; this module does not touch the field at
 *     all, not even its widget.
 *
 *   - iso59004-U-1 — Table 1 is NOT seeded (no printed category column; the two printed columns interleave
 *     in the extraction), so `actions.category` is an ENGINEER-ENTERED enum over the prod
 *     `action_category` tokens and there is NO `lookup_fill` and no `lookup_key`/`lookup_value` column in
 *     this standard.
 *
 *   - iso59004-I-1 — a register column cannot be a MULTI-select: `registerColumn.type` is
 *     text|number|boolean|enum|date|lookup_key|lookup_value|derived|grid. §7.4.5 prints SIX feasibility
 *     dimensions that an action is assessed against TOGETHER, so `actions.feasibility_dimensions` is a
 *     `text` column with the six printed dimensions as its datalist (the brief's shape), and the missing
 *     column type is recorded for the final [CODE] wave.
 *
 * Amendment K (register column ↔ existing prod scalar): ten pairs, one D-block each (D-1 … D-10). Every
 * scalar STAYS; nothing is retired here.
 */
import type { FieldConfigEntry, SectionVisibilityEntry, FieldConfigModule } from './types';
import { Q, SENTENCE_5_3_2 } from '../regulation-tables-quotes-iso59004';
import { collapseNoWatermark } from '../regulation-tables-seed-iso59004';

const STD = 'ISO-59004';
const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS02 = on('ISO-59004-02');
const WS04 = on('ISO-59004-04');
const WS05 = on('ISO-59004-05');
const WS06 = on('ISO-59004-06');

/**
 * Collapse a quote span for PROSE (a rendered note, a `verification_quote`), dropping whole
 * watermark-ONLY lines by the explicit token list of `regulation-tables-seed-iso59004.ts`
 * (iso59004-U-2). The RAW span in `regulation-tables-quotes-iso59004.ts` is never rewritten, and the
 * seeded rows' `verbatim_quote` keeps the watermark verbatim — this helper exists only so a rendered
 * sentence does not read "… identification of the et best action …". Where a watermark token is glued
 * INSIDE a body line (L2629 "deGenerate", L2711 "ojnongovernmental") no helper can clean it, and the
 * entry uses a different, clean span instead and says so.
 */
const norm = collapseNoWatermark;

// ---------------------------------------------------------------------------
// prod enum tokens (captured READ-ONLY 2026-09-24 from iso59004.prior.json) — byte-identical, G-A3.
// Every list below is asserted equal to the prior's `enum_values` in field-configs-iso59004.test.ts.
// ---------------------------------------------------------------------------
/** prod `ISO-59004-05 selected_action` (13). The thirteen printed Table-1 Action labels in printed order. */
export const ACTION_TOKENS = ['refuse', 'rethink', 'source', 'reduce', 'repair', 're_use', 'refurbish', 'remanufacture', 'repurpose', 'cascade', 'recycle', 'recover_energy', 're_mine'] as const;
/** prod `ISO-59004-05 selected_action` German labels, in token order. */
export const ACTION_LABELS: Record<string, string> = {
  refuse: 'Verweigern', rethink: 'Ueberdenken', source: 'Beziehen', reduce: 'Reduzieren', repair: 'Reparieren',
  re_use: 'Wiederverwenden', refurbish: 'Aufarbeiten', remanufacture: 'Wiederaufbereiten', repurpose: 'Umnutzen',
  cascade: 'Kaskadieren', recycle: 'Recyceln', recover_energy: 'Energie zurueckgewinnen', re_mine: 'Rueckgewinnen aus Deponien',
};
/** prod `ISO-59004-05 action_category` (5) = the five §6.2 – §6.6 action groups. */
export const CATEGORY_TOKENS = ['create_added_value', 'value_retention', 'value_recovery', 'regenerate_ecosystems', 'support_transition'] as const;
export const CATEGORY_LABELS: Record<string, string> = {
  create_added_value: 'Wertschaffung (§6.2)', value_retention: 'Werterhaltung (§6.3)', value_recovery: 'Wertrueckgewinnung (§6.4)',
  regenerate_ecosystems: 'Oekosystem-Regeneration (§6.5)', support_transition: 'Transformationsunterstuetzung (§6.6)',
};
/** prod `ISO-59004-04 selected_principle` (6) = the six seeded S5_2 row keys. */
export const PRINCIPLE_TOKENS = ['systems_thinking', 'value_creation', 'value_sharing', 'resource_stewardship', 'resource_traceability', 'ecosystem_resilience'] as const;
/** prod `ISO-59004-04 selected_principle` labels (D-9: the checklist keeps prod's own labels). */
export const PRINCIPLE_LABELS: Record<string, string> = {
  systems_thinking: 'Systemdenken', value_creation: 'Wertschoepfung', value_sharing: 'Wertteilung',
  resource_stewardship: 'Ressourcenverantwortung', resource_traceability: 'Ressourcenrueckverfolgbarkeit', ecosystem_resilience: 'Oekosystem-Resilienz',
};
/** prod `ISO-59004-06 feasibility_dimension` (6) = the six printed §7.4.5 dimensions. */
export const FEASIBILITY_TOKENS = ['technical', 'organizational', 'financial_economic', 'context', 'social', 'environmental'] as const;
export const FEASIBILITY_LABELS: Record<string, string> = {
  technical: 'Technisch', organizational: 'Organisatorisch', financial_economic: 'Finanziell & wirtschaftlich',
  context: 'Kontext', social: 'Sozial', environmental: 'Umweltbezogen',
};
/** prod `ISO-59004-06 implementation_stage` (5) = §7.2 … §7.6. */
export const STAGE_TOKENS = ['context_reference_assessment', 'purpose_mission_vision_goals', 'strategic_priorities_action_plan', 'implementation', 'monitoring_reviewing_reporting'] as const;
/** prod `ISO-59004-06 implementation_level` (4) — §7.1.3 prints three levels plus the product level ISO 59020 adds. */
export const LEVEL_TOKENS = ['global_regional_country_local', 'interorganizational', 'organizational', 'product'] as const;

/**
 * §3.6.1 EXAMPLE (`Q.L1417`): "Durability, recyclability, reusability, repairability, recoverability."
 * iso59004-U-3: the standard prints these as an EXAMPLE, NOT as a closed list — the created checklist is
 * therefore additive beside prod's free-text `circularity_aspect`, which stays for anything else.
 */
export const CIRCULARITY_ASPECTS = [
  { value: 'durability', label_de: 'Dauerhaftigkeit (durability)' },
  { value: 'recyclability', label_de: 'Recyclingfaehigkeit (recyclability)' },
  { value: 'reusability', label_de: 'Wiederverwendbarkeit (reusability)' },
  { value: 'repairability', label_de: 'Reparierbarkeit (repairability)' },
  { value: 'recoverability', label_de: 'Rueckgewinnbarkeit (recoverability)' },
] as const;

// ---------------------------------------------------------------------------
// conditions + row expressions
// ---------------------------------------------------------------------------
/** §6.7 (`Q.L2561_2563`): the justification is asked exactly when the printed order is NOT followed. CR-028 rewrite is STAGED (iso59004-G-1). */
export const NOT_IN_PRINTED_ORDER = 'repair_before_remanufacture_before_recycle == false';
/** §7.1.3 (`Q.L2717_2718`): "Organizations that interact or operate across more than one system level should consider the relationships…". */
export const MULTI_LEVEL = 'operates_across_multiple_levels == true';
/** §6.1 (`Q.L1780`): "Organizations should consider refuse and rethink as preliminary actions." — 1 = this row IS one of the two. */
export const PRELIMINARY_EXPR = "if(action == 'refuse' OR action == 'rethink', 1, 0)";

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- ISO-59004-02: the §3.6.1 circularity aspects as a checklist (the free-text field stays — D-10) ----
  WS02({
    symbol: 'circularity_aspects', widget: 'select_many',
    ui_config: {
      title: 'Zirkularitaetsaspekte (§3.6.1)',
      subtitle: 'Die fuenf in §3.6.1 als EXAMPLE gedruckten Aspekte ankreuzen — Definition: „element of an organization’s (3.4.1) activities or solutions (3.2.1) that interacts with the circular economy (3.1.1)“',
      allow_custom: true,
      note: `${norm(Q.L1414_1415)} EXAMPLE ${norm(Q.L1417)} — iso59004-U-3: Die fuenf Aspekte sind als EXAMPLE gedruckt, nicht als abgeschlossene Liste; das Freitextfeld circularity_aspect bleibt fuer alles Weitere (iso59004-D-10). Dieselbe Liste ist in ISO-59020 ein Enum — Vererbung ist Phase 6 (iso59004-X-1).`,
      groups: [{ label: '§3.6.1 EXAMPLE', options: CIRCULARITY_ASPECTS.map((a) => a.value) }],
    },
    enum_values: CIRCULARITY_ASPECTS.map((a, i) => ({ value: a.value, label_de: a.label_de, order_index: i + 1 })),
    verification_quote: `${norm(Q.L1414_1415)} EXAMPLE ${norm(Q.L1417)} — PDF p.20 (gedruckte S. 13), §3.6.1`,
    create: { section_code: 'H', label_de: 'Zirkularitaetsaspekte (§3.6.1, Mehrfachauswahl)', data_type: 'json', unit: null, clause_reference: '§3.6.1',
      description: 'Plan 3: Mehrfachauswahl ueber die fuenf in §3.6.1 als EXAMPLE gedruckten Zirkularitaetsaspekte (Durability, recyclability, reusability, repairability, recoverability); das bestehende Freitextfeld circularity_aspect bleibt (iso59004-D-10, Vererbung nach -05/-06 unveraendert). Die Liste ist ein Beispiel, keine abgeschlossene Aufzaehlung (iso59004-U-3).' },
  }),

  // ---- ISO-59004-04: the six principles as a checklist (selected_principle stays — D-9) ----
  WS04({
    symbol: 'principles', widget: 'select_many',
    ui_config: {
      title: 'Grundsaetze (§5.2)',
      subtitle: '„The set of principles given in 5.2, which are interlinked and complementary, should be considered by an organization to transition towards a circular economy.“ — alle sechs ankreuzen, die beruecksichtigt wurden',
      note: `${norm(SENTENCE_5_3_2)} — Das Einzelfeld selected_principle (eine Auswahl von sechs) und das Hand-Boolean all_principles_considered (CR-013, Pflichtfeld) bleiben (iso59004-D-9); ein Vollstaendigkeits-Code ueber diese Liste ist NICHT materialisierbar — contains() erreicht den Motor nicht (iso59004-F-1).`,
      groups: [{ label: '§5.2.1 – §5.2.6', options: [...PRINCIPLE_TOKENS] }],
    },
    enum_values: PRINCIPLE_TOKENS.map((t, i) => ({ value: t, label_de: PRINCIPLE_LABELS[t], order_index: i + 1 })),
    verification_quote: `${norm(Q.L1588_1589)} — ${norm(SENTENCE_5_3_2)} — PDF pp.22–23 (gedruckte S. 15–16), §5.1 / §5.3.2`,
    create: { section_code: 'C', label_de: 'Beruecksichtigte Grundsaetze (§5.2.1 – §5.2.6, Mehrfachauswahl)', data_type: 'json', unit: null, clause_reference: '§5.1, §5.2, §5.3.2',
      description: 'Plan 3: Mehrfachauswahl ueber die sechs gedruckten Grundsaetze (Token = prod selected_principle = Zeilenschluessel der Tabelle S5_2); das Einzelfeld selected_principle und das Pflicht-Boolean all_principles_considered bleiben (iso59004-D-9). all_principles_considered_code ist ZURUECKGEHALTEN (iso59004-F-1 — contains() ueber einen json-Traeger hat keinen Motorpfad).' },
  }),

  // ---- ISO-59004-05: the actions register (§6.1 / §6.7) ----
  WS05({
    symbol: 'actions', widget: 'register',
    ui_config: {
      title: 'Massnahmen der Kreislaufwirtschaft (§6.7, Tabelle 1)',
      subtitle: 'Je Massnahme eine Zeile: R-Strategie, Kategorie nach §6.2 – §6.6, Machbarkeitsdimensionen (§7.4.5), Pilot (§7.4.7), Lebenszyklus-Notiz (§6.7) und Wertschoepfungsmodell (§7.4.4)',
      add_label: '+ Massnahme', placement: 'section',
      columns: [
        { key: 'action', label: 'R-Strategie (Tabelle 1)', type: 'enum', required: true, discriminator: true, options: [...ACTION_TOKENS], option_labels: ACTION_LABELS, aria_label: 'Gewaehlte Massnahme nach Tabelle 1 (refuse … re-mine)' },
        { key: 'category', label: 'Kategorie (§6.2 – §6.6)', type: 'enum', options: [...CATEGORY_TOKENS], option_labels: CATEGORY_LABELS, aria_label: 'Massnahmenkategorie nach §6.2 bis §6.6' },
        { key: 'feasibility_dimensions', label: 'Machbarkeitsdimensionen (§7.4.5)', type: 'text', datalist: FEASIBILITY_TOKENS.map((t) => FEASIBILITY_LABELS[t]), aria_label: 'Gegen welche der sechs gedruckten Dimensionen die Massnahme bewertet wurde' },
        { key: 'pilot', label: 'Pilot (§7.4.7)', type: 'boolean', aria_label: 'Massnahme wird zunaechst als Pilot umgesetzt' },
        { key: 'value_creation_model', label: 'Wertschoepfungsmodell (§7.4.4)', type: 'text', aria_label: 'Zur Massnahme gehoerendes Wertschoepfungsmodell' },
        { key: 'life_cycle_note', label: 'Lebenszyklus-Notiz (§6.7)', type: 'text', aria_label: 'Begruendung der Massnahmenwahl aus der Lebenszyklusperspektive' },
        { key: 'preliminary', label: 'Vorlaeufige Massnahme', type: 'derived', expr: PRELIMINARY_EXPR, display: 'badge', value_labels: { '1': '§6.1: refuse / rethink — vorlaeufige Massnahme', '0': '' } },
      ],
      footer: ['actions_count', 'refuse_rethink_first', 'pilot_actions_count'],
      note: `${norm(Q.L2537_2540)} ${norm(Q.L2561_2563)} — iso59004-U-1: Tabelle 1 ist NICHT geseedet (keine gedruckte Kategoriespalte; die beiden gedruckten Spalten verschraenken sich in der Extraktion), daher wird „Kategorie“ vom Ingenieur gesetzt und nicht aus der Tabelle gefuellt. Die Einzelfelder selected_action / action_category / feasibility_dimension / pilot_project / value_creation_model / life_cycle_perspective_applied bleiben (iso59004-D-1 … D-6). Die Lebenszyklus-Notiz ist IMMER sichtbar (iso59004-J-3). Machbarkeitsdimensionen sind Freitext mit Vorschlagsliste — eine Mehrfachauswahl je Zeile kennt der Registervertrag nicht (iso59004-I-1).`,
    },
    verification_quote: `${norm(Q.L2537_2540)} — ${norm(Q.L1780)} — PDF pp.25, 34 (gedruckte S. 18, 27), §6.1 / §6.7`,
    create: { section_code: 'G', label_de: 'Massnahmenregister (je Massnahme: R-Strategie, Kategorie, Machbarkeit, Pilot, Wertschoepfungsmodell, Lebenszyklus-Notiz)', data_type: 'json', unit: null, clause_reference: '§6.1, §6.7, Table 1',
      description: 'Plan 3: Zeilen je Massnahme der Kreislaufwirtschaft — ersetzt die Ein-Massnahme-Einzelfelder der Arbeitsblaetter -05/-06 durch die N-Instanzen-Form. Anzahl → actions_count (ISO-59004-05-D1), refuse/rethink → refuse_rethink_first (-D2), Pilotmassnahmen → pilot_actions_count (-D3). Die Einzelfelder bleiben (iso59004-D-1 … D-6); Tabelle 1 ist nicht geseedet (iso59004-U-1).' },
  }),
  WS05({
    symbol: 'actions_count', widget: 'derived', ui_config: null,
    verification_quote: `${norm(Q.L2541_2551)} — PDF p.34 (gedruckte S. 27), §6.7`,
    create: { section_code: 'G', label_de: 'Anzahl erfasster Massnahmen', data_type: 'number', unit: null, clause_reference: '§6.7',
      description: 'Plan 3: Ausgabe der Gleichung ISO-59004-05-D1 — count_rows ueber actions.' },
  }),
  WS05({
    symbol: 'refuse_rethink_first', widget: 'derived', ui_config: null,
    verification_quote: `${norm(Q.L1780)} — PDF p.25 (gedruckte S. 18), §6.1`,
    create: { section_code: 'G', label_de: 'Massnahmen der Stufen refuse / rethink (§6.1 vorlaeufige Massnahmen)', data_type: 'number', unit: null, clause_reference: '§6.1',
      description: 'Plan 3: Ausgabe der Gleichung ISO-59004-05-D2 — Zeilen mit action refuse oder rethink („Organizations should consider refuse and rethink as preliminary actions.“); Zwilling des Hand-Booleans preliminary_action_refuse_rethink (CR-018, iso59004-D-11) — die Gate-Umstellung ist STAGED (iso59004-G-2).' },
  }),
  WS05({
    symbol: 'pilot_actions_count', widget: 'derived', ui_config: null,
    verification_quote: `${norm(Q.L3110_3117)} — PDF p.42 (gedruckte S. 35), §7.4.7`,
    create: { section_code: 'G', label_de: 'Als Pilot geplante Massnahmen (§7.4.7)', data_type: 'number', unit: null, clause_reference: '§7.4.7',
      description: 'Plan 3: Ausgabe der Gleichung ISO-59004-05-D3 — Zeilen mit pilot == true; Zwilling des Booleans pilot_project auf -06 (iso59004-D-4).' },
  }),
  WS05({
    symbol: 'life_cycle_justification', widget: 'scalar', ui_config: null, visible_when: NOT_IN_PRINTED_ORDER,
    verification_quote: `${norm(Q.L2561_2563)} — PDF p.35 (gedruckte S. 28), §6.7`,
    create: { section_code: 'G', label_de: 'Begruendung der Abweichung von reparieren → wiederaufbereiten → recyceln (§6.7)', data_type: 'text', unit: null, clause_reference: '§6.7',
      description: 'Plan 3: „However, in cases where applying this guidance does not lead to the best outcome, organizations should consider applying a life cycle perspective to determine the best action.“ — nur sichtbar, wenn repair_before_remanufacture_before_recycle ausdruecklich false ist (unbesetzt ⇒ pending ⇒ sichtbar, ausfallsicher). Die passende Gate-Umschrift von CR-028 (IF … == false THEN life_cycle_justification IS NOT NULL) ist STAGED (iso59004-G-1).' },
  }),

  // ---- ISO-59004-06: goals (§7.3.2), indicators (§7.6), the §7.1.3 multi-level pair ----
  WS06({
    symbol: 'goals', widget: 'register',
    ui_config: {
      title: 'Ziele der Kreislaufwirtschaft mit Zwischenzielen (§7.3.2)',
      subtitle: '„Intermediate targets should be established to allow for circularity assessments of progress from the reference situation towards the longer-term goals.“ — je Ziel eine Zeile',
      add_label: '+ Ziel', placement: 'section',
      columns: [
        { key: 'goal', label: 'Ziel', type: 'text', required: true, aria_label: 'Ziel der Kreislaufwirtschaft' },
        { key: 'intermediate_target', label: 'Zwischenziel', type: 'text', aria_label: 'Zwischenziel zu diesem Ziel' },
        { key: 'year', label: 'Zieljahr', type: 'number', aria_label: 'Jahr, fuer das das Zwischenziel gilt' },
        { key: 'indicator', label: 'Indikator', type: 'text', aria_label: 'Indikator, an dem der Fortschritt gemessen wird' },
      ],
      footer: ['goals_count', 'goals_with_targets'],
      note: `${norm(Q.L2937_2940)} Das Freitextfeld ce_goals (Pflichtfeld, CR-035) bleibt (iso59004-D-7). „Zwischenziel gesetzt“ zaehlt ueber IS NOT NULL: ein leerer Text zaehlt NICHT (in dieser Sitzung am Motor geprueft — der Vergleich != '' liefert manual_required, siehe iso59004-J-5).`,
    },
    verification_quote: `${norm(Q.L2937_2940)} — PDF p.40 (gedruckte S. 33), §7.3.2`,
    create: { section_code: 'D', label_de: 'Zielregister (je Ziel: Ziel, Zwischenziel, Zieljahr, Indikator)', data_type: 'json', unit: null, clause_reference: '§7.3.2',
      description: 'Plan 3: Zeilen je Ziel der Kreislaufwirtschaft mit Zwischenziel und Zieljahr („goals with an aim to create structured and lasting change“ / „Intermediate targets should be established“); Anzahl → goals_count (ISO-59004-06-D1), Ziele mit Zwischenziel → goals_with_targets (-D2). Das Freitextfeld ce_goals bleibt (iso59004-D-7).' },
  }),
  WS06({
    symbol: 'goals_count', widget: 'derived', ui_config: null,
    verification_quote: `${norm(Q.L2937_2940)} — PDF p.40 (gedruckte S. 33), §7.3.2`,
    create: { section_code: 'D', label_de: 'Anzahl erfasster Ziele', data_type: 'number', unit: null, clause_reference: '§7.3.2',
      description: 'Plan 3: Ausgabe der Gleichung ISO-59004-06-D1 — count_rows ueber goals.' },
  }),
  WS06({
    symbol: 'goals_with_targets', widget: 'derived', ui_config: null,
    verification_quote: `${norm(Q.L2937_2940)} — PDF p.40 (gedruckte S. 33), §7.3.2`,
    create: { section_code: 'D', label_de: 'Ziele mit hinterlegtem Zwischenziel (§7.3.2)', data_type: 'number', unit: null, clause_reference: '§7.3.2',
      description: 'Plan 3: Ausgabe der Gleichung ISO-59004-06-D2 — Zeilen, deren Zwischenziel gesetzt ist (IS NOT NULL; ein leerer Text zaehlt nicht — iso59004-J-5).' },
  }),
  WS06({
    symbol: 'indicators_59004', widget: 'register',
    ui_config: {
      title: 'Zirkularitaetsindikatoren mit Ausgangswert und Zielwert (§7.6)',
      subtitle: '„the organization should choose circularity indicators to assess the effectiveness and efficiency of the interventions adopted and monitor the progress“ — je Indikator eine Zeile',
      add_label: '+ Indikator', placement: 'section',
      columns: [
        { key: 'indicator', label: 'Indikator', type: 'text', required: true, aria_label: 'Bezeichnung des Zirkularitaetsindikators' },
        { key: 'baseline', label: 'Ausgangswert', type: 'number', aria_label: 'Ausgangswert des Indikators in der Referenzsituation' },
        { key: 'target', label: 'Zielwert', type: 'number', aria_label: 'Zielwert des Indikators fuer die naechste Periode' },
      ],
      footer: ['indicators_59004_count'],
      note: `${norm(Q.L3229_3234)} ${norm(Q.L3251_3254)} Das Freitextfeld selected_circularity_indicator (Pflichtfeld) bleibt (iso59004-D-8). Die MESSUNG selbst liegt bei ISO 59020 („Guidance on how to measure and assess circularity performance is provided by ISO 59020.“) — die Verknuepfung mit den Tabelle-3-Indikatoren von ISO-59020 ist Phase 6 (iso59004-X-1), daher hier Freitext und kein lookup_key.`,
    },
    verification_quote: `${norm(Q.L3229_3234)} — PDF p.43 (gedruckte S. 36), §7.6`,
    create: { section_code: 'G', label_de: 'Indikatorregister (je Indikator: Bezeichnung, Ausgangswert, Zielwert)', data_type: 'json', unit: null, clause_reference: '§7.6',
      description: 'Plan 3: Zeilen je gewaehltem Zirkularitaetsindikator mit Ausgangswert und Zielwert („can include milestones and targets for the next period“); Anzahl → indicators_59004_count (ISO-59004-06-D3). Das Freitextfeld selected_circularity_indicator bleibt (iso59004-D-8); die Bindung an ISO-59020 Tabelle 3 ist Phase 6 (iso59004-X-1).' },
  }),
  WS06({
    symbol: 'indicators_59004_count', widget: 'derived', ui_config: null,
    verification_quote: `${norm(Q.L3229_3234)} — PDF p.43 (gedruckte S. 36), §7.6`,
    create: { section_code: 'G', label_de: 'Anzahl erfasster Zirkularitaetsindikatoren', data_type: 'number', unit: null, clause_reference: '§7.6',
      description: 'Plan 3: Ausgabe der Gleichung ISO-59004-06-D3 — count_rows ueber indicators_59004.' },
  }),
  WS06({
    symbol: 'operates_across_multiple_levels', widget: 'attestation', ui_config: null,
    verification_quote: `${norm(Q.L2717_2718)} — PDF p.36 (gedruckte S. 29), §7.1.3`,
    create: { section_code: 'B', label_de: 'Organisation wirkt ueber mehr als eine Systemebene (§7.1.3)', data_type: 'boolean', unit: null, clause_reference: '§7.1.3',
      description: 'Plan 3: Treiber fuer die Beziehungen zwischen den Systemebenen („Organizations that interact or operate across more than one system level should consider the relationships and interactions within and between the other system levels to achieve a circular economy.“). Das bestehende Enum implementation_level hat KEINEN Mehrebenen-Token (vier Token: global_regional_country_local / interorganizational / organizational / product) — deshalb ein eigenes Boolean statt einer erfundenen Option (iso59004-J-6).' },
  }),
  WS06({
    symbol: 'level_relationships', widget: 'scalar', ui_config: null, visible_when: MULTI_LEVEL,
    verification_quote: `${norm(Q.L2717_2718)} — PDF p.36 (gedruckte S. 29), §7.1.3`,
    create: { section_code: 'B', label_de: 'Beziehungen und Wechselwirkungen zwischen den Systemebenen (§7.1.3)', data_type: 'text', unit: null, clause_reference: '§7.1.3',
      description: 'Plan 3: nur sichtbar, wenn operates_across_multiple_levels == true (unbesetzt ⇒ pending ⇒ sichtbar, ausfallsicher). Die passende Umschrift von CR-031 ist STAGED (iso59004-G-3).' },
  }),

  // ---- widget re-binds of EXISTING enum fields: fixed options ⇒ selection (constraint 3(b)); D-1 keeps every prod option list ----
  WS04({ symbol: 'selected_principle', widget: 'select_one', ui_config: null, enum_values: 'keep_prod',
    verification_quote: `${norm(Q.L1588_1589)} — PDF p.22 (gedruckte S. 15), §5.1` }),
  WS05({ symbol: 'selected_action', widget: 'select_one', ui_config: null, enum_values: 'keep_prod',
    verification_quote: `${norm(Q.L2541_2551)} — PDF p.34 (gedruckte S. 27), §6.7` }),
  WS05({ symbol: 'action_category', widget: 'select_one', ui_config: null, enum_values: 'keep_prod',
    verification_quote: `${norm(Q.L2537_2540)} — PDF p.34 (gedruckte S. 27), §6.7 (die fuenf Kategorien sind die Ueberschriften §6.2 – §6.6)` }),
  WS06({ symbol: 'implementation_stage', widget: 'select_one', ui_config: null, enum_values: 'keep_prod',
    verification_quote: `${norm(Q.L2731_2736)} — PDF p.37 (gedruckte S. 30), §7.1.4` }),
  WS06({ symbol: 'implementation_level', widget: 'select_one', ui_config: null, enum_values: 'keep_prod',
    verification_quote: `${norm(Q.L2702)} ${norm(Q.L2717_2718)} — PDF p.36 (gedruckte S. 29), §7.1.3 (die vollstaendige Ebenenliste L2702–L2716 traegt ein in ein Wort eingeklebtes Wasserzeichen, „ojnongovernmental“ — iso59004-U-2)` }),
  WS06({ symbol: 'feasibility_dimension', widget: 'select_one', ui_config: null, enum_values: 'keep_prod',
    verification_quote: `${norm(Q.L3044_3045)} — PDF p.41 (gedruckte S. 34), §7.4.5 (die sechs Aufzaehlungspunkte L3046–L3068 werden von pdftotext umsortiert — iso59004-U-4)` }),
];

/** No section rule is emitted: no printed sentence makes a whole -0x section conditional, and §7.1.4's NOTE refutes stage-gating (iso59004-J-4). */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];

/**
 * iso59004-J-4 — the eleven candidate `implementation_stage` hides of the brief's Step 4, NONE of them
 * emitted. `expect_refused` records what the emitter's gate-aware guard does with each (asserted in the
 * test, not claimed): eight are REFUSED because a same-worksheet gate reads the symbol, three would be
 * ACCEPTED and are withheld on the printed §7.1.4 NOTE alone ("The sequence of stages can differ and can
 * also occur at the same time or in parallel.", `Q.L2736`).
 */
export const WITHHELD_STAGE_RULES: Array<{ worksheet: string; symbol: string; visible_when: string; gate: string | null; expect_refused: boolean }> = [
  { worksheet: 'ISO-59004-06', symbol: 'reference_situation_assessed', visible_when: "implementation_stage == 'context_reference_assessment'", gate: 'CR-032', expect_refused: true },
  { worksheet: 'ISO-59004-06', symbol: 'baseline_circularity_assessment', visible_when: "implementation_stage == 'context_reference_assessment'", gate: 'CR-032', expect_refused: true },
  { worksheet: 'ISO-59004-06', symbol: 'ce_purpose_mission_vision', visible_when: "implementation_stage == 'purpose_mission_vision_goals'", gate: 'CR-034', expect_refused: true },
  { worksheet: 'ISO-59004-06', symbol: 'ce_goals', visible_when: "implementation_stage == 'purpose_mission_vision_goals'", gate: 'CR-035', expect_refused: true },
  { worksheet: 'ISO-59004-06', symbol: 'ce_strategy', visible_when: "implementation_stage == 'strategic_priorities_action_plan'", gate: 'CR-036', expect_refused: true },
  { worksheet: 'ISO-59004-06', symbol: 'ce_action_plan', visible_when: "implementation_stage == 'strategic_priorities_action_plan'", gate: 'CR-039', expect_refused: true },
  { worksheet: 'ISO-59004-06', symbol: 'value_creation_model', visible_when: "implementation_stage == 'strategic_priorities_action_plan'", gate: 'CR-037', expect_refused: true },
  { worksheet: 'ISO-59004-06', symbol: 'monitoring_review_process', visible_when: "implementation_stage == 'monitoring_reviewing_reporting'", gate: 'CR-042', expect_refused: true },
  { worksheet: 'ISO-59004-06', symbol: 'feasibility_dimension', visible_when: "implementation_stage == 'strategic_priorities_action_plan'", gate: null, expect_refused: false },
  { worksheet: 'ISO-59004-06', symbol: 'pilot_project', visible_when: "implementation_stage == 'strategic_priorities_action_plan'", gate: null, expect_refused: false },
  { worksheet: 'ISO-59004-06', symbol: 'selected_circularity_indicator', visible_when: "implementation_stage == 'monitoring_reviewing_reporting'", gate: null, expect_refused: false },
];

/**
 * iso59004-J-3 — the brief's per-row rule for `life_cycle_note`, recorded verbatim and NOT used. The token
 * `recover` does not exist in prod (`ACTION_TOKENS` has `recover_energy`), and §6.7's first sentence makes
 * the life-cycle perspective apply to every action. The sign-off proposes `ALTERNATIVE` instead.
 */
export const WITHHELD_LIFE_CYCLE_NOTE_RULE = 'action IN {recycle, recover, re_mine}';
export const WITHHELD_LIFE_CYCLE_NOTE_ALTERNATIVE = "action IN {'repair', 'remanufacture', 'recycle'}";

/**
 * iso59004-F-1 — the withheld ISO-59004-04-D1. Recorded EXACTLY as the brief writes it so a ratified
 * engine change can emit it mechanically. It is blocked TWICE over, both probed in this session:
 *
 *  1. It does not even PARSE. `AND` combines COMPARISONS, not calls — `parseNumeric` on this right-hand
 *     side returns `{ok:false, message:'Ausdruck erwartet.'}` while a SINGLE `contains(...)` inside
 *     `if()` parses fine. This is a new corpus finding (din14021-F-1 and iso14046-F-2 recorded only the
 *     missing carrier path); it is recorded as an I-block for the final [CODE] wave.
 *  2. Even the nested-`if` rewrite that DOES parse (`WITHHELD_04_D1_NESTED_FORM`) cannot evaluate:
 *     `contains()` over a json `select_many` carrier has no engine path — no production
 *     `evaluateFormula` caller passes `carriers`, so the probe returns
 *     `manual_required: Unbekanntes Symbol "principles" im Ausdruck.`
 *
 * The prod hand boolean `all_principles_considered` (is_required, gate CR-013) is untouched and keeps
 * enforcing; the checklist is additive beside it.
 */
export const WITHHELD_04_D1_FORMULA =
  'all_principles_considered_code = if(' + PRINCIPLE_TOKENS.map((t) => `contains(principles, '${t}')`).join(' AND ') + ', 1, 0)';
/** The nested-`if` rewrite of the same rule — it PARSES, and is still unevaluable for want of `carriers`. */
export const WITHHELD_04_D1_NESTED_FORM =
  'all_principles_considered_code = ' + PRINCIPLE_TOKENS.reduceRight<string>((acc, t) => `if(contains(principles, '${t}'), ${acc}, 0)`, '1');

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
