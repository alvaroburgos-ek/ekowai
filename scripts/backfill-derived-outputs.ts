/**
 * Backfill engine-derived outputs into project_parameters (§C1).
 *
 * The save-time fix (`persistDerivedOutputs` in src/lib/actions/worksheet.ts)
 * materialises derived scalars on the NEXT save of each worksheet. Existing
 * projects still carry the old state — e.g. A138-07 `A_C_preliminary` with a
 * NULL value_number, A138-10 `Q_zu` with no row at all — until re-saved. This
 * one-off script materialises them for EVERY existing worksheet instance using
 * the exact same pure evaluator (`materializeDerivedOutputs`), so downstream
 * consumers resolve real values immediately.
 *
 * Safety:
 *   - DRY-RUN BY DEFAULT. Prints what it WOULD write. Pass --apply to write.
 *   - Writes only OWN number fields that are non-displayOnly engine outputs,
 *     source_type='derived'. Never touches engineer-entered atomic inputs.
 *   - Idempotent: re-runs only rewrite rows whose value actually changed.
 *   - Resolves a processing order so a worksheet is materialised AFTER the
 *     worksheets it inherits from within the same standard (best-effort by
 *     worksheet code) so cross-worksheet scalar chains settle in one pass.
 *
 * Usage (needs DATABASE_URL in .env.local pointing at the target DB):
 *   pnpm tsx scripts/backfill-derived-outputs.ts            # dry-run
 *   pnpm tsx scripts/backfill-derived-outputs.ts --apply    # write
 *   pnpm tsx scripts/backfill-derived-outputs.ts --apply --project <uuid>
 */
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, inArray, sql } from 'drizzle-orm';
import {
  fields,
  equations,
  worksheetTemplates,
  worksheetInstances,
  projectParameters,
  projects,
  auditLog,
} from '../src/lib/db/schema';
import {
  materializeDerivedOutputs,
  type ReportEquation,
  type ReportField,
  type ReportParameter,
} from '../src/lib/eval/evaluate-for-report';

// Self-contained DB client (mirrors src/lib/db) so the script doesn't pull the
// Next-only `@/env` validation at import time and works under plain tsx.
loadEnv({ path: '.env.local' });
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set in .env.local');
  process.exit(1);
}
const db = drizzle(postgres(DATABASE_URL, { prepare: false }), {
  schema: { fields, equations, worksheetTemplates, worksheetInstances, projectParameters, projects, auditLog },
});

const APPLY = process.argv.includes('--apply');
const projectFlagIdx = process.argv.indexOf('--project');
const ONLY_PROJECT = projectFlagIdx >= 0 ? process.argv[projectFlagIdx + 1] : null;

type Row = { fieldId: string; symbol: string; ws: string; before: number | null; after: number | null };

