/**
 * Config-driven selection widgets for guideline fields whose options/structure
 * the guideline prescribes. Each entry maps a field symbol to either a
 * multi-select CHECKLIST (fixed guideline option list) or a structured REGISTER
 * (repeatable rows with guideline-defined columns). Options/columns are
 * guideline-grounded; a field is only listed here when the standard's own page
 * supplies the structure (SR-1). External law that the guideline merely
 * references (e.g. the §124 GWB statutory grounds) is NOT expanded into a
 * fabricated option list — such a field is a register the engineer fills in,
 * with the reference noted (content-boundary rule).
 *
 * This registry is corpus-wide by design; DWA-M 820-1 is the first standard
 * populated. See [[STRUCTURED-REGISTER-STANDARDIZATION]].
 */

import { parseFieldConfig, type RegisterUiConfig, type SelectManyUiConfig } from './field-config';

export type ColumnType = 'text' | 'number' | 'boolean' | 'enum';
export type ColumnDef = {
  key: string;
  label: string;
  type: ColumnType;
  /** enum options (type='enum'). */
  options?: readonly string[];
  /** free-text suggestions (type='text'), rendered as a <datalist>. */
  datalist?: readonly string[];
  placeholder?: string;
  /** optional tailwind width class for the column. */
  width?: string;
};

export type RegisterConfig = {
  kind: 'register';
  title: string;
  subtitle: string;
  addLabel: string;
  columns: readonly ColumnDef[];
  note?: string;
  /** Optional: sum a numeric column in the footer (derived total, e.g. volume). */
  sumColumn?: { key: string; label: string; unit?: string };
};
export type OptionGroup = { label: string; options: readonly string[] };
export type ChecklistConfig = {
  kind: 'checklist';
  title: string;
  subtitle: string;
  /** Flat option list, OR use `groups` for a sectioned checklist. When groups
   * are given, `options` is the flattened union (kept for validation/tests). */
  options: readonly string[];
  groups?: readonly OptionGroup[];
  note?: string;
  allowCustom?: boolean;
};
export type SelectionConfig = RegisterConfig | ChecklistConfig;

/* ── Guideline-grounded option lists ──────────────────────────────────────── */

// Anh. B / §7.1–7.4 — the vergaberecht the guideline's Anhang B is structured
// around, grouped by threshold (B.1 Ober-/Unterschwellenbereich) + Honorar/Vertrag.
const LEGAL_GROUPS: readonly OptionGroup[] = [
  {
    label: 'EU-Oberschwellenbereich (§7, Anh. B.2)',
    options: [
      'AEUV (Vertrag über die Arbeitsweise der EU)',
      'VRL (EU-Vergaberichtlinie 2014/24/EU)',
      'GWB (Gesetz gegen Wettbewerbsbeschränkungen, §§ 97 ff.)',
      'VgV (Vergabeverordnung)',
    ],
  },
  {
    label: 'Unterschwellenbereich (§7, Anh. B.3)',
    options: [
      'UVgO (Unterschwellenvergabeordnung)',
      'VOL/A Abschnitt 1',
      'BHO / LHO (Bundes-/Landeshaushaltsordnung)',
      'GemO / GemHO (Gemeinde-/Gemeindehaushaltsordnung)',
      'Landesvergabegesetze',
    ],
  },
  {
    label: 'Honorar- und Vertragsrecht (§7)',
    options: [
      'HOAI (Honorarordnung für Architekten und Ingenieure)',
      'BGB (Werkvertragsrecht, §§ 631 ff.)',
    ],
  },
];
const LEGAL_BASES = LEGAL_GROUPS.flatMap((g) => g.options);

// Anh. E.2.2–E.2.8 — printed Zuschlagskriterien.
const AWARD_CRITERIA = [
  'Schlüsselpersonal',
  'Örtliche Bauüberwachung',
  'Organisation der Aufgabenverteilung beim Bieter',
  'Darstellung der Projektorganisation',
  'Analyse der Aufgabenstellung durch den Bieter',
  'Darstellung der Dokumentation des konkreten Projekts',
  'Preis',
] as const;

// §5 / Bild 5 — the parties named in the guideline.
const STAKEHOLDER_TYPES = [
  'Auftraggeber', 'Auftragnehmer', 'ausführende Firmen', 'Behörden', 'Öffentlichkeit',
] as const;

