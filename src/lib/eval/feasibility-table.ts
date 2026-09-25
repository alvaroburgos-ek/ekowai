/**
 * Tab. 3 of DWA-A 138-1:2024 — "Überprüfung der Umsetzbarkeit einer
 * entwässerungstechnischen Versickerung" (transcript L741–L752), as a
 * decision table the A138-02 worksheet can SHOW: seven criteria, three
 * columns (2 möglich · 3 potenziell möglich · 4 nicht möglich), each cell
 * verbatim, and per row the column the current inputs fall into.
 *
 * Column rule (L752, verbatim in `UMSETZBARKEIT`): column 2 only when all
 * seven criteria are met; one or more column-3 criteria → measures and, where
 * needed, coordination with the authority; one column-4 criterion → as a rule
 * not permissible.
 *
 * Two column-4 cells are RISK / possibility judgements that no field carries
 * (drinking-water protection "nicht vernachlässigbar"; k_f < 1·10⁻⁶ with no
 * connection or throttled discharge possible). They are rendered, but the
 * mapping never places a row in column 4 for them — that judgement stays with
 * the engineer (same fail-safe as the Plan-3 equation A138-02-D1).
 */

export type Col = 2 | 3 | 4;

export type CriterionDef = {
  key: string;
  /** field symbols the row reads (A138-01/02) */
  symbols: string[];
  cells: { 2: string; 3: string; 4: string | null };
  /** map the read values to a column; null = not answered */
  classify: (v: Record<string, unknown>) => Col | null;
  /** column-4 cell exists but is a judgement no field carries */
  col4IsJudgement?: boolean;
};

export const COLUMN_HEADS: Record<Col, string> = {
  2: 'Versickerung ist möglich',
  3: 'Versickerung ist potenziell möglich',
  4: 'Versickerung ist nicht möglich',
};

/** L752 — the "Umsetzbarkeit" row, verbatim per column. */
export const UMSETZBARKEIT: Record<Col, string> = {
  2: 'Eine Versickerung von Niederschlagswasser ist grundsätzlich möglich, wenn alle der oben genannten Kriterien zutreffen und durch Fachgutachten nachgewiesen sind. Ist ein Kriterium nicht erfüllt sind die entsprechenden Kriterien nach Spalte 3 zu prüfen.',
  3: 'Wenn eine oder mehrere Kriterien dieser Kategorie zutreffen, sind technische und planerische Maßnahmen durch die Fachplanenden aufzuzeigen und ggf. mit der zuständigen Genehmigungsbehörde abzustimmen',
  4: 'Wenn eines der oben aufgeführten Kriterien zutrifft, ist eine Versickerung von Niederschlagswasser in der Regel nicht zulässig',
};

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