async function main() {
  console.log(`\n=== backfill-derived-outputs — ${APPLY ? 'APPLY (writing)' : 'DRY-RUN'} ===`);
  if (ONLY_PROJECT) console.log(`scoped to project ${ONLY_PROJECT}`);

  const instanceRows = await db
    .select({
      id: worksheetInstances.id,
      projectId: worksheetInstances.projectId,
      templateId: worksheetInstances.worksheetTemplateId,
      code: worksheetTemplates.code,
      standardId: worksheetTemplates.standardId,
    })
    .from(worksheetInstances)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, worksheetInstances.worksheetTemplateId))
    .where(ONLY_PROJECT ? eq(worksheetInstances.projectId, ONLY_PROJECT) : sql`true`);

  // Process instances ordered by worksheet code so producers settle before
  // consumers within a project (best-effort; the save-time path + a second run
  // close any residual cross-worksheet gap).
  instanceRows.sort((a, b) => a.code.localeCompare(b.code));

  // entered_by for derived rows: the owning project's creator.
  const projRows = await db.select({ id: projects.id, createdBy: projects.createdBy }).from(projects);
  const createdByProject = new Map(projRows.map((p) => [p.id, p.createdBy]));

  let totalWrites = 0;
  let touchedInstances = 0;
  const sample: Row[] = [];

  for (const inst of instanceRows) {
    const [ownFields, eqRows, inherited] = await Promise.all([
      db
        .select({ id: fields.id, symbol: fields.symbol, unit: fields.unit, dataType: fields.dataType })
        .from(fields)
        .where(and(eq(fields.worksheetTemplateId, inst.templateId), eq(fields.active, true))),
      db.select().from(equations).where(eq(equations.worksheetTemplateId, inst.templateId)),
      // inherited fields (same query shape as loadInheritedFields, inline so we
      // don't import the server-only query module into a plain node script)
      db
        .select({ id: fields.id, symbol: fields.symbol, unit: fields.unit, dataType: fields.dataType })
        .from(fields)
        .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
        .where(
          and(
            eq(worksheetTemplates.standardId, inst.standardId),
            sql`${inst.code} = ANY(${fields.consumerWorksheets})`,
            sql`${fields.worksheetTemplateId} <> ${inst.templateId}`,
            eq(fields.active, true),
          ),
        ),
    ]);

    const ownNumberFieldIds = new Set(ownFields.filter((f) => f.dataType === 'number').map((f) => f.id));
    if (ownNumberFieldIds.size === 0 || eqRows.length === 0) continue;

    const reportFields: ReportField[] = [...ownFields, ...inherited].map((f) => ({
      id: f.id,
      symbol: f.symbol,
      unit: f.unit,
      dataType: f.dataType,
    }));
    const reportEquations: ReportEquation[] = eqRows.map((e) => ({
      id: e.id,
      equationNumber: e.equationNumber,
      formula: e.formula,
      inputSymbols: e.inputSymbols,
      outputSymbol: e.outputSymbol,
      outputUnit: e.outputUnit,
    }));

    const allFieldIds = reportFields.map((f) => f.id);
    const existing = await db
      .select()
      .from(projectParameters)
      .where(and(eq(projectParameters.projectId, inst.projectId), inArray(projectParameters.fieldId, allFieldIds)));
    const existingByField = new Map(existing.map((p) => [p.fieldId, p]));

    const reportParams: ReportParameter[] = existing.map((p) => ({
      fieldId: p.fieldId,
      valueNumber: p.valueNumber == null ? null : Number(p.valueNumber),
      valueText: p.valueText,
      valueEnum: p.valueEnum,
      valueBoolean: p.valueBoolean,
      valueDate: p.valueDate,
      valueJson: p.valueJson,
    }));

    const derived = materializeDerivedOutputs(inst.code, reportEquations, reportFields, reportParams, ownNumberFieldIds);

    const symbolByFieldId = new Map(ownFields.map((f) => [f.id, f.symbol]));
    const toWrite = derived.filter((d) => {
      const cur = existingByField.get(d.fieldId);
      const curNum = cur?.valueNumber == null ? null : Number(cur.valueNumber);
      // not computable → only clear a row WE derived; never null out an
      // engineer-entered / manual value.
      if (d.valueNumber === null) {
        return cur != null && cur.sourceType === 'derived' && curNum !== null;
      }
      return curNum !== d.valueNumber || (cur != null && cur.sourceType !== 'derived');
    });
    if (toWrite.length === 0) continue;

    touchedInstances++;
    totalWrites += toWrite.length;
    for (const d of toWrite) {
      const cur = existingByField.get(d.fieldId);
      if (sample.length < 40) {
        sample.push({
          fieldId: d.fieldId,
          symbol: symbolByFieldId.get(d.fieldId) ?? '?',
          ws: inst.code,
          before: cur?.valueNumber == null ? null : Number(cur.valueNumber),
          after: d.valueNumber,
        });
      }
    }

    if (APPLY) {
      const enteredBy = createdByProject.get(inst.projectId);
      if (!enteredBy) {
        console.warn(`  ! ${inst.code} (${inst.projectId}): no project creator — skipped`);
        continue;
      }
      await db.transaction(async (tx) => {
        await tx
          .insert(projectParameters)
          .values(
            toWrite.map((d) => ({
              projectId: inst.projectId,
              fieldId: d.fieldId,
              sourceWorksheetInstanceId: inst.id,
              sourceType: 'derived',
              enteredBy,
              valueNumber: d.valueNumber == null ? null : String(d.valueNumber),
              valueText: null,
              valueEnum: null,
              valueDate: null,
              valueBoolean: null,
              valueJson: null,
            })),
          )
          .onConflictDoUpdate({
            target: [projectParameters.projectId, projectParameters.fieldId],
            set: {
              valueNumber: sql`excluded.value_number`,
              sourceType: sql`excluded.source_type`,
              sourceWorksheetInstanceId: sql`excluded.source_worksheet_instance_id`,
              enteredBy: sql`excluded.entered_by`,
              enteredAt: new Date(),
            },
          });
        await tx.insert(auditLog).values(
          toWrite.map((d) => ({
            actorId: enteredBy,
            actorRole: 'system',
            projectId: inst.projectId,
            tableName: 'project_parameters',
            recordId: d.fieldId,
            action: 'derive_backfill',
            changes: { fieldId: d.fieldId, derivedValue: d.valueNumber },
          })),
        );
      });
    }
  }

  console.log(`\nInstances with changes: ${touchedInstances}`);
  console.log(`Rows ${APPLY ? 'written' : 'that WOULD be written'}: ${totalWrites}`);
  if (sample.length) {
    console.log(`\nSample (up to 40):`);
    for (const s of sample) {
      console.log(`  ${s.ws}  ${s.symbol}: ${s.before ?? 'NULL'} → ${s.after ?? 'NULL'}`);
    }
  }
  if (!APPLY && totalWrites > 0) {
    console.log(`\nDRY-RUN only. Re-run with --apply to write these rows.`);
  }
  console.log('');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