// DIN-276 — Kostengruppen (KG 100–800), §3 / cost-group tables.
const DIN276_COST_GROUPS = [
  'KG 100 – Grundstück',
  'KG 200 – Vorbereitende Maßnahmen',
  'KG 300 – Bauwerk – Baukonstruktionen',
  'KG 400 – Bauwerk – Technische Anlagen',
  'KG 500 – Außenanlagen und Freiflächen',
  'KG 600 – Ausstattung und Kunstwerke',
  'KG 700 – Baunebenkosten',
  'KG 800 – Finanzierung',
] as const;
// DIN-276 — Stufen der Kostenermittlung (§3.3 / §4.3).
const DIN276_COST_STAGES = [
  'Kostenrahmen', 'Kostenschätzung', 'Kostenberechnung', 'Kostenanschlag', 'Kostenfeststellung',
] as const;
// DIN-276 — besondere Kostenarten (§4.2.10–4.2.14).
const DIN276_SPECIAL_COSTS = [
  'Vorhandene Bausubstanz (§4.2.10)',
  'Beigestellte Leistungen (§4.2.11)',
  'Besondere Kosten (§4.2.12)',
  'Prognostizierte Kosten (§4.2.13)',
  'Risikobehaftete Kosten (§4.2.14)',
] as const;
// DWA-M 277E — Grauwasserquellen (§5, Table 2: Shower/Bathtub/Hand washbasin/Washing machine/Kitchen sink/Dishwasher).
const GREYWATER_SOURCES = [
  'Dusche', 'Badewanne', 'Handwaschbecken', 'Waschmaschine', 'Küchenspüle', 'Geschirrspüler',
] as const;

// DWA-M 820-2 §1 — HOAI Leistungsphasen the guideline (Teil 2) is built around (LPH 0–9).
const HOAI_PHASES = [
  'LPH 0 – Bedarfsplanung',
  'LPH 1 – Grundlagenermittlung',
  'LPH 2 – Vorplanung',
  'LPH 3 – Entwurfsplanung',
  'LPH 4 – Genehmigungsplanung',
  'LPH 5 – Ausführungsplanung',
  'LPH 6 – Vorbereitung der Vergabe',
  'LPH 7 – Mitwirkung bei der Vergabe',
  'LPH 8 – Objektüberwachung (Bauüberwachung)',
  'LPH 9 – Objektbetreuung',
] as const;

