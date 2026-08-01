import 'server-only';
import { db } from '@/lib/db';
import {
  projects,
  standards,
  worksheetTemplates,
  worksheetInstances,
  fields,
  projectParameters,
  calculationSnapshots,
} from '@/lib/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';

/**
 * Title-block number formatting: de-DE, up to 6 significant digits so
 * kf-scale values (5·10⁻⁴) survive — the report-wide fmtDe caps at 2
 * fraction digits, which would render 0,0005 as 0,00.
 */
function fmtValue(n: number): string {
  if (n !== 0 && (Math.abs(n) < 1e-6 || Math.abs(n) >= 1e9)) return n.toExponential(3).replace('.', ',');
  return new Intl.NumberFormat('de-DE', { maximumSignificantDigits: 6 }).format(n);
}

/**
 * Wertetabelle (Stage 4): the compact value table for the CAD title block —
 * every field of the standard that carries a saved value, with unit + source
 * clause, footer-stamped with the latest approve-snapshot id so the drawing
 * references a reproducible calculation state.
 */

export type ValuetableRow = {
  worksheetCode: string;
  symbol: string;
  labelDe: string;
  value: string;
  unit: string | null;
  clauseReference: string | null;
};

type FieldRow = {
  id: string;
  symbol: string;
  labelDe: string;
  unit: string | null;
  clauseReference: string | null;
  dataType: string;
  orderIndex: number;
  worksheetCode: string;
};

type ParamValues = {
  valueNumber: unknown;
  valueText: string | null;
  valueEnum: string | null;
  valueBoolean: boolean | null;
  valueDate: string | null;
  valueJson: unknown;
};

/** Pure row builder — unit-tested without a DB. JSON carriers are skipped. */
export function buildValuetableRows(
  fieldRows: FieldRow[],
  paramsByFieldId: Map<string, ParamValues>,
): ValuetableRow[] {
  const rows: ValuetableRow[] = [];
  const sorted = [...fieldRows].sort(
    (a, b) => a.worksheetCode.localeCompare(b.worksheetCode) || a.orderIndex - b.orderIndex,
  );
  for (const f of sorted) {
    const p = paramsByFieldId.get(f.id);
    if (!p) continue;
    let value: string | null = null;
    switch (f.dataType) {
      case 'number':
        if (p.valueNumber != null) value = fmtValue(Number(p.valueNumber));
        break;
      case 'text':
        if (p.valueText != null && p.valueText !== '') value = p.valueText;
        break;
      case 'enum':
        if (p.valueEnum != null && p.valueEnum !== '') value = p.valueEnum;
        break;
      case 'boolean':
        if (p.valueBoolean != null) value = p.valueBoolean ? 'ja' : 'nein';
        break;
      case 'date':
        if (p.valueDate != null) value = p.valueDate;
        break;
      // json: structured carriers are not title-block values — skipped.
    }
    if (value === null) continue;
    rows.push({
      worksheetCode: f.worksheetCode,
      symbol: f.symbol,
      labelDe: f.labelDe,
      value,
      unit: f.unit,
      clauseReference: f.clauseReference,
    });
  }
  return rows;
}

export type ValuetableData = {
  project: { id: string; name: string; projectCode: string | null };
  standard: { code: string; titleDe: string; version: string };
  rows: ValuetableRow[];
  /** Latest approve-snapshot id across the standard's worksheets (footer stamp). */
  snapshotId: string | null;
  snapshotTakenAt: string | null;
  generatedAt: string;
};

export async function loadValuetableData(
  projectId: string,
  standardCode: string,
): Promise<ValuetableData> {
  const [proj] = await db
    .select({ id: projects.id, name: projects.name, projectCode: projects.projectCode })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!proj) throw new Error(`Project ${projectId} not found`);

  const [std] = await db
    .select()
    .from(standards)
    .where(eq(standards.code, standardCode))
    .limit(1);
  if (!std) throw new Error(`Standard ${standardCode} not found`);

  const templates = await db
    .select({ id: worksheetTemplates.id, code: worksheetTemplates.code })
    .from(worksheetTemplates)
    .where(eq(worksheetTemplates.standardId, std.id));
  const codeByTemplate = new Map(templates.map((t) => [t.id, t.code]));
  const templateIds = templates.map((t) => t.id);

  const fieldRows = templateIds.length === 0
    ? []
    : await db
      .select({
        id: fields.id,
        symbol: fields.symbol,
        labelDe: fields.labelDe,
        unit: fields.unit,
        clauseReference: fields.clauseReference,
        dataType: fields.dataType,
        orderIndex: fields.orderIndex,
        worksheetTemplateId: fields.worksheetTemplateId,
      })
      .from(fields)
      .where(and(inArray(fields.worksheetTemplateId, templateIds), eq(fields.active, true)));

  const fieldIds = fieldRows.map((f) => f.id);
  const params = fieldIds.length === 0
    ? []
    : await db
      .select()
      .from(projectParameters)
      .where(
        and(
          eq(projectParameters.projectId, projectId),
          inArray(projectParameters.fieldId, fieldIds),
        ),
      );
  const paramsByFieldId = new Map(params.map((p) => [p.fieldId, p as ParamValues & { fieldId: string }]));

  const rows = buildValuetableRows(
    fieldRows.map((f) => ({
      id: f.id,
      symbol: f.symbol,
      labelDe: f.labelDe,
      unit: f.unit,
      clauseReference: f.clauseReference,
      dataType: f.dataType,
      orderIndex: f.orderIndex,
      worksheetCode: codeByTemplate.get(f.worksheetTemplateId) ?? '?',
    })),
    paramsByFieldId,
  );

  // Footer stamp: the snapshot id may only be printed when EVERY worksheet of
  // the standard is approved/final — otherwise draft values would carry an
  // approve-stamp they are not bound to (review finding #3). Any non-approved
  // instance (or a template with no instance) ⇒ honest "Arbeitsstand" notice.
  const instances = templateIds.length === 0
    ? []
    : await db
      .select({ id: worksheetInstances.id, status: worksheetInstances.status })
      .from(worksheetInstances)
      .where(
        and(
          eq(worksheetInstances.projectId, projectId),
          inArray(worksheetInstances.worksheetTemplateId, templateIds),
        ),
      );
  const allApproved =
    instances.length === templates.length
    && instances.every((i) => i.status === 'engineer_approved' || i.status === 'final');
  const instanceIds = allApproved ? instances.map((i) => i.id) : [];
  const [snap] = instanceIds.length === 0
    ? []
    : await db
      .select({ id: calculationSnapshots.id, takenAt: calculationSnapshots.takenAt })
      .from(calculationSnapshots)
      .where(
        and(
          inArray(calculationSnapshots.worksheetInstanceId, instanceIds),
          eq(calculationSnapshots.trigger, 'approve'),
        ),
      )
      .orderBy(desc(calculationSnapshots.takenAt))
      .limit(1);

  return {
    project: proj,
    standard: { code: std.code, titleDe: std.titleDe, version: std.version },
    rows,
    snapshotId: snap?.id ?? null,
    snapshotTakenAt: snap?.takenAt ? snap.takenAt.toISOString() : null,
    generatedAt: new Date().toISOString(),
  };
}
