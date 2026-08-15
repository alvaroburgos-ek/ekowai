import { evaluateFormula, type EvalState } from '@/lib/eval/formula';
import { evaluateCondition, type EvalResult as ComplianceEval } from '@/lib/compliance/evaluate';
import { explainCondition, type ExplainLeaf } from '@/lib/compliance/explain';
import { blocksVerificationGate } from '@/lib/verification-status';
import { resolveFromSiteProfile, SITE_PROFILE_ENTRIES } from '@/lib/site-profile/symbol-map';
import { shouldEngineEvaluate } from '@/lib/eval/equation-manual-denylist';
import { timeRangeLabel } from '@/lib/actions/monitoring-core';

/**
 * Pure assembler for the per-standard PDF report data.
 *
 * Separated from the DB-fetch wrapper (`loadStandardReportData`) so that:
 *
 *   1. The data-shape contract can be tested without a live database.
 *   2. The three-state engine contract is exercised by the test against
 *      the same evaluator the production path uses.
 *
 * Two contracts that MUST be preserved:
 *
 *   1. The engine three-state contract: every whitelisted equation surfaces
 *      its EvalState verbatim. `manual_required` and `error` MUST NOT be
 *      converted to a bare number or a missing entry — the PDF renders them
 *      as a warning box.
 *
 *   2. Citations are pflicht-Belege. Per-field we surface the short-form
 *      citation label; the full document list is collected into an index at
 *      the end of the report so the engineer can audit which documents
 *      backed which value.
 */

// =============================================================================
// Output types (the shape rendered by the React-PDF Document)
// =============================================================================
export type StoredCitation = {
  id?: string;
  docId: string;
  page?: number | null;
  note?: string | null;
};

export type ReportFieldCitation = {
  label: string;
  title: string | null;
  docId: string;
  page: number | null;
  note: string | null;
};

export type ReportField = {
  id: string;
  symbol: string;
  labelDe: string;
  unit: string | null;
  dataType: string;
  isRequired: boolean;
  value: string | null;
  valueSource: 'entered' | 'inherited' | 'site_profile' | 'computed' | null;
  citations: ReportFieldCitation[];
  clauseReference: string | null;
  /** Kundenangabe (project_parameters.client_supplied): the value was
   * delivered by the client, not determined by EKOWAI — the dossier marks it
   * so the AGB input-error carve-out is traceable. */
  clientSupplied: boolean;
};

export type ReportSection = {
  id: string;
  titleDe: string;
  orderIndex: number;
  fields: ReportField[];
};

export type ReportEquation = {
  id: string;
  equationNumber: string;
  formula: string;
  formulaLatex: string | null;
  outputSymbol: string | null;
  outputUnit: string | null;
  clauseReference: string | null;
  evalState: EvalState | null;
};

export type ReportCompliance = {
  id: string;
  code: string;
  titleDe: string;
  condition: string;
  severity: string;
  clauseReference: string | null;
  result: ComplianceEval;
  /** Per-leaf explanation (actual · required · wouldPass) — present on fail. */
  explanation?: ExplainLeaf[];
};

export type ReportWorksheet = {
  instanceId: string | null;
  templateId: string;
  code: string;
  titleDe: string;
  status: string | null;
  orderIndex: number;
  sections: ReportSection[];
  equations: ReportEquation[];
  compliance: ReportCompliance[];
  /** Stage-1: used fields (required or valued) whose definition is not yet
   * verified against the printed standard — the finalize gate's list,
   * surfaced in the dossier so a reviewer sees it before signing.
   * Optional so hand-built render fixtures stay valid; assembler always sets it. */
  unverifiedFields?: Array<{ symbol: string; labelDe: string; status: string }>;
  /**
   * Present only when A138-12's A_S,m was specified manually by the engineer
   * (a_s_m_determination_method === 'manual' && a_s_m_provenance non-empty).
   * The PDF renderer must show this line prominently so the reviewer knows the
   * value was NOT derived by the engine.
   * For all other worksheets and for the non-manual methods this is null.
   */
  aSmProvenanceLine: string | null;
};

export type ReportLetterhead = {
  orgName: string;
  logoUrl: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
};

export type ReportSiteProfile = {
  rows: Array<{ key: string; labelDe: string; value: string; unit?: string }>;
};

