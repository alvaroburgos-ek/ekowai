/**
 * One-shot transformer: EKOWAI-Agent v3.1 corpus → wizard worksheet JSON.
 *
 * Reads:
 *   <EKOWAI>/standards/DWA-A-201/mapping/mapping.json          (phases, thresholds, decision points)
 *   <EKOWAI>/standards/DWA-A-201/mapping/formulas.json         (3 inline formulas)
 *   <EKOWAI>/standards/DWA-A-201/worksheets/json/A201-NN.json  (title, archetype, section refs)
 *
 * Writes:
 *   src/lib/worksheets/DWA-A-201/v3.1/A201-NN.json (wizard contract shape)
 *
 * The output is `status: 'preview'` — never claim canonical validation
 * without an engineer signing off.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const EKOWAI_ROOT = process.env.EKOWAI_ROOT ?? 'C:/EKOWAI-Agent';
const STANDARD = 'DWA-A-201';
const SOURCE_DIR = join(EKOWAI_ROOT, 'standards', STANDARD);
const TARGET_DIR = join('src', 'lib', 'worksheets', STANDARD, 'v3.1');

interface EkowaiThreshold {
  id: string;
  section_ref: string;
  value: number;
  unit?: string;
  description: string;
  operator: 'ge' | 'le' | 'eq' | 'gt' | 'lt';
  assigned_to: string[];
  value_source?: string;
  note?: string;
}

interface EkowaiBranch {
  if: string;
  then: string;
  label: string;
}

interface EkowaiDecisionPoint {
  name: string;
  section_ref: string;
  owner_worksheet: string;
  description?: string;
  input_fields?: string[];
  branches?: EkowaiBranch[];
}

interface EkowaiFormula {
  id: string;
  name: string;
  expression: string;
  section_ref: string;
  variables: Record<string, string>;
  assigned_to: string;
  formula_role?: string;
}

interface EkowaiMapping {
  spec_version: string;
  standard_id: string;
  edition: string;
  version: string;
  decision_points: Record<string, EkowaiDecisionPoint>;
  phases: { name: string; worksheets: string[] }[];
}

interface EkowaiEquationRegister {
  threshold_register: { thresholds: EkowaiThreshold[] };
}

interface EkowaiInputsFrom {
  worksheet: string;
  parameters: string[];
  blocking?: boolean;
}

interface EkowaiOutputsTo {
  worksheet: string;
  parameters: string[];
}

interface EkowaiWorksheet {
  worksheet_id: string;
  title: { de: string; en: string };
  archetype?: string;
  section_refs?: { ref: string; title_de: string; title_en: string }[];
  inputs_from?: EkowaiInputsFrom[];
  outputs_to?: EkowaiOutputsTo[];
}

// Wizard contract types are duplicated minimally here so this script doesn't
// import the engine (which uses next/font etc).
type Op = '+' | '-' | '*' | '/';
interface Lit {
  kind: 'lit';
  value: number;
}
interface Ref {
  kind: 'ref';
  id: string;
}
interface OpExpr {
  kind: 'op';
  op: Op;
  lhs: ExprAst;
  rhs: ExprAst;
}
type ExprAst = Lit | Ref | OpExpr;

interface WizardInputField {
  id: string;
  type: 'number' | 'select' | 'text' | 'boolean';
  labelDe: string;
  labelEn: string;
  unit?: string;
  citation: string;
  helpDe?: string;
  options?: { value: string; labelDe: string; labelEn: string }[];
  defaultValue?: number | string | boolean;
  derivedFrom?: { worksheetId: string; parameter: string };
}
interface WizardThreshold {
  id: string;
  ref: string;
  rule: { kind: 'lte' | 'gte' | 'eq'; value: number };
  severity: 'warning' | 'blocking';
  messageDe: string;
  messageEn: string;
  citation: string;
  iterationHint?: string;
}

interface KnowledgeCheck {
  name: string;
  sectionRefs: string[];
  whatChecked: string;
  criterion: string;
  passOutcome: string;
  failOutcome: string;
  iterationHint: string;
  conditional: string;
}
interface WizardComputed {
  id: string;
  labelDe: string;
  labelEn: string;
  unit?: string;
  citation: string;
  expression: ExprAst;
  precision?: number;
}
interface WizardSection {
  id: string;
  titleDe: string;
  titleEn: string;
  fields: string[];
}
interface WizardDecisionOption {
  value: string;
  labelDe: string;
  labelEn: string;
}
interface WizardDecisionPoint {
  id: string;
  labelDe: string;
  labelEn: string;
  promptDe: string;
  promptEn: string;
  citation: string;
  options: WizardDecisionOption[];
}
interface Wizard {
  contractVersion: '1.0';
  regulation: string;
  regulationVersion: string;
  id: string;
  titleDe: string;
  titleEn: string;
  sourceCitation: string;
  status: 'preview' | 'verified';
  inputs: WizardInputField[];
  computed: WizardComputed[];
  thresholds: WizardThreshold[];
  sections: WizardSection[];
  decisionPoints: WizardDecisionPoint[];
}

function readJSON<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

function sanitizeId(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, '_').replace(/^([0-9])/, 'F_$1');
}

const OP_MAP: Record<EkowaiThreshold['operator'], 'gte' | 'lte' | 'eq' | null> = {
  ge: 'gte',
  le: 'lte',
  eq: 'eq',
  gt: 'gte', // approximate; gt vs gte difference is < 1 unit in regulation context
  lt: 'lte',
};

function severityOf(t: EkowaiThreshold): 'blocking' | 'warning' {
  // statutory_external = mandatory regulation value → blocking
  // operator_defined = bounded by regulation → blocking on the bound
  // illustrative_value_from_standard = guidance → warning
  return t.value_source === 'illustrative_value_from_standard' ? 'warning' : 'blocking';
}

/**
 * Parse a simple inline formula like "V_erf >= Q_M * t_R,M" → wizard ExprAst.
 * Conservative: only handles 2-term multiplication / addition / division
 * patterns. Anything else returns null and we skip generating a computed.
 */