export const SELECTION_CONFIGS: Record<string, SelectionConfig> = {
  // ── M820-08 · Rechtsrahmen — checklist of applicable legal bases (Anh. B) ──
  applicable_legal_bases: {
    kind: 'checklist',
    title: 'Anwendbare Rechtsgrundlagen',
    subtitle: '§7.1–7.4 · Anhang B — zutreffende Rechtsgrundlagen auswählen',
    options: LEGAL_BASES,
    groups: LEGAL_GROUPS,
    allowCustom: true,
    note: 'Maßgeblich ist, ob der EU-Schwellenwert erreicht wird: Oberschwellenbereich (AEUV/VRL/GWB/VgV) '
      + 'vs. Unterschwellenbereich (UVgO/VOL-A/BHO-LHO/GemO/Landesvergabegesetze). HOAI/BGB gelten unabhängig davon.',
  },

  // ── M820-12 · Ausschlusskriterien — §124 GWB declared-grounds register ──
  // §124 GWB grounds are NOT printed in the guideline (external law) → the
  // engineer enters the grounds the Auftraggeber has selected; the guideline's
  // duty is to make them known in advance (transparency).
  exclusion_124_gwb_selected: {
    kind: 'register',
    title: 'Fakultative Ausschlussgründe (§124 GWB)',
    subtitle: 'Anh. E.1.2 — vom Auftraggeber gewählte §124-GWB-Gründe (vorab bekannt zu machen)',
    addLabel: '+ Ausschlussgrund',
    note: 'Die konkreten Gründe des § 124 GWB stehen im Gesetz (extern, nicht im Merkblatt abgedruckt). '
      + 'Gewählte Gründe sind aus Transparenzgründen vorab bekannt zu machen.',
    columns: [
      { key: 'grund', label: 'Ausschlussgrund (§124 GWB)', type: 'text', placeholder: 'gewählten §124-GWB-Grund benennen' },
      { key: 'vorab_bekanntgemacht', label: 'Vorab bekannt gemacht', type: 'boolean' },
    ],
  },

  // ── M820-14 · Zuschlagskriterien — register (E.2 criteria + weight) ──
  award_criteria_list: {
    kind: 'register',
    title: 'Zuschlagskriterien',
    subtitle: 'Anhang E.2 — Kriterien mit Gewichtung',
    addLabel: '+ Zuschlagskriterium',
    columns: [
      { key: 'kriterium', label: 'Kriterium', type: 'enum', options: AWARD_CRITERIA },
      { key: 'gewichtung', label: 'Gewichtung (%)', type: 'number', width: 'w-28' },
      { key: 'anmerkung', label: 'Anmerkung', type: 'text' },
    ],
    note: 'Preis und mind. ein qualitatives Kriterium; Summe der Gewichtungen = 100 %.',
  },

  // ── M820-03 · Beteiligten-Matrix — stakeholder register (§5 / Bild 5) ──
  stakeholder_list: {
    kind: 'register',
    title: 'Beteiligten-Matrix',
    subtitle: '§5.1–5.6 · Bild 5 — je Beteiligtem eine Zeile (Rolle, Verantwortung, Kommunikation)',
    addLabel: '+ Beteiligter',
    columns: [
      { key: 'beteiligter', label: 'Beteiligter', type: 'text', datalist: STAKEHOLDER_TYPES, placeholder: 'z. B. Auftraggeber' },
      { key: 'rolle', label: 'Rolle / Funktion', type: 'text' },
      { key: 'verantwortung', label: 'Verantwortung', type: 'text' },
      { key: 'kommunikation', label: 'Kommunikationsweg', type: 'text' },
    ],
  },

  // ── M820-04 · Bedarfsplanung Konzept — alternatives + quality targets ──
  alternatives_considered: {
    kind: 'register',
    title: 'Geprüfte Alternativen',
    subtitle: '§4.1 · §6.3 — grundlegend verschiedene Lösungsansätze',
    addLabel: '+ Alternative',
    columns: [
      { key: 'alternative', label: 'Alternative', type: 'text' },
      { key: 'beschreibung', label: 'Beschreibung', type: 'text' },
      { key: 'bewertung', label: 'Bewertung / Ergebnis', type: 'text' },
    ],
  },
  quality_targets_konzept: {
    kind: 'register',
    title: 'Qualitätsziele Konzept',
    subtitle: 'Bild 2 — Ziel und Anforderung',
    addLabel: '+ Qualitätsziel',
    columns: [
      { key: 'ziel', label: 'Qualitätsziel', type: 'text' },
      { key: 'anforderung', label: 'Anforderung / Kriterium', type: 'text' },
    ],
  },

  // ── M820-05 · Bedarfsplanung Projekt — quality targets (Bild 3) ──
  quality_targets_projekt: {
    kind: 'register',
    title: 'Qualitätsziele Projekt',
    subtitle: 'Bild 3 — Ziel und Anforderung',
    addLabel: '+ Qualitätsziel',
    columns: [
      { key: 'ziel', label: 'Qualitätsziel', type: 'text' },
      { key: 'anforderung', label: 'Anforderung / Kriterium', type: 'text' },
    ],
  },

  // ── M820-16 · Bewertungskommission — member register (§8.4) ──
  bewertungskommission_members: {
    kind: 'register',
    title: 'Bewertungskommission',
    subtitle: '§8.4 — überwiegend fachkundig, ungerade Mitgliederzahl, gleiches Stimmrecht',
    addLabel: '+ Mitglied',
    columns: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'funktion', label: 'Funktion / Rolle', type: 'text' },
      { key: 'sachverstand', label: 'Sachverstand', type: 'text' },
      { key: 'stimmberechtigt', label: 'Stimmberechtigt', type: 'boolean' },
    ],
  },

  /* ═══ DWA-M 820-2 (Teil 2 · Leistungserbringung) ═══════════════════════════ */

  // §1 — HOAI Leistungsphasen the project scope covers (LPH 0 … 9).
  included_hoai_phases: {
    kind: 'checklist',
    title: 'Beauftragte Leistungsphasen (HOAI)',
    subtitle: '§1 — von der Bedarfsplanung (LPH 0) bis zur Objektbetreuung (LPH 9)',
    options: HOAI_PHASES,
    note: 'Teil 2 umfasst die Leistungserbringung über alle Phasen (LPH 0–9), inkl. Inbetriebnahme und Übergabe.',
  },
  // DWA-M 820-3 · §1 — Leistungsphasen covered (LPH 0–9 per HOAI/AHO).
  applicable_lph: {
    kind: 'checklist',
    title: 'Beauftragte Leistungsphasen (LPH)',
    subtitle: '§1 — LPH 0–9 (HOAI/AHO)',
    options: HOAI_PHASES,
  },
  // §5.3/§5.4 — which LPH are completed (same phase list).
  lph_completed: {
    kind: 'checklist',
    title: 'Abgeschlossene Leistungsphasen',
    subtitle: '§5.3 · §5.4 — je LPH Freigabe nach Abschluss',
    options: HOAI_PHASES,
  },
  // §4.1 — Projektsteuerung / Handlungsbereiche des Projektmanagements (§4.3–4.7).
  projektsteuerung_scope: {
    kind: 'checklist',
    title: 'Projektsteuerung / Handlungsbereiche',
    subtitle: '§4.1 · §4.3–4.7 — Bereiche des Projektmanagements',
    options: [
      'Projektorganisation', 'Terminmanagement', 'Kostenmanagement',
      'Vertragsmanagement', 'Qualitätsmanagement', 'Risikomanagement',
    ],
    allowCustom: true,
  },
  // §2.1 · DIN 18205 Tab. A.2 — project goals by category.
  project_goals: {
    kind: 'register',
    title: 'Projektziele',
    subtitle: '§2.1 · DIN 18205 Tab. A.2 — Ziel nach Kategorie',
    addLabel: '+ Projektziel',
    columns: [
      { key: 'kategorie', label: 'Kategorie', type: 'enum', options: [
        'funktional / technisch', 'soziokulturell / gestalterisch',
        'wirtschaftlich / terminlich', 'ökologisch',
      ] },
      { key: 'ziel', label: 'Ziel', type: 'text' },
      { key: 'anforderung', label: 'Anforderung / Messgröße', type: 'text' },
    ],
  },
  // §3 · Bild 1 — stakeholders (same shape as 820-1 stakeholder_list).
  stakeholders_list: {
    kind: 'register',
    title: 'Beteiligte und Betroffene',
    subtitle: '§3 · Bild 1 — je Beteiligtem eine Zeile',
    addLabel: '+ Beteiligter',
    columns: [
      { key: 'beteiligter', label: 'Beteiligter', type: 'text', datalist: STAKEHOLDER_TYPES },
      { key: 'rolle', label: 'Rolle / Funktion', type: 'text' },
      { key: 'verantwortung', label: 'Verantwortung', type: 'text' },
      { key: 'kommunikation', label: 'Kommunikationsweg', type: 'text' },
    ],
  },
  // §6.2 — inventory of applicable DIN standards (open list).
  applicable_din_standards: {
    kind: 'register',
    title: 'Geltende DIN-Normen',
    subtitle: '§6.2 — DIN / DIN EN / DIN ISO im Geltungsbereich',
    addLabel: '+ DIN-Norm',
    columns: [
      { key: 'norm', label: 'Norm', type: 'text', placeholder: 'z. B. DIN EN 752' },
      { key: 'titel', label: 'Titel', type: 'text' },
      { key: 'geltungsbereich', label: 'Geltungsbereich / Bezug', type: 'text' },
    ],
  },
  // §6.2 — inventory of applicable DWA/ATV regulations (open list).
  applicable_dwa_standards: {
    kind: 'register',
    title: 'Geltende DWA-Regelwerke',
    subtitle: '§6.2 — DWA-A / DWA-M / ATV im Geltungsbereich',
    addLabel: '+ DWA-Regelwerk',
    columns: [
      { key: 'regelwerk', label: 'Regelwerk', type: 'text', placeholder: 'z. B. DWA-A 138-1' },
      { key: 'titel', label: 'Titel', type: 'text' },
      { key: 'geltungsbereich', label: 'Geltungsbereich / Bezug', type: 'text' },
    ],
  },
  // §6.1/§6.2 — client's own guidelines.
  client_guidelines: {
    kind: 'register',
    title: 'Auftraggeber-Richtlinien',
    subtitle: '§6.1 · §6.2 — eigene Vorgaben, Bau-/Betriebsstandards des Auftraggebers',
    addLabel: '+ Richtlinie',
    columns: [
      { key: 'richtlinie', label: 'Richtlinie / Vorgabe', type: 'text' },
      { key: 'beschreibung', label: 'Beschreibung', type: 'text' },
    ],
  },
  // §5.4.1 — permit inventory.
  permit_inventory_complete: {
    kind: 'register',
    title: 'Genehmigungsinventur',
    subtitle: '§5.4.1 — erforderliche Genehmigungen und Status',
    addLabel: '+ Genehmigung',
    columns: [
      { key: 'genehmigung', label: 'Genehmigung', type: 'text' },
      { key: 'rechtsbereich', label: 'Rechtsbereich', type: 'enum', options: [
        'Wasserrecht', 'Baurecht', 'Umweltrecht', 'Naturschutzrecht', 'Sonstige',
      ] },
      { key: 'status', label: 'Status', type: 'text' },
    ],
  },
  // §8.2.1 — software products.
  software_products_defined: {
    kind: 'register',
    title: 'Eingesetzte Software',
    subtitle: '§8.2.1 — Software-Produkte im Projekt',
    addLabel: '+ Software',
    columns: [
      { key: 'software', label: 'Software / Produkt', type: 'text' },
      { key: 'einsatzzweck', label: 'Einsatzzweck', type: 'text' },
    ],
  },
  // §5.6.4/§5.6.5 — Änderungsmanagement: register of construction changes /
  // Nachträge (there can be many). Count + volume derived, not hand-entered.
  change_orders: {
    kind: 'register',
    title: 'Bauänderungen / Nachträge',
    subtitle: '§5.6.4 · §5.6.5 — je Änderung eine Zeile; Anzahl und Volumen abgeleitet',
    addLabel: '+ Bauänderung / Nachtrag',
    columns: [
      { key: 'aenderung', label: 'Bauänderung / Nachtrag', type: 'text' },
      { key: 'datum', label: 'Datum', type: 'text', placeholder: 'TT.MM.JJJJ', width: 'w-28' },
      { key: 'kosten_eur', label: 'Kostenwirkung (€)', type: 'number', width: 'w-32' },
      { key: 'terminwirkung', label: 'Terminwirkung', type: 'text' },
      { key: 'entscheidung', label: 'Entscheidung / Begründung', type: 'text' },
      { key: 'status', label: 'Status', type: 'enum', options: ['offen', 'genehmigt', 'abgelehnt', 'umgesetzt'] },
    ],
    sumColumn: { key: 'kosten_eur', label: 'Volumen', unit: '€' },
    note: 'Aktives Änderungsmanagement (§5.6): Auswirkungen auf Termine, Kosten und Qualitäten je Änderung dokumentieren.',
  },

  // §8.8 — data-security (TOM) measures.
  data_security_measures: {
    kind: 'register',
    title: 'Datensicherheits-Maßnahmen (TOM)',
    subtitle: '§8.8 — technische und organisatorische Maßnahmen (DSGVO/BSI)',
    addLabel: '+ Maßnahme',
    columns: [
      { key: 'art', label: 'Art', type: 'enum', options: ['technisch', 'organisatorisch'] },
      { key: 'massnahme', label: 'Maßnahme', type: 'text' },
    ],
  },

  /* ═══ DIN 276 (Kosten im Bauwesen) ═════════════════════════════════════════ */

  applicable_cost_groups: {
    kind: 'checklist',
    title: 'Anwendbare Kostengruppen',
    subtitle: '§5 — Kostengruppen KG 100–800',
    options: DIN276_COST_GROUPS,
  },
  planning_stage_active: {
    kind: 'checklist',
    title: 'Aktive Kostenermittlungsstufe(n)',
    subtitle: '§4.3 — Stufen der Kostenermittlung',
    options: DIN276_COST_STAGES,
  },
  special_cost_flags: {
    kind: 'checklist',
    title: 'Sonderkosten / besondere Kostenarten',
    subtitle: '§4.2.10–4.2.14',
    options: DIN276_SPECIAL_COSTS,
  },
  input_documents_register: {
    kind: 'register',
    title: 'Eingangsdokumenten-Register',
    subtitle: '§4.2.5 — kostenrelevante Eingangsunterlagen',
    addLabel: '+ Dokument',
    columns: [
      { key: 'dokument', label: 'Dokument / Unterlage', type: 'text' },
      { key: 'stand', label: 'Stand / Datum', type: 'text' },
      { key: 'bemerkung', label: 'Bemerkung', type: 'text' },
    ],
  },

  /* ═══ DWA-M 277E (Grauwasser) ══════════════════════════════════════════════ */

  source_set: {
    kind: 'checklist',
    title: 'Angeschlossene Grauwasserquellen',
    subtitle: '§5 · Tabelle 2 — Herkunftsbereiche des Grauwassers',
    options: GREYWATER_SOURCES,
    allowCustom: true,
    note: 'Typ A (gering belastet): Dusche/Badewanne/Handwaschbecken. Typ B (höher belastet): zusätzlich Waschmaschine und/oder Küche.',
  },

  /* ═══ DWA-M 1200-3 (Bewässerung mit aufbereitetem Wasser) ══════════════════ */

  // §4.2 · Tab. 2 — irrigation diary, one row per irrigation event (per Schlag).
  bewaesserungstagebuch: {
    kind: 'register',
    title: 'Bewässerungstagebuch',
    subtitle: '§4.2 · Tab. 2 — je Bewässerungsgabe eine Zeile (schlagbezogen)',
    addLabel: '+ Bewässerungsgabe',
    columns: [
      { key: 'start', label: 'Start', type: 'text', placeholder: 'TT.MM.JJJJ hh:mm' },
      { key: 'ende', label: 'Ende', type: 'text', placeholder: 'TT.MM.JJJJ hh:mm' },
      { key: 'empfehlung_mm', label: 'Empfehlung (mm)', type: 'number', width: 'w-24' },
      { key: 'real_mm', label: 'reale Gabe (mm)', type: 'number', width: 'w-24' },
      { key: 'flaeche_ha', label: 'Fläche (ha)', type: 'number', width: 'w-24' },
      { key: 'wasser_m3', label: 'Wasser total (m³)', type: 'number', width: 'w-28' },
      { key: 'aufbereitet_m3', label: 'davon aufbereitet (m³)', type: 'number', width: 'w-28' },
      { key: 'kommentar', label: 'Kommentar', type: 'text' },
    ],
  },

  /* ═══ DWA-A 138-1 (Versickerung — Blumen Forschel V1.5) ════════════════════ */

  // A138-15 · §6 — candidate infiltration facility types (the guideline's own
  // Versickerungsanlagen, per its Bemessung worksheets A138-16…22).
  a138_anlagentyp_kandidaten: {
    kind: 'checklist',
    title: 'Anlagentyp-Kandidaten (Versickerungsanlagen)',
    subtitle: '§6 — in Betracht kommende Versickerungsanlagen',
    options: [
      'Flächenversickerung',
      'Muldenversickerung',
      'Rigolen-/Rohrversickerung',
      'Mulden-Rigolen-Element',
      'Mulden-Rigolen-System',
      'Schacht-/Rohrversickerung',
      'Beckenversickerung',
    ],
    note: 'Oberirdische Versickerungsanlagen sind unterirdischen vorzuziehen (§ Grundsätze). '
      + 'Die gewählten Kandidaten werden in den jeweiligen Bemessungs-Arbeitsblättern (A138-16…22) bemessen.',
  },

  /* ═══ DWA-M 816 (Wirtschaftlichkeitsvergleich / Kapitalwertmethode) ════════ */

  // M816-02 · §3.2/§5.x.3 — the investment alternatives being compared (≥2).
  // `alternative_count` (REQ-04 ≥2) and `partial_replication_flag` (M816-19 gate)
  // stay as project-level fields; this register lists the alternatives.
  alternatives: {
    kind: 'register',
    title: 'Investitionsalternativen',
    subtitle: '§3.2 · §5.x.3 — zu vergleichende Alternativen (mind. 2)',
    addLabel: '+ Alternative',
    columns: [
      { key: 'kennung', label: 'Kennung', type: 'text', placeholder: 'z. B. A1', width: 'w-24' },
      { key: 'bezeichnung', label: 'Bezeichnung / Beschreibung', type: 'text' },
    ],
    note: 'Ein Wirtschaftlichkeitsvergleich erfordert mindestens zwei Alternativen (§4.4.1, Gate REQ-04). '
      + '„Anzahl Alternativen" prüft die Anzahl gegen diese Liste.',
  },
  // M816-05 · §6.4 Komponentenansatz — AHK + Nutzungsdauer per component (cost-as-list).
  component_costs: {
    kind: 'register',
    title: 'Investitionskosten je Komponente',
    subtitle: '§6.4 Komponentenansatz — AHK und Nutzungsdauer je Komponente',
    addLabel: '+ Komponente',
    columns: [
      { key: 'komponente', label: 'Komponente', type: 'text' },
      { key: 'ahk_eur', label: 'AHK (€)', type: 'number', width: 'w-32' },
      { key: 'nutzungsdauer_jahre', label: 'Nutzungsdauer (a)', type: 'number', width: 'w-28' },
    ],
    sumColumn: { key: 'ahk_eur', label: 'Gesamt-AHK', unit: '€' },
    note: 'AHK = Anschaffungs-/Herstellungskosten. Gesamt-AHK wird aus den Komponenten summiert.',
  },

  /* ═══ DWA-A 272E (New sanitation systems) ═════════════════════════════════ */
  // A272E-14 · §9.1(5) — developed alternative solution variants (variable list).
  // `variants_developed` (bare count, unconsumed) is subsumed; recommended_alternative
  // / recommended_total_score / sensitivity_result stay (they reference the chosen one).
  variants: {
    kind: 'register',
    title: 'Entwickelte Lösungsvarianten',
    subtitle: '§9.1(5) — alternative Lösungen mit Bewertung',
    addLabel: '+ Variante',
    columns: [
      { key: 'kennung', label: 'Variante', type: 'text', width: 'w-24', placeholder: 'z. B. V1' },
      { key: 'beschreibung', label: 'Beschreibung', type: 'text' },
      { key: 'gesamtbewertung', label: 'Gesamtbewertung', type: 'number', width: 'w-32' },
    ],
  },

  // §7.2 · Table 6 · main objective 4 (social) — verbatim sub-criteria.
  criteria_social: {
    kind: 'checklist',
    title: 'Bewertungskriterien — Soziales',
    subtitle: '§7.2 · Table 6 (Hauptziel 4: Soziales)',
    options: ['Akzeptanz', 'Qualifizierte Arbeitsplätze', 'Umweltbewusstsein'],
    allowCustom: true,
  },

  /* ═══ DWA-M 1200-1 (Wasserwiederverwendung) ═══════════════════════════════ */
  // Tab. 19 (in Anlehnung an RL (EU) 2024/3019) — indicator chemicals monitored
  // for the proof of advanced trace-substance removal. Printed in full in Tab. 19.
  indikatorchemikalien_kat1: {
    kind: 'checklist',
    title: 'Indikatorchemikalien — Kategorie 1 (einfach entfernbar)',
    subtitle: 'Tab. 19 · RL (EU) 2024/3019',
    options: [
      'Amisulprid', 'Carbamazepin', 'Citalopram', 'Clarithromycin', 'Diclofenac',
      'Hydrochlorothiazid', 'Metoprolol', 'Venlafaxin', 'Valsartansäure',
    ],
  },
  indikatorchemikalien_kat2: {
    kind: 'checklist',
    title: 'Indikatorchemikalien — Kategorie 2 (moderat entfernbar)',
    subtitle: 'Tab. 19 · RL (EU) 2024/3019',
    options: [
      'Benzotriazol', '4- und 5-Methylbenzotriazol', 'Gabapentin', 'Candesartan', 'Irbesartan',
    ],
    note: 'Gabapentin gemäß Tab. 19 wegen höherer Relevanz für die Wasserwiederverwendung ergänzt. Kategorie 3 (Vorsorgescreening): Summe PFAS-20 < 100 ng/l.',
  },

  /* ═══ FLL-Naturteich (source PDF not in library — options NOT seeded) ══════ */
  // The FLL-Naturteich guideline is not currently in the source library, so the
  // element/zone option lists are NOT pre-filled (never invented — content
  // boundary). Free-text registers with the printed column structure only.
  equipment_elements_list: {
    kind: 'register',
    title: 'Anlagenausstattung',
    subtitle: '§8.3 — Ausstattungselemente',
    addLabel: '+ Element',
    note: 'Quelle FLL-Naturteich derzeit nicht in der Bibliothek — Auswahllisten nicht vorbelegt (nicht erfunden). Freitext.',
    columns: [
      { key: 'element', label: 'Element', type: 'text', placeholder: 'z. B. Skimmer, Pumpe, UV, Steuerung' },
      { key: 'typ', label: 'Typ / Hersteller', type: 'text' },
      { key: 'bemerkung', label: 'Bemerkung', type: 'text' },
    ],
  },
  plant_species_list: {
    kind: 'register',
    title: 'Pflanzenliste',
    subtitle: '§10.4 — Pflanzenarten nach Zone / Beckentyp',
    addLabel: '+ Pflanzenart',
    note: 'Quelle FLL-Naturteich derzeit nicht in der Bibliothek — Zonen-/Artenlisten nicht vorbelegt (nicht erfunden). Freitext.',
    columns: [
      { key: 'art', label: 'Pflanzenart', type: 'text' },
      { key: 'zone', label: 'Zone / Beckentyp', type: 'text' },
      { key: 'anzahl', label: 'Anzahl / Bemerkung', type: 'text' },
    ],
  },
};