export type ReportProjectHeader = {
  projectId: string;
  projectName: string;
  projectCode: string | null;
  clientName: string | null;
  location: string | null;
  createdAt: string;
  aggregatedStatus: 'draft' | 'submitted' | 'final';
};

export type AuditExcerptEntry = {
  occurredAt: string;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  detail: string;
  worksheetCode: string | null;
};

export type CitationIndexEntry = {
  docId: string;
  citationLabel: string;
  title: string;
  kind: string | null;
  issuedAt: string | null;
};

export type StandardReportData = {
  generatedAt: string;
  project: ReportProjectHeader;
  letterhead: ReportLetterhead | null;
  standard: {
    id: string;
    code: string;
    titleDe: string;
    version: string;
    /** standards.id of the edition replacing this one; null = current edition.
     * Assembler normalises absent fixture input to null (backward compat). */
    supersededBy: string | null;
  };
  siteProfile: ReportSiteProfile;
  worksheets: ReportWorksheet[];
  citationIndex: CitationIndexEntry[];
  audit: AuditExcerptEntry[];
  /** Latest approve-snapshot per worksheet — the reproducible calculation
   * state this report refers to (empty = no approvals yet).
   * Optional so hand-built render fixtures stay valid; assembler always sets it. */
  approveSnapshots?: Array<{ worksheetCode: string; snapshotId: string; takenAt: string }>;
  /** Monitoring-Journal entries linked to THIS standard (documentation layer,
   * no parameter values). Optional for fixtures; assembler normalises to []. */
  monitoringEntries?: Array<{
    entryDate: string;
    /** Pre-rendered "14:00–16:15 · 2 h 15 min" label or null (untimed entry). */
    timeLabel: string | null;
    category: string;
    note: string | null;
    documentTitle: string | null;
  }>;
};

// =============================================================================
// Input types — the de-normalised rows the assembler consumes.
//
// These mirror the production drizzle row shapes loosely. Used both by
// `loadStandardReportData` (production path) and by the unit test (fixture
// data). Keeping it loose (`any`-shaped numerics, ISO-or-Date timestamps)
// avoids a tight type coupling to drizzle and lets the test data be plain
// JSON.
// =============================================================================
type DateLike = Date | string;

function toDate(d: DateLike): Date {
  return d instanceof Date ? d : new Date(d);
}

export type AssemblerProject = {
  id: string;
  name: string;
  projectCode: string | null;
  clientName: string | null;
  location: string | null;
  siteProfile: Record<string, unknown> | null;
  createdAt: DateLike;
};

export type AssemblerOrg = {
  id: string;
  name: string;
  logoUrl: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
};

export type AssemblerStandard = {
  id: string;
  code: string;
  titleDe: string;
  version: string;
  /** Optional so pre-edition fixtures stay valid; assembler emits null when absent. */
  supersededBy?: string | null;
};

export type AssemblerTemplate = {
  id: string;
  code: string;
  titleDe: string;
  orderIndex: number;
};

export type AssemblerInstance = {
  id: string;
  worksheetTemplateId: string;
  status: string;
};

export type AssemblerSection = {
  id: string;
  worksheetTemplateId: string;
  titleDe: string;
  orderIndex: number;
};

export type AssemblerField = {
  id: string;
  worksheetTemplateId: string;
  sectionId: string | null;
  symbol: string;
  labelDe: string;
  unit: string | null;
  dataType: string;
  isRequired: boolean;
  clauseReference: string | null;
  orderIndex: number;
  /** Stage-1 verification state — optional so fixtures stay lightweight;
   * ABSENT means unknown and is never flagged (the production loader
   * always supplies it). */
  verificationStatus?: string;
};

export type AssemblerEquation = {
  id: string;
  worksheetTemplateId: string;
  equationNumber: string;
  formula: string;
  formulaLatex: string | null;
  inputSymbols: string[] | null;
  outputSymbol: string | null;
  outputUnit: string | null;
  clauseReference: string | null;
};

export type AssemblerCompliance = {
  id: string;
  worksheetTemplateId: string;
  code: string;
  titleDe: string;
  condition: string;
  severity: string;
  clauseReference: string | null;
};

export type AssemblerParameter = {
  fieldId: string;
  valueNumber: string | number | null;
  valueText: string | null;
  valueEnum: string | null;
  valueDate: string | null;
  valueBoolean: boolean | null;
  valueJson: unknown;
  sourceType: string;
  citationSources: unknown;
  /** Kundenangabe flag — optional so pre-flag fixtures stay valid; assembler
   * normalises absent input to false. */
  clientSupplied?: boolean;
};

