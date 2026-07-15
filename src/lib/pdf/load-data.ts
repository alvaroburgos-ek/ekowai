import 'server-only';
import { db } from '@/lib/db';
import {
  projects,
  orgs,
  standards,
  projectStandards,
  worksheetTemplates,
  worksheetInstances,
  fields,
  projectParameters,
  approvalEvents,
  profiles,
  equations,
  complianceRequirements,
} from '@/lib/db/schema';
import { and, eq, inArray, desc } from 'drizzle-orm';
import {
  evaluateWorksheetEquations,
  evaluateWorksheetCompliance,
  type EquationReportResult,
  type ComplianceReportResult,
} from '@/lib/eval/evaluate-for-report';
import { isAttestationCondition } from '@/lib/eval/attestation';

export type ReportData = {
  project: {
    id: string;
    name: string;
    projectCode: string | null;
    siteLocation: string | null;
    createdAt: string;
    org: { id: string; name: string; logoUrl: string | null } | null;
  };
  standards: Array<{
    id: string;
    code: string;
    titleDe: string;
    version: string;
    activeSince: string;
  }>;
  worksheets: Array<{
    instanceId: string;
    code: string;
    titleDe: string;
    status: string;
    standardCode: string;
    parameters: Array<{
      symbol: string;
      labelDe: string;
      unit: string | null;
      dataType: string;
      value: string | null;
      sourceType: string;
      enteredAt: string;
    }>;
    /** Per-equation engine results, populated for every engine-evaluated
     * equation on this worksheet (all except the manual deny-set). */
    equations: EquationReportResult[];
    /** Per-row compliance results, parseable conditions evaluated against
     * project parameters + engine outputs. */
    compliance: ComplianceReportResult[];
  }>;
  approvals: Array<{
    occurredAt: string;
    worksheetCode: string;
    eventType: string;
    fromStatus: string;
    toStatus: string;
    actorName: string | null;
    comment: string;
  }>;
};