/* ── Checklist carrier ────────────────────────────────────────────────────── */

export type ChecklistCarrier = { selected: string[] };

export function normalizeChecklist(value: unknown): ChecklistCarrier {
  if (!value || typeof value !== 'object') return { selected: [] };
  const v = value as { selected?: unknown };
  if (!Array.isArray(v.selected)) return { selected: [] };
  const selected = [...new Set(v.selected.filter((x): x is string => typeof x === 'string' && x.trim().length > 0))];
  return { selected };
}

/* ── Register carrier ─────────────────────────────────────────────────────── */

export type RegisterCell = string | number | boolean | null;
export type RegisterRow = { id: string } & Record<string, RegisterCell>;
export type RegisterCarrier = { rows: RegisterRow[] };

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function newRegisterRow(columns: readonly ColumnDef[]): RegisterRow {
  const row: RegisterRow = { id: newId() };
  for (const c of columns) row[c.key] = c.type === 'boolean' ? false : c.type === 'number' ? null : '';
  return row;
}

function coerceCell(raw: unknown, type: ColumnType): RegisterCell {
  if (type === 'boolean') return raw === true;
  if (type === 'number') return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
  return typeof raw === 'string' ? raw : '';
}

export function normalizeRegister(value: unknown, columns: readonly ColumnDef[]): RegisterCarrier {
  if (!value || typeof value !== 'object') return { rows: [] };
  const v = value as { rows?: unknown };
  if (!Array.isArray(v.rows)) return { rows: [] };
  const rows: RegisterRow[] = [];
  for (const raw of v.rows) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const row: RegisterRow = { id: typeof r.id === 'string' && r.id.length > 0 ? r.id : newId() };
    for (const c of columns) row[c.key] = coerceCell(r[c.key], c.type);
    rows.push(row);
  }
  return { rows };
}