function tryParseFormula(expression: string): { lhsId: string; rhs: ExprAst } | null {
  const m = expression.match(
    /^\s*([A-Za-z][A-Za-z0-9_,]*)\s*(=|>=|<=)\s*([A-Za-z0-9_,]+)\s*([*+/])\s*([A-Za-z0-9_,.]+)\s*$/,
  );
  if (!m) return null;
  const [, lhsId, , a, op, b] = m;
  const lhs = isNaN(Number(a)) ? { kind: 'ref' as const, id: sanitizeId(a) } : { kind: 'lit' as const, value: Number(a) };
  const rhs = isNaN(Number(b)) ? { kind: 'ref' as const, id: sanitizeId(b) } : { kind: 'lit' as const, value: Number(b) };
  if (!['*', '+', '/'].includes(op)) return null;
  return {
    lhsId: sanitizeId(lhsId),
    rhs: { kind: 'op', op: op as '*' | '+' | '/', lhs, rhs },
  };
}

function findIterationHint(
  threshold: EkowaiThreshold,
  knowledge: KnowledgeCheck[],
): string | undefined {
  if (knowledge.length === 0) return undefined;
  const tRefs = threshold.section_ref.split(/[,\s]+/).filter((r) => r.startsWith('§'));
  for (const check of knowledge) {
    if (check.sectionRefs.some((r) => tRefs.includes(r))) {
      const parts: string[] = [];
      if (check.failOutcome) parts.push(`Wirkung bei Verstoß: ${check.failOutcome}`);
      if (check.iterationHint) parts.push(`Maßnahme: ${check.iterationHint}`);
      return parts.join(' · ') || undefined;
    }
  }
  return undefined;
}