export async function loadProjectReportData(projectId: string): Promise<ReportData> {
  const [proj] = await db
    .select({
      id: projects.id,
      name: projects.name,
      projectCode: projects.projectCode,
      siteLocation: projects.siteLocation,
      createdAt: projects.createdAt,
      org: {
        id: orgs.id,
        name: orgs.name,
        logoUrl: orgs.logoUrl,
      },
    })
    .from(projects)
    .leftJoin(orgs, eq(orgs.id, projects.orgId))
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!proj) throw new Error(`Project ${projectId} not found`);

  const stds = await db
    .select({
      id: standards.id,
      code: standards.code,
      titleDe: standards.titleDe,
      version: standards.version,
      activeSince: projectStandards.addedAt,
    })
    .from(projectStandards)
    .innerJoin(standards, eq(standards.id, projectStandards.standardId))
    .where(
      and(
        eq(projectStandards.projectId, projectId),
        eq(projectStandards.status, 'active'),
      ),
    )
    .orderBy(standards.code);

  const instances = await db
    .select({
      instanceId: worksheetInstances.id,
      code: worksheetTemplates.code,
      titleDe: worksheetTemplates.titleDe,
      status: worksheetInstances.status,
      standardCode: standards.code,
      templateId: worksheetTemplates.id,
    })
    .from(worksheetInstances)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, worksheetInstances.worksheetTemplateId))
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(eq(worksheetInstances.projectId, projectId));

  const templateIds = instances.map((i) => i.templateId);
  const allFields = templateIds.length === 0 ? [] : await db
    .select({
      id: fields.id,
      worksheetTemplateId: fields.worksheetTemplateId,
      symbol: fields.symbol,
      labelDe: fields.labelDe,
      unit: fields.unit,
      dataType: fields.dataType,
    })
    .from(fields)
    .where(inArray(fields.worksheetTemplateId, templateIds));

  // Equations + compliance per template, batched in one query each.
  const allEquations = templateIds.length === 0 ? [] : await db
    .select({
      id: equations.id,
      worksheetTemplateId: equations.worksheetTemplateId,
      equationNumber: equations.equationNumber,
      formula: equations.formula,
      inputSymbols: equations.inputSymbols,
      outputSymbol: equations.outputSymbol,
      outputUnit: equations.outputUnit,
    })
    .from(equations)
    .where(inArray(equations.worksheetTemplateId, templateIds));

  const allCompliance = templateIds.length === 0 ? [] : await db
    .select({
      id: complianceRequirements.id,
      worksheetTemplateId: complianceRequirements.worksheetTemplateId,
      code: complianceRequirements.code,
      titleDe: complianceRequirements.titleDe,
      condition: complianceRequirements.condition,
      severity: complianceRequirements.severity,
      description: complianceRequirements.description,
    })
    .from(complianceRequirements)
    .where(inArray(complianceRequirements.worksheetTemplateId, templateIds));

  const equationsByTemplateId = new Map<string, typeof allEquations>();
  for (const e of allEquations) {
    const arr = equationsByTemplateId.get(e.worksheetTemplateId) ?? [];
    arr.push(e);
    equationsByTemplateId.set(e.worksheetTemplateId, arr);
  }
  const complianceByTemplateId = new Map<string, typeof allCompliance>();
  for (const c of allCompliance) {
    const arr = complianceByTemplateId.get(c.worksheetTemplateId) ?? [];
    arr.push(c);
    complianceByTemplateId.set(c.worksheetTemplateId, arr);
  }

  // Fix 2: scope params query to only the fields we actually need (no orphans)
  // Fix 7: group fields by templateId once (O(n)) instead of filtering per instance (O(n*m))
  const allFieldIds = allFields.map((f) => f.id);
  const params = allFieldIds.length === 0 ? [] : await db
    .select()
    .from(projectParameters)
    .where(
      and(
        eq(projectParameters.projectId, projectId),
        inArray(projectParameters.fieldId, allFieldIds),
      ),
    );
  const paramsByFieldId = new Map(params.map((p) => [p.fieldId, p]));

  // Pre-group fields by templateId for O(1) lookup per instance
  const fieldsByTemplateId = new Map<string, typeof allFields>();
  for (const f of allFields) {
    const arr = fieldsByTemplateId.get(f.worksheetTemplateId) ?? [];
    arr.push(f);
    fieldsByTemplateId.set(f.worksheetTemplateId, arr);
  }

  const worksheets = instances.map((inst) => {
    const tmplFields = fieldsByTemplateId.get(inst.templateId) ?? [];
    const parameters = tmplFields.map((f) => {
      const p = paramsByFieldId.get(f.id);
      const value = !p
        ? null
        : f.dataType === 'number' ? (p.valueNumber == null ? null : String(p.valueNumber))
        : f.dataType === 'text' ? p.valueText
        : f.dataType === 'enum' ? p.valueEnum
        : f.dataType === 'date' ? p.valueDate
        : f.dataType === 'boolean' ? (p.valueBoolean == null ? null : (p.valueBoolean ? 'Ja' : 'Nein'))
        : p.valueJson == null ? null : JSON.stringify(p.valueJson);
      return {
        symbol: f.symbol,
        labelDe: f.labelDe,
        unit: f.unit,
        dataType: f.dataType,
        value,
        sourceType: p?.sourceType ?? 'entered',
        enteredAt: p?.enteredAt.toISOString() ?? '',
      };
    });

    // Server-side evaluation: same evaluator primitives the form uses.
    const tmplEquations = equationsByTemplateId.get(inst.templateId) ?? [];
    const tmplCompliance = complianceByTemplateId.get(inst.templateId) ?? [];
    const tmplParameters = tmplFields
      .map((f) => paramsByFieldId.get(f.id))
      .filter((p): p is NonNullable<typeof p> => p != null)
      .map((p) => ({
        fieldId: p.fieldId,
        // valueNumber is stored as Postgres numeric → drizzle returns string.
        // Parse here so the evaluator's `pickNum` sees a number.
        valueNumber: p.valueNumber == null ? null : Number(p.valueNumber),
        valueText: p.valueText,
        valueEnum: p.valueEnum,
        valueBoolean: p.valueBoolean,
        valueDate: p.valueDate,
        valueJson: p.valueJson,
      }));

    const equationResults = evaluateWorksheetEquations(
      inst.code,
      tmplEquations.map((e) => ({
        id: e.id,
        equationNumber: e.equationNumber,
        formula: e.formula,
        inputSymbols: e.inputSymbols,
        outputSymbol: e.outputSymbol,
        outputUnit: e.outputUnit,
      })),
      tmplFields,
      tmplParameters,
    );

    const complianceResults = evaluateWorksheetCompliance(
      inst.code,
      tmplCompliance.map((c) => ({
        id: c.id,
        code: c.code,
        titleDe: c.titleDe,
        condition: c.condition,
        severity: c.severity,
        description: c.description,
        // Until Pile-11 SQL is applied AND populated, derive from condition
        // string pattern. Code path will prefer the DB column once available
        // (see attestation.ts and the Pile-11 SQL comment).
        requiresAttestation: isAttestationCondition(c.condition),
      })),
      tmplFields,
      tmplParameters,
      equationResults,
    );

    return {
      instanceId: inst.instanceId,
      code: inst.code,
      titleDe: inst.titleDe,
      status: inst.status,
      standardCode: inst.standardCode,
      parameters,
      equations: equationResults,
      compliance: complianceResults,
    };
  });

  const approvalRows = await db
    .select({
      occurredAt: approvalEvents.occurredAt,
      eventType: approvalEvents.eventType,
      fromStatus: approvalEvents.fromStatus,
      toStatus: approvalEvents.toStatus,
      comment: approvalEvents.comment,
      worksheetCode: worksheetTemplates.code,
      actorName: profiles.fullName,
    })
    .from(approvalEvents)
    .innerJoin(worksheetInstances, eq(worksheetInstances.id, approvalEvents.worksheetInstanceId))
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, worksheetInstances.worksheetTemplateId))
    .leftJoin(profiles, eq(profiles.id, approvalEvents.actorId))
    .where(eq(worksheetInstances.projectId, projectId))
    .orderBy(desc(approvalEvents.occurredAt));

  return {
    project: {
      id: proj.id,
      name: proj.name,
      projectCode: proj.projectCode,
      siteLocation: proj.siteLocation,
      createdAt: proj.createdAt.toISOString(),
      org: proj.org && proj.org.id ? (proj.org as { id: string; name: string; logoUrl: string | null }) : null,
    },
    standards: stds.map((s) => ({
      id: s.id,
      code: s.code,
      titleDe: s.titleDe,
      version: s.version,
      activeSince: s.activeSince.toISOString(),
    })),
    worksheets,
    approvals: approvalRows.map((a) => ({
      occurredAt: a.occurredAt.toISOString(),
      worksheetCode: a.worksheetCode,
      eventType: a.eventType,
      fromStatus: a.fromStatus,
      toStatus: a.toStatus,
      actorName: a.actorName ?? null,
      comment: a.comment,
    })),
  };
}

export async function loadCalculationData(_calcId: string): Promise<ReportData> {
  throw new Error('loadCalculationData is no longer supported — use loadProjectReportData');
}