/** A register row counts as "filled" when its first text/enum column has a value. */
export function registerRowFilled(row: RegisterRow, columns: readonly ColumnDef[]): boolean {
  const primary = columns.find((c) => c.type === 'text' || c.type === 'enum');
  if (!primary) return true;
  const v = row[primary.key];
  return typeof v === 'string' && v.trim().length > 0;
}

/* ── DB shape adapters (phase-2) ──────────────────────────────────────────
 * SELECTION_CONFIGS is the TS-side source of truth today; Task 8 migrates
 * the same shapes into the `fields.widget`/`ui_config`/`enum_values`
 * columns. `toDbShape` renders a config the way it will look in the DB;
 * `fromDbField` reads a DB row back into a SelectionConfig. The pair is
 * pinned 1:1 for every entry in SELECTION_CONFIGS (see
 * selection-fields-db-parity.test.ts) so the eventual cutover (Task 9,
 * `resolveSelectionConfig`) is provably lossless. D-1 (owner ruling):
 * `a138_anlagentyp_kandidaten` keeps its prod `enum_values` verbatim instead
 * of being re-derived from the TS `options` list.
 */

export type DbFieldShape = {
  symbol: string;
  dataType: string;
  enumValues: unknown;
  widget: string | null;
  uiConfig: unknown;
  lookup: unknown;
  visibleWhen: string | null;
};
type EnumValue = { value: string; label_de: string; label_en?: string | null; order_index?: number };