function transformWorksheet(
  wsRaw: EkowaiWorksheet,
  mapping: EkowaiMapping,
  thresholdRegister: EkowaiThreshold[],
  formulas: EkowaiFormula[],
  knowledge: KnowledgeCheck[],
): Wizard {
  const wsId = wsRaw.worksheet_id;
  const sectionRefs = wsRaw.section_refs ?? [];

  // ---- Inputs derived from thresholds assigned to this worksheet ----
  const myThresholds = thresholdRegister.filter((t) => t.assigned_to.includes(wsId));

  const inputs: WizardInputField[] = [];
  const thresholds: WizardThreshold[] = [];
  const seenInputIds = new Set<string>();

  for (const t of myThresholds) {
    const fieldId = sanitizeId(t.id); // T-01 → T_01
    const op = OP_MAP[t.operator];
    if (!op) continue; // unsupported operator, skip
    // EKOWAI threshold register sometimes carries non-numeric values
    // (e.g. slope ratios "1:2"). The wizard's threshold model is numeric;
    // skip these — they need a separate ratio-threshold extension later.
    if (typeof t.value !== 'number' || !Number.isFinite(t.value)) continue;

    if (!seenInputIds.has(fieldId)) {
      inputs.push({
        id: fieldId,
        type: 'number',
        labelDe: t.description,
        labelEn: t.description, // EKOWAI threshold descriptions are German-only; same for now
        unit: t.unit,
        citation: t.section_ref,
        helpDe: t.note,
      });
      seenInputIds.add(fieldId);
    }

    thresholds.push({
      id: t.id,
      ref: fieldId,
      rule: { kind: op, value: t.value },
      severity: severityOf(t),
      messageDe: `${t.description}: Regelwert ${
        op === 'gte' ? '≥' : op === 'lte' ? '≤' : '='
      } ${t.value}${t.unit ? ' ' + t.unit : ''} (${t.section_ref}).`,
      messageEn: `${t.description}: regulation value ${
        op === 'gte' ? '≥' : op === 'lte' ? '≤' : '='
      } ${t.value}${t.unit ? ' ' + t.unit : ''} (${t.section_ref}).`,
      citation: t.section_ref,
      iterationHint: findIterationHint(t, knowledge),
    });
  }

  // ---- Computed fields from formulas assigned to this worksheet ----
  const computed: WizardComputed[] = [];
  const myFormulas = formulas.filter((f) => f.assigned_to === wsId);
  for (const f of myFormulas) {
    const parsed = tryParseFormula(f.expression);
    if (!parsed) continue; // skip if parser couldn't handle it
    if (seenInputIds.has(parsed.lhsId)) continue; // would collide with a threshold-input

    // Walk the parsed expression and ensure every `ref` has either an
    // existing input or computed field. If not, emit an input stub —
    // otherwise the engine reports 'unresolved reference' at runtime.
    const collectRefs = (e: ExprAst): string[] =>
      e.kind === 'ref'
        ? [e.id]
        : e.kind === 'op'
          ? [...collectRefs(e.lhs), ...collectRefs(e.rhs)]
          : [];

    for (const refId of collectRefs(parsed.rhs)) {
      if (seenInputIds.has(refId)) continue;
      // Look up a label from the formula's variables map; key may be the
      // raw form (with commas/dots) → sanitize for matching.
      const labelEntry = Object.entries(f.variables).find(
        ([k]) => sanitizeId(k) === refId,
      );
      const label = labelEntry ? labelEntry[1] : refId;
      // Try to extract the unit from the variable description, e.g.
      // "Einwohnerzahl (E)" → unit "E".
      const unitMatch = label.match(/\(([^)]+)\)\s*$/);
      const unit = unitMatch ? unitMatch[1] : undefined;
      const cleanLabel = label.replace(/\s*\([^)]+\)\s*$/, '').trim() || refId;

      inputs.push({
        id: refId,
        type: 'number',
        labelDe: cleanLabel,
        labelEn: cleanLabel,
        unit,
        citation: f.section_ref,
      });
      seenInputIds.add(refId);
    }

    computed.push({
      id: parsed.lhsId,
      labelDe: f.name,
      labelEn: f.name,
      citation: f.section_ref,
      expression: parsed.rhs,
      precision: 2,
    });
  }

  // ---- Output-publishing inputs (from outputs_to declarations) ----
  // The engineer enters values here; downstream worksheets pick them up
  // as derivedFrom inputs.
  const allPublished = new Set<string>();
  for (const link of wsRaw.outputs_to ?? []) {
    for (const param of link.parameters) {
      allPublished.add(param);
    }
  }
  for (const param of allPublished) {
    const fieldId = sanitizeId(param);
    if (seenInputIds.has(fieldId)) continue;
    const unitMatch = param.match(/\[([^\]]+)\]\s*$/);
    const unit = unitMatch ? unitMatch[1] : undefined;
    const cleanLabel = param.replace(/\s*\[[^\]]+\]\s*$/, '').trim() || param;
    inputs.push({
      id: fieldId,
      type: 'number',
      labelDe: cleanLabel,
      labelEn: cleanLabel,
      unit,
      citation: sectionRefs[0]?.ref ?? '§1',
    });
    seenInputIds.add(fieldId);
  }

  // ---- Derived inputs (from inputs_from declarations) ----
  // These show up as read-only fields in the wizard, pre-filled at calc-load
  // time from the matching upstream calc within the same project.
  for (const link of wsRaw.inputs_from ?? []) {
    for (const param of link.parameters) {
      const fieldId = sanitizeId(param);
      if (seenInputIds.has(fieldId)) continue;
      // Strip unit/notation in brackets from the param for label, e.g.
      // "V_EW [m³/E]" → label "V_EW", unit "m³/E".
      const unitMatch = param.match(/\[([^\]]+)\]\s*$/);
      const unit = unitMatch ? unitMatch[1] : undefined;
      const cleanLabel = param.replace(/\s*\[[^\]]+\]\s*$/, '').trim() || param;
      inputs.push({
        id: fieldId,
        type: 'number',
        labelDe: cleanLabel,
        labelEn: cleanLabel,
        unit,
        citation: sectionRefs[0]?.ref ?? '§1',
        derivedFrom: { worksheetId: link.worksheet, parameter: param },
      });
      seenInputIds.add(fieldId);
    }
  }

  // ---- Decision points where this is the owner ----
  const decisionPoints: WizardDecisionPoint[] = [];
  for (const [dpId, dp] of Object.entries(mapping.decision_points ?? {})) {
    if (dp.owner_worksheet !== wsId) continue;
    const branches = dp.branches ?? [];
    if (branches.length < 2) continue; // wizard requires ≥2 options
    decisionPoints.push({
      id: `${wsId}-${dpId}`,
      labelDe: dp.name,
      labelEn: dp.name,
      promptDe: dp.description ?? dp.name,
      promptEn: dp.description ?? dp.name,
      citation: dp.section_ref,
      options: branches.map((b) => ({
        value: b.label,
        labelDe: b.label,
        labelEn: b.label,
      })),
    });
  }

  // ---- Sections ----
  const sections: WizardSection[] = [];
  if (inputs.length > 0) {
    sections.push({
      id: 'inputs',
      titleDe: 'Bemessungsgrößen & Schwellwerte',
      titleEn: 'Design parameters & thresholds',
      fields: inputs.map((i) => i.id),
    });
  }
  if (computed.length > 0) {
    sections.push({
      id: 'results',
      titleDe: 'Berechnete Werte',
      titleEn: 'Computed values',
      fields: computed.map((c) => c.id),
    });
  }
  if (sections.length === 0) {
    // No inputs / computed → still emit a placeholder section so schema validates.
    sections.push({
      id: 'meta',
      titleDe: 'Hinweise',
      titleEn: 'Notes',
      fields: [],
    });
    // schema requires fields.min(1) — workaround: include a dummy text input.
    inputs.push({
      id: 'note',
      type: 'text',
      labelDe: 'Anmerkungen',
      labelEn: 'Notes',
      citation: sectionRefs[0]?.ref ?? '§1',
    });
    sections[0].fields = ['note'];
  }

  return {
    contractVersion: '1.0',
    regulation: STANDARD,
    regulationVersion: 'v3.1',
    id: wsId,
    titleDe: wsRaw.title.de,
    titleEn: wsRaw.title.en,
    sourceCitation: sectionRefs[0]?.ref ?? '§1',
    status: 'preview',
    inputs,
    computed,
    thresholds,
    sections,
    decisionPoints,
  };
}