export type AssemblerDocument = {
  id: string;
  citationLabel: string;
  title: string;
  kind: string | null;
  issuedAt: DateLike | null;
};

export type AssemblerApprovalRow = {
  occurredAt: DateLike;
  actorRole: string | null;
  eventType: string;
  fromStatus: string;
  toStatus: string;
  comment: string;
  worksheetCode: string;
  actorName: string | null;
};

export type AssemblerAuditRow = {
  occurredAt: DateLike;
  actorRole: string | null;
  action: string;
  changes: unknown;
  tableName: string;
  actorName: string | null;
};

export type AssemblerInput = {
  project: AssemblerProject;
  org: AssemblerOrg | null;
  standard: AssemblerStandard;
  templates: AssemblerTemplate[];
  instances: AssemblerInstance[];
  sections: AssemblerSection[];
  fields: AssemblerField[];
  equations: AssemblerEquation[];
  compliance: AssemblerCompliance[];
  parameters: AssemblerParameter[];
  documents: AssemblerDocument[];
  approvals: AssemblerApprovalRow[];
  audits: AssemblerAuditRow[];
  /** Latest approve-snapshot rows (optional; loader supplies, fixtures may omit). */
  snapshots?: Array<{ worksheetInstanceId: string; id: string; takenAt: DateLike | null }>;
  /** Monitoring-Journal rows for this standard (optional; loader supplies). */
  monitoring?: Array<{
    entryDate: DateLike;
    /** Optional activity times ('HH:MM:SS' from Postgres, or 'HH:MM'). */
    startTime?: string | null;
    endTime?: string | null;
    category: string;
    note: string | null;
    documentTitle: string | null;
  }>;
  /** Clock for `generatedAt`. Defaults to Date.now(). */
  now?: Date;
};

// =============================================================================
// DWA-A-138 PDF FROZEN GATE — DELIBERATE, SCHEDULED FOR REMOVAL (see design note).
//
// This is NOT a third general whitelist. It is a deliberate freeze of the 138
// PDF's evaluated-equation set, kept ONLY for compliance-output stability.
//
//  WHY FROZEN: the 138 PDF was acceptance-verified live in Task 11 Step 6.3
//    (PLT-HS-01, 2026-07-13) rendered THROUGH this exact set. Compliance output
//    must not silently change without re-acceptance, so generalization does not
//    touch the 138 PDF: only these 138 equations evaluate server-side (they need
//    no browser carrier); carrier-dependent 138 aggregators (Gl. 2 / 8 / 10)
//    stay `not_evaluated` (not a misleading manual_required). Non-138 standards
//    have no carrier aggregators → every non-138 equation routes through the
//    evaluator minus the deny-set (see the gate below). E1-A design note.
//
//  WHEN IT DIES (backlog task "retire PDF 138 gate", scheduled end of E1-D or
//    138 Phase 4, whichever first): switch 138 PDF to route-all-minus-deny like
//    client/server, then RE-VERIFY the PLT-HS-01 PDF against the Step-6.3
//    baseline — diff the equation sections, confirm every newly-rendered engine
//    verification is correct — before removing this gate.
// =============================================================================
export const PDF_138_FROZEN_GATE = new Set<string>([
  'A138-12:4',
  'A138-12:7',
  'A138-16:11',
  'A138-16:12',
  'A138-17:16',
  'A138-18:17',
  'A138-18:21',
]);