// Drop `undefined`-valued keys via a JSON round-trip so both the toDbShape
// side and the fromDbField side normalise to the same shape for `toEqual`
// (semantic equality — the parity pin cares about the data, not whether an
// optional key is present-as-undefined vs. absent).
const strip = <T extends object>(o: T): T => JSON.parse(JSON.stringify(o));

export function toDbShape(
  symbol: string,
  config: SelectionConfig,
  opts?: { keepProdEnum?: EnumValue[] }
): { widget: 'select_many' | 'register'; ui_config: object; enum_values: Array<{ value: string; label_de: string; order_index: number }> | null } {
  if (config.kind === 'checklist') {
    const enum_values = (opts?.keepProdEnum ?? config.options.map((o, i) => ({ value: o, label_de: o, order_index: i }))) as Array<{
      value: string;
      label_de: string;
      order_index: number;
    }>;
    const ui_config: SelectManyUiConfig = strip({
      title: config.title,
      subtitle: config.subtitle,
      note: config.note,
      allow_custom: config.allowCustom,
      groups: opts?.keepProdEnum ? undefined : config.groups?.map((g) => ({ label: g.label, options: [...g.options] })),
    });
    return { widget: 'select_many', ui_config, enum_values };
  }
  const ui_config: RegisterUiConfig = strip({
    title: config.title,
    subtitle: config.subtitle,
    add_label: config.addLabel,
    note: config.note,
    columns: config.columns.map((c) => ({
      key: c.key,
      label: c.label,
      type: c.type,
      options: c.options ? [...c.options] : undefined,
      datalist: c.datalist ? [...c.datalist] : undefined,
      placeholder: c.placeholder,
      width: c.width,
    })),
    sum_column: config.sumColumn ? { key: config.sumColumn.key, label: config.sumColumn.label, unit: config.sumColumn.unit } : undefined,
  });
  return { widget: 'register', ui_config, enum_values: null };
}