export const TAB3_CRITERIA: CriterionDef[] = [
  { // L745
    key: 'mhgw', symbols: ['gw_clearance'],
    cells: { 2: 'Abstand Sohle Versickerungsanlage zum MHGW ≥ 1 m', 3: 'Abstand Sohle Versickerungsanlage zum MHGW < 1 m', 4: null },
    classify: (v) => { const a = num(v.gw_clearance); return a == null ? null : a >= 1 ? 2 : 3; },
  },
  { // L746
    key: 'altlasten', symbols: ['contaminated_land_status'],
    cells: {
      2: 'Keine Altlasten, altlastenverdächtige Flächen oder schädliche Bodenveränderungen vorhanden',
      3: 'Örtlich begrenzte Altlasten, altlastenverdächtige Flächen oder schädliche Bodenveränderungen liegen in der Nähe vor. Die Mobilisierung von Schadstoffen ist unwahrscheinlich oder kann beseitigt werden.',
      4: 'Altlasten, altlastenverdächtige Flächen oder schädliche Bodenveränderungen liegen im Boden vor. Es besteht die Gefahr der Mobilisierung von Schadstoffen durch die entwässerungstechnische Versickerung.',
    },
    classify: (v) => ({ none: 2, nearby: 3, present: 4 } as Record<string, Col>)[str(v.contaminated_land_status) ?? ''] ?? null,
  },
  { // L747 — column 4 is a risk judgement; every zone lands in column 3 (Einzelfallbetrachtung)
    key: 'wsg', symbols: ['water_protection_zone'], col4IsJudgement: true,
    cells: {
      2: 'Kein Trinkwasserschutzgebiet; Risiko einer Verschmutzung durch die Versickerungsanlage ist nicht gegeben/sehr gering',
      3: 'Trinkwasserschutzgebiet liegt vor; Risiko einer Verschmutzung durch die Versickerungsanlage ist aber sehr gering (Einzelfallbetrachtung)',
      4: 'Trinkwasserschutzgebiet liegt vor; Risiko einer Verschmutzung durch die Versickerungsanlage ist nicht vernachlässigbar',
    },
    classify: (v) => { const z = str(v.water_protection_zone); return z == null ? null : z === 'none' ? 2 : 3; },
  },
  { // L748 — column 3/4 split needs the "Anschluss / Ableitung möglich" fact no field carries
    key: 'kf', symbols: ['kf_initial_estimate'], col4IsJudgement: true,
    cells: {
      2: 'k_f ≥ 1 · 10⁻⁶ m/s',
      3: 'k_f < 1 · 10⁻⁶ m/s und der Anschluss an durchlässige Bodenschichten oder eine gedrosselte Ableitung ist möglich',
      4: 'k_f < 1 · 10⁻⁶ m/s und der Anschluss an durchlässige Bodenschichten oder eine gedrosselte Ableitung ist nicht möglich (Ausnahme breitflächige Versickerung)',
    },
    classify: (v) => { const k = num(v.kf_initial_estimate); return k == null ? null : k >= 1e-6 ? 2 : 3; },
  },
  { // L749
    key: 'geotech', symbols: ['geotech_hazards'],
    cells: {
      2: 'Eine geotechnische Gefährdung im Projektgebiet (z. B. Bodenverflüssigung, Quellböden, Unterspülung, Karstgesteine) durch die Versickerungsanlage ist ausgeschlossen',
      3: 'Geotechnische Gefährdungen sind im näheren Umfeld möglich, aber nicht am Standort der Versickerungsanlage',
      4: 'Geotechnische Gefährdungen liegen am Standort vor',
    },
    classify: (v) => ({ none: 2, nearby: 3, at_site: 4 } as Record<string, Col>)[str(v.geotech_hazards) ?? ''] ?? null,
  },
  { // L750
    key: 'abstand', symbols: ['building_clearance_status'],
    cells: {
      2: 'Mindestabstände zu Gebäuden/Baugruben und sonstigen baulichen Strukturen sind einzuhalten/unkritisch (siehe 5.3.2)',
      3: 'Mindestabstände zu Gebäuden/Baugruben und sonstigen baulichen Strukturen sind nicht einzuhalten; bautechnische Sicherungen sind möglich (z. B. weiße oder schwarze Wanne)',
      4: 'Mindestabstände zu Gebäuden/Baugruben und sonstigen baulichen Strukturen sind nicht einzuhalten; bautechnische Sicherungen sind nicht möglich',
    },
    classify: (v) => ({ met: 2, not_met_protection_possible: 3, not_met_no_protection: 4 } as Record<string, Col>)[str(v.building_clearance_status) ?? ''] ?? null,
  },
  { // L751
    key: 'hang', symbols: ['slope_risk'],
    cells: {
      2: 'Der Standort der Versickerungsanlage liegt nicht in der Nähe eines Hangs',
      3: 'Der Standort der Versickerungsanlage liegt in der Nähe eines Hangs. Hangrutschung oder Wasseraustritt des infiltrierten Oberflächenwassers an einem Hang sind unwahrscheinlich bzw. nicht nachteilig.',
      4: 'Hangrutschung oder nachteiliger Wasseraustritt des infiltrierten Oberflächenwassers an einem Hang sind wahrscheinlich',
    },
    classify: (v) => ({ none: 2, unlikely: 3, probable: 4 } as Record<string, Col>)[str(v.slope_risk) ?? ''] ?? null,
  },
];

export type Tab3Row = { def: CriterionDef; col: Col | null };
export type Tab3Result = {
  rows: Tab3Row[];
  /** 2 | 3 | 4 when every row is answered; null while any row is open */
  overall: Col | null;
  unanswered: string[];
  /** prod enum token of `feasibility_determination` the overall column corresponds to */
  suggestedDetermination: 'feasible' | 'conditional' | 'not_feasible' | null;
  /** rows whose column-4 cell is a judgement the engineer must still make */
  judgementRows: string[];
};

export function evaluateTab3(values: Record<string, unknown>): Tab3Result {
  const rows = TAB3_CRITERIA.map((def) => ({ def, col: def.classify(values) }));
  const unanswered = rows.filter((r) => r.col == null).map((r) => r.def.key);
  let overall: Col | null = null;
  if (unanswered.length === 0) {
    overall = rows.some((r) => r.col === 4) ? 4 : rows.some((r) => r.col === 3) ? 3 : 2;
  }
  const judgementRows = rows.filter((r) => r.col === 3 && r.def.col4IsJudgement).map((r) => r.def.key);
  return {
    rows, overall, unanswered, judgementRows,
    suggestedDetermination: overall == null ? null : overall === 2 ? 'feasible' : overall === 3 ? 'conditional' : 'not_feasible',
  };
}