// =============================================================================
// Assembler
// =============================================================================
export function assembleStandardReport(input: AssemblerInput): StandardReportData {
  const {
    project,
    org,
    standard,
    templates,
    instances,
    sections,
    fields,
    equations,
    compliance,
    parameters,
    documents,
    approvals,
    audits,
    now = new Date(),
  } = input;

  const instanceByTemplateId = new Map(instances.map((i) => [i.worksheetTemplateId, i]));
  const paramByFieldId = new Map(parameters.map((p) => [p.fieldId, p]));
  const docById = new Map(documents.map((d) => [d.id, d]));

  // ---------------------------------------------------------------------------
  // Build value-by-symbol map for equation evaluation. Same approach as the
  // browser-side `useEquationEngine` — for each field on the standard's
  // worksheets, look up the project_parameter or fall back to site_profile.
  // ---------------------------------------------------------------------------
  type ResolvedValue = {
    value: number | string | boolean | null;
    unit: string | null;
    source: ReportField['valueSource'];
  };
  const resolvedByFieldId = new Map<string, ResolvedValue>();
  const resolvedBySymbol = new Map<string, ResolvedValue>();

  for (const f of fields) {
    const p = paramByFieldId.get(f.id);
    let value: ResolvedValue['value'] = null;
    let source: ReportField['valueSource'] = null;
    if (p) {
      if (f.dataType === 'number') {
        value = p.valueNumber == null ? null : Number(p.valueNumber);
      } else if (f.dataType === 'text') {
        value = p.valueText;
      } else if (f.dataType === 'enum') {
        value = p.valueEnum;
      } else if (f.dataType === 'date') {
        value = p.valueDate;
      } else if (f.dataType === 'boolean') {
        value = p.valueBoolean;
      } else {
        value = p.valueJson == null ? null : (p.valueJson as ResolvedValue['value']);
      }
      if (value != null) {
        source = p.sourceType === 'inherited' ? 'inherited' : 'entered';
      }
    }
    if (value == null) {
      const sp = resolveFromSiteProfile(project.siteProfile, f.symbol);
      if (sp && sp.value != null) {
        value = sp.value;
        source = 'site_profile';
      }
    }
    const entry: ResolvedValue = { value, unit: f.unit, source };
    resolvedByFieldId.set(f.id, entry);
    if (value != null) {
      resolvedBySymbol.set(f.symbol, entry);
    }
  }

  // ---------------------------------------------------------------------------
  // Group rows by templateId for O(1) per-worksheet lookup.
  // ---------------------------------------------------------------------------
  const sectionsByTemplate = groupBy(sections, (s) => s.worksheetTemplateId);
  const fieldsByTemplate = groupBy(fields, (f) => f.worksheetTemplateId);
  const eqsByTemplate = groupBy(equations, (e) => e.worksheetTemplateId);
  const cReqsByTemplate = groupBy(compliance, (c) => c.worksheetTemplateId);

  const citationsForField = (fid: string): ReportFieldCitation[] => {
    const p = paramByFieldId.get(fid);
    if (!p) return [];
    const raw = p.citationSources;
    if (!Array.isArray(raw)) return [];
    const out: ReportFieldCitation[] = [];
    for (const c of raw) {
      if (!c || typeof c !== 'object') continue;
      const stored = c as StoredCitation;
      const docId = stored.docId;
      if (!docId) continue;
      if (docId.startsWith('label:')) {
        const label = docId.slice('label:'.length);
        out.push({
          label,
          title: label,
          docId,
          page: stored.page ?? null,
          note: stored.note ?? null,
        });
      } else {
        const doc = docById.get(docId);
        if (doc) {
          out.push({
            label: doc.citationLabel,
            title: doc.title,
            docId,
            page: stored.page ?? null,
            note: stored.note ?? null,
          });
        } else {
          // Orphan — surface it so the engineer notices a broken citation.
          out.push({
            label: '?',
            title: '(Beleg-Dokument nicht gefunden)',
            docId,
            page: stored.page ?? null,
            note: stored.note ?? null,
          });
        }
      }
    }
    return out;
  };

  // ---------------------------------------------------------------------------
  // Build worksheet rows.
  // ---------------------------------------------------------------------------
  const worksheets: ReportWorksheet[] = [...templates]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((tpl) => {
      const tplSecs = (sectionsByTemplate.get(tpl.id) ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex);
      const tplFields = (fieldsByTemplate.get(tpl.id) ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex);
      const tplEqs = eqsByTemplate.get(tpl.id) ?? [];
      const tplCReqs = cReqsByTemplate.get(tpl.id) ?? [];

      // Group fields by section id (null → 'unsectioned').
      const sectionMap = new Map<string | 'unsectioned', ReportField[]>();
      const unverifiedFields: NonNullable<ReportWorksheet['unverifiedFields']> = [];
      for (const f of tplFields) {
        const sid = f.sectionId ?? 'unsectioned';
        const arr = sectionMap.get(sid) ?? [];
        const resolved = resolvedByFieldId.get(f.id);
        const param = paramByFieldId.get(f.id);
        const displayValue =
          coerceValueForDisplay(param, f.dataType) ??
          (resolved?.source === 'site_profile' && resolved.value != null
            ? String(resolved.value)
            : null);
        arr.push({
          id: f.id,
          symbol: f.symbol,
          labelDe: f.labelDe,
          unit: f.unit,
          dataType: f.dataType,
          isRequired: f.isRequired,
          value: displayValue,
          valueSource: resolved?.source ?? null,
          citations: citationsForField(f.id),
          clauseReference: f.clauseReference,
          clientSupplied: param?.clientSupplied === true,
        });
        sectionMap.set(sid, arr);
        // Stage-1: a USED field (required or valued) whose definition is not
        // verified against the standard goes on the dossier's SR-1 list.
        if (
          typeof f.verificationStatus === 'string'
          && blocksVerificationGate(f.verificationStatus)
          && (f.isRequired || displayValue != null)
        ) {
          unverifiedFields.push({
            symbol: f.symbol,
            labelDe: f.labelDe,
            status: f.verificationStatus,
          });
        }
      }

      const wsSections: ReportSection[] = [];
      for (const s of tplSecs) {
        const sFields = sectionMap.get(s.id);
        if (!sFields || sFields.length === 0) continue;
        wsSections.push({
          id: s.id,
          titleDe: s.titleDe,
          orderIndex: s.orderIndex,
          fields: sFields,
        });
      }
      const unsectioned = sectionMap.get('unsectioned');
      if (unsectioned && unsectioned.length > 0) {
        wsSections.push({
          id: 'unsectioned',
          titleDe: 'Allgemein',
          orderIndex: 9999,
          fields: unsectioned,
        });
      }

      // Equations — evaluate each whitelisted one server-side. Same
      // evaluator the browser uses. NEVER returns a number when the
      // engine can't verify — that's the three-state contract.
      const evaluatedEquations: ReportEquation[] = tplEqs.map((eq) => {
        const key = `${tpl.code}:${eq.equationNumber}`;
        // 138 stays on its carrier-free curated subset (the assembler builds no
        // carriers); every other standard routes through the evaluator except
        // the manual deny-set. 138 PDF output is unchanged by generalization.
        const is138 = tpl.code.startsWith('A138-');
        const evaluable =
          shouldEngineEvaluate(tpl.code, eq.equationNumber) &&
          (is138 ? PDF_138_FROZEN_GATE.has(key) : true);
        if (!evaluable) {
          return {
            id: eq.id,
            equationNumber: eq.equationNumber,
            formula: eq.formula,
            formulaLatex: eq.formulaLatex,
            outputSymbol: eq.outputSymbol,
            outputUnit: eq.outputUnit,
            clauseReference: eq.clauseReference,
            evalState: null,
          };
        }
        const inputs = (eq.inputSymbols ?? []).map((sym) => {
          const r = resolvedBySymbol.get(sym);
          const num =
            r && typeof r.value === 'number' && Number.isFinite(r.value) ? r.value : null;
          return { symbol: sym, value: num, unit: r?.unit ?? null };
        });
        const expectedUnits: Record<string, string | null> = {};
        for (const sym of eq.inputSymbols ?? []) {
          const r = resolvedBySymbol.get(sym);
          expectedUnits[sym] = r?.unit ?? null;
        }
        const evalState = evaluateFormula({
          equationId: eq.id,
          formula: eq.formula,
          inputSymbols: eq.inputSymbols ?? [],
          outputSymbol: eq.outputSymbol ?? '',
          expectedUnits,
          inputs,
        });
        return {
          id: eq.id,
          equationNumber: eq.equationNumber,
          formula: eq.formula,
          formulaLatex: eq.formulaLatex,
          outputSymbol: eq.outputSymbol,
          outputUnit: eq.outputUnit,
          clauseReference: eq.clauseReference,
          evalState,
        };
      });

      const evaluatedCompliance: ReportCompliance[] = tplCReqs.map((c) => {
        const gateLookup = (sym: string) => {
          const r = resolvedBySymbol.get(sym);
          if (!r || r.value == null) return undefined;
          return r.value as number | string | boolean;
        };
        const result = evaluateCondition(c.condition, gateLookup);
        // Stage-3: failed gates carry the per-leaf explanation (same AST as
        // the evaluator) so the dossier shows actual · required · wouldPass.
        let explanation: ExplainLeaf[] | undefined;
        if (result.kind === 'fail') {
          const ex = explainCondition(c.condition, gateLookup);
          if (ex.kind === 'explained' && ex.leaves.length > 0) explanation = ex.leaves;
        }
        return {
          id: c.id,
          code: c.code,
          titleDe: c.titleDe,
          condition: c.condition,
          severity: c.severity,
          clauseReference: c.clauseReference,
          result,
          ...(explanation ? { explanation } : {}),
        };
      });

      // -----------------------------------------------------------------------
      // A138-12 manual A_S,m provenance line (Task 10).
      // When the engineer specified A_S,m manually (not derived by the engine),
      // the report must carry one explicit line making this visible to the
      // reviewer. Authoritative discriminator: a_s_m_determination_method === 'manual'.
      // -----------------------------------------------------------------------
      let aSmProvenanceLine: string | null = null;
      if (tpl.code === 'A138-12') {
        const method = resolvedBySymbol.get('a_s_m_determination_method');
        const prov   = resolvedBySymbol.get('a_s_m_provenance');
        if (
          method?.value === 'manual' &&
          typeof prov?.value === 'string' &&
          prov.value.trim() !== ''
        ) {
          aSmProvenanceLine =
            `A_S,m vorgegeben (nicht abgeleitet) — Herkunft: ${prov.value.trim()}`;
        }
      }

      const instance = instanceByTemplateId.get(tpl.id);
      return {
        instanceId: instance?.id ?? null,
        templateId: tpl.id,
        code: tpl.code,
        titleDe: tpl.titleDe,
        status: instance?.status ?? null,
        orderIndex: tpl.orderIndex,
        sections: wsSections,
        equations: evaluatedEquations,
        compliance: evaluatedCompliance,
        unverifiedFields,
        aSmProvenanceLine,
      };
    });

  // ---------------------------------------------------------------------------
  // Citation index — every distinct docId actually referenced by a field in
  // this snapshot.
  // ---------------------------------------------------------------------------
  const seenDocIds = new Set<string>();
  for (const ws of worksheets) {
    for (const sec of ws.sections) {
      for (const f of sec.fields) {
        for (const c of f.citations) seenDocIds.add(c.docId);
      }
    }
  }
  const citationIndex: CitationIndexEntry[] = [];
  for (const docId of seenDocIds) {
    if (docId.startsWith('label:')) {
      const label = docId.slice('label:'.length);
      citationIndex.push({
        docId,
        citationLabel: label,
        title: label,
        kind: null,
        issuedAt: null,
      });
    } else {
      const doc = docById.get(docId);
      if (doc) {
        citationIndex.push({
          docId,
          citationLabel: doc.citationLabel,
          title: doc.title,
          kind: doc.kind,
          issuedAt: doc.issuedAt ? toDate(doc.issuedAt).toISOString() : null,
        });
      }
    }
  }
  citationIndex.sort((a, b) => a.citationLabel.localeCompare(b.citationLabel, 'de'));

  // ---------------------------------------------------------------------------
  // Audit excerpt — flatten approval + audit_log rows into a single timeline.
  // ---------------------------------------------------------------------------
  const auditExcerpt: AuditExcerptEntry[] = [];
  for (const a of approvals) {
    auditExcerpt.push({
      occurredAt: toDate(a.occurredAt).toISOString(),
      actorName: a.actorName ?? null,
      actorRole: a.actorRole,
      action: a.eventType,
      detail: `${a.fromStatus} → ${a.toStatus} · „${a.comment}"`,
      worksheetCode: a.worksheetCode,
    });
  }
  for (const a of audits) {
    let detail: string;
    if (a.changes && typeof a.changes === 'object') {
      const c = a.changes as Record<string, unknown>;
      if ('reason' in c && typeof c.reason === 'string') {
        detail = c.reason;
      } else if ('before' in c || 'after' in c) {
        detail = `${formatAuditValue(c.before)} → ${formatAuditValue(c.after)}`;
      } else {
        detail = JSON.stringify(c).slice(0, 200);
      }
    } else {
      detail = '';
    }
    auditExcerpt.push({
      occurredAt: toDate(a.occurredAt).toISOString(),
      actorName: a.actorName ?? null,
      actorRole: a.actorRole,
      action: a.action,
      detail,
      worksheetCode: null,
    });
  }
  auditExcerpt.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));

  // ---------------------------------------------------------------------------
  // Site profile rows — only include keys that have a value, in the canonical
  // SITE_PROFILE_ENTRIES order.
  // ---------------------------------------------------------------------------
  const siteProfileRows: ReportSiteProfile['rows'] = [];
  if (project.siteProfile) {
    for (const entry of SITE_PROFILE_ENTRIES) {
      const v = project.siteProfile[entry.key];
      if (v == null || v === '') continue;
      siteProfileRows.push({
        key: entry.key,
        labelDe: entry.labelDe,
        value: typeof v === 'object' ? JSON.stringify(v) : String(v),
        unit: entry.unit,
      });
    }
  }

  // Letterhead — we allow it to be missing; the renderer degrades gracefully.
  const letterhead: ReportLetterhead | null = org
    ? {
        orgName: org.name,
        logoUrl: org.logoUrl,
        addressLine1: org.addressLine1,
        addressLine2: org.addressLine2,
        postalCode: org.postalCode,
        city: org.city,
        phone: org.phone,
        email: org.email,
        website: org.website,
      }
    : null;

  return {
    generatedAt: now.toISOString(),
    project: {
      projectId: project.id,
      projectName: project.name,
      projectCode: project.projectCode,
      clientName: project.clientName,
      location: project.location,
      createdAt: toDate(project.createdAt).toISOString(),
      aggregatedStatus: aggregatedStatusFromInstances(instances),
    },
    letterhead,
    standard: {
      id: standard.id,
      code: standard.code,
      titleDe: standard.titleDe,
      version: standard.version,
      supersededBy: standard.supersededBy ?? null,
    },
    siteProfile: { rows: siteProfileRows },
    worksheets,
    citationIndex,
    audit: auditExcerpt,
    approveSnapshots: buildApproveSnapshots(input.snapshots ?? [], instances, templates),
    monitoringEntries: (input.monitoring ?? []).map((m) => ({
      entryDate: toDate(m.entryDate).toISOString().slice(0, 10),
      timeLabel: timeRangeLabel(m.startTime ?? null, m.endTime ?? null),
      category: m.category,
      note: m.note,
      documentTitle: m.documentTitle,
    })),
  };
}