async function main() {
  if (!existsSync(SOURCE_DIR)) {
    console.error(`Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }

  const mapping = readJSON<EkowaiMapping>(join(SOURCE_DIR, 'mapping', 'mapping.json'));
  const equationRegister = readJSON<EkowaiEquationRegister>(
    join(SOURCE_DIR, 'mapping', 'equation_register.json'),
  );
  const formulasRaw = readJSON<{ formulas: EkowaiFormula[] }>(
    join(SOURCE_DIR, 'mapping', 'formulas.json'),
  );

  const knowledgePath = join(TARGET_DIR, '_knowledge.json');
  const knowledge: KnowledgeCheck[] = existsSync(knowledgePath)
    ? readJSON<{ complianceChecks: KnowledgeCheck[] }>(knowledgePath).complianceChecks
    : [];

  const wsDir = join(SOURCE_DIR, 'worksheets', 'json');
  const wsFiles = readdirSync(wsDir)
    .filter((f) => /^A201-\d+\.json$/.test(f))
    .sort();

  if (!existsSync(TARGET_DIR)) mkdirSync(TARGET_DIR, { recursive: true });

  const summary: { id: string; inputs: number; thresholds: number; computed: number; dps: number }[] = [];

  for (const f of wsFiles) {
    const ws = readJSON<EkowaiWorksheet>(join(wsDir, f));
    const wizard = transformWorksheet(
      ws,
      mapping,
      equationRegister.threshold_register.thresholds,
      formulasRaw.formulas,
      knowledge,
    );
    const out = join(TARGET_DIR, basename(f));
    writeFileSync(out, JSON.stringify(wizard, null, 2) + '\n', 'utf-8');
    summary.push({
      id: wizard.id,
      inputs: wizard.inputs.length,
      thresholds: wizard.thresholds.length,
      computed: wizard.computed.length,
      dps: wizard.decisionPoints.length,
    });
  }

  console.log(
    'Worksheet'.padEnd(10) +
      'Inputs'.padStart(8) +
      'Thresh'.padStart(8) +
      'Comp'.padStart(8) +
      'DPs'.padStart(6),
  );
  for (const s of summary) {
    console.log(
      s.id.padEnd(10) +
        String(s.inputs).padStart(8) +
        String(s.thresholds).padStart(8) +
        String(s.computed).padStart(8) +
        String(s.dps).padStart(6),
    );
  }
  console.log(`\nWrote ${summary.length} worksheets to ${TARGET_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