/**
 * Task 9 dispatch: the DB config wins whenever `widget` is non-null; the TS
 * registry (SELECTION_CONFIGS) is consulted only while `widget IS NULL`, so a
 * migrated DB row can never be shadowed by a stale TS entry.
 */
export function resolveSelectionConfig(f: DbFieldShape): SelectionConfig | null {
  if (f.widget != null) return fromDbField(f);
  return SELECTION_CONFIGS[f.symbol] ?? null;
}

export function fromDbField(row: DbFieldShape): SelectionConfig | null {
  if (row.widget !== 'select_many' && row.widget !== 'register') return null;
  let cfg;
  try {
    cfg = parseFieldConfig({ widget: row.widget, uiConfig: row.uiConfig, lookup: row.lookup, visibleWhen: row.visibleWhen });
  } catch {
    return null;
  }
  if (row.widget === 'select_many') {
    const ui = (cfg.ui ?? {}) as SelectManyUiConfig;
    const ev = Array.isArray(row.enumValues) ? (row.enumValues as EnumValue[]) : [];
    const groups = ui.groups?.map((g) => ({ label: g.label, options: g.options }));
    return strip({
      kind: 'checklist',
      title: ui.title,
      subtitle: ui.subtitle ?? '',
      options: ev.map((e) => e.value),
      groups,
      note: ui.note,
      allowCustom: ui.allow_custom,
    }) as ChecklistConfig;
  }
  const ui = cfg.ui as RegisterUiConfig;
  return strip({
    kind: 'register',
    title: ui.title,
    subtitle: ui.subtitle ?? '',
    addLabel: ui.add_label ?? '+ Zeile hinzufügen',
    note: ui.note,
    columns: ui.columns.map((c) => ({
      key: c.key,
      label: c.label,
      type: c.type as ColumnType,
      options: c.options,
      datalist: c.datalist,
      placeholder: c.placeholder,
      width: c.width,
    })),
    sumColumn: ui.sum_column ? { key: ui.sum_column.key, label: ui.sum_column.label, unit: ui.sum_column.unit } : undefined,
  }) as RegisterConfig;
}