/** Latest approve-snapshot per worksheet (input ordered takenAt DESC; first per instance wins). */
function buildApproveSnapshots(
  snapshots: NonNullable<AssemblerInput['snapshots']>,
  instances: AssemblerInstance[],
  templates: AssemblerTemplate[],
): NonNullable<StandardReportData['approveSnapshots']> {
  const templateIdByInstance = new Map(instances.map((i) => [i.id, i.worksheetTemplateId]));
  const codeByTemplateId = new Map(templates.map((t) => [t.id, t.code]));
  const seen = new Set<string>();
  const out: NonNullable<StandardReportData['approveSnapshots']> = [];
  for (const s of snapshots) {
    if (seen.has(s.worksheetInstanceId)) continue;
    seen.add(s.worksheetInstanceId);
    out.push({
      worksheetCode: codeByTemplateId.get(templateIdByInstance.get(s.worksheetInstanceId) ?? '') ?? '?',
      snapshotId: s.id,
      takenAt: s.takenAt ? toDate(s.takenAt).toISOString() : '',
    });
  }
  return out;
}

// =============================================================================
// Helpers
// =============================================================================
function aggregatedStatusFromInstances(
  instances: Array<{ status: string }>,
): 'draft' | 'submitted' | 'final' {
  if (instances.length === 0) return 'draft';
  const allFinal = instances.every((i) => i.status === 'final' || i.status === 'approved' || i.status === 'engineer_approved');
  if (allFinal) return 'final';
  const hasSubmitted = instances.some(
    (i) => i.status === 'submitted' || i.status === 'submitted_for_review' || i.status === 'in_review',
  );
  if (hasSubmitted) return 'submitted';
  return 'draft';
}

function coerceValueForDisplay(p: AssemblerParameter | undefined, dataType: string): string | null {
  if (!p) return null;
  switch (dataType) {
    case 'number':
      return p.valueNumber == null ? null : String(p.valueNumber);
    case 'text':
      return p.valueText ?? null;
    case 'enum':
      return p.valueEnum ?? null;
    case 'date':
      return p.valueDate ?? null;
    case 'boolean':
      return p.valueBoolean == null ? null : p.valueBoolean ? 'Ja' : 'Nein';
    default:
      return p.valueJson == null ? null : JSON.stringify(p.valueJson);
  }
}

function formatAuditValue(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function groupBy<T, K>(items: T[], key: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = m.get(k) ?? [];
    arr.push(it);
    m.set(k, arr);
  }
  return m;
}
