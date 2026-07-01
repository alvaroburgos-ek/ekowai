'use server';
import { db } from '@/lib/db';
import {
  worksheetInstances,
  projectParameters,
  fields,
  auditLog,
  equations,
} from '@/lib/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { resolveProjectAccess, assertInternal, AccessDeniedError } from '@/lib/auth/project-access';
import { materializeSurfaceOutputs } from '@/lib/eval/materialize-surfaces';
import { SURFACE_DERIVED_SYMBOLS } from '@/lib/eval/surface-source-state';
import { derivedOutputSymbols } from '@/lib/eval/derived-output-symbols';
import { isWorksheetEditable, type WorksheetStatus } from '@/lib/state-machine';
import { materializeBasinGoverning } from '@/lib/eval/materialize-basin-governing';
import { facilityReturnPeriod } from '@/lib/eval/rainfall-tables';
import { BASIN_GL8_EQUATION_ID } from '@/lib/eval/governing-duration';

/** Symbols the basin Gl.8 governing-iteration produces and persists.
 * These map to field symbols on the A138-13 worksheet template (same-symbol
 * consolidation: A138-10 inherits them as its r_D_n/D_min inputs). */
const BASIN_GOVERNING_SYMBOLS = ['r_D_n', 'D_min'] as const;

/** The six scalar symbols A138-13 Gl.8 reads from other worksheets. */
const BASIN_SCALAR_SYMBOLS = ['A_C', 'A_VA', 'Q_S', 'Q_Dr', 'f_Z', 'f_A'] as const;

/** All symbols that need to be resolved from project_parameters for basin
 * governing materialisation (scalars + return-period resolution). */
const BASIN_LOOKUP_SYMBOLS = [...BASIN_SCALAR_SYMBOLS, 'n', 'T_n', 'rainfall_table_ref'] as const;

type FieldValue =
  | { type: 'number'; value: number | null }
  | { type: 'text'; value: string | null }
  | { type: 'enum'; value: string | null }
  | { type: 'date'; value: string | null }
  | { type: 'boolean'; value: boolean | null }
  | { type: 'json'; value: unknown };

export type SaveWorksheetInput = {
  instanceId: string;
  values: Record<string, FieldValue>;   // by field_id
};

export type SaveWorksheetResult =
  | { ok: true; saved: number; warnings: string[] }
  | { ok: false; error: string };

/** Save user-entered values for a worksheet instance.
 * - Auth: user must be a member of the owning project's org. Verified by an
 *   app-level join — `db` uses the postgres role and bypasses RLS.
 * - For each changed field: UPSERT project_parameters + INSERT audit_log.
 * - All in one transaction.
 */
export async function saveWorksheet(
  input: SaveWorksheetInput,
): Promise<SaveWorksheetResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Not authenticated' };
  const userId = auth.user.id;

  // Load the instance, then verify access via the shared guard. `db` uses the
  // postgres role and bypasses RLS, so this app-level check is the real boundary:
  // only internal org members may write. External collaborators are rejected here.
  const [instance] = await db
    .select({
      id: worksheetInstances.id,
      projectId: worksheetInstances.projectId,
      worksheetTemplateId: worksheetInstances.worksheetTemplateId,
      status: worksheetInstances.status,
    })
    .from(worksheetInstances)
    .where(eq(worksheetInstances.id, input.instanceId))
    .limit(1);
  if (!instance) return { ok: false, error: 'Worksheet not found or no access' };

  try {
    assertInternal(await resolveProjectAccess(userId, instance.projectId));
  } catch (e) {
    if (e instanceof AccessDeniedError) return { ok: false, error: 'Worksheet not found or no access' };
    throw e;
  }

  // Post-approval write-lock: a worksheet's data is immutable once approved/final
  // (or deactivated). Editing requires an explicit reopen → draft first. This is
  // the integrity boundary — the UI lock is only UX.
  if (!isWorksheetEditable(instance.status as WorksheetStatus)) {
    return { ok: false, error: 'Arbeitsblatt ist genehmigt/final und schreibgeschützt — zum Bearbeiten zuerst „Wieder öffnen".' };
  }

  const fieldIds = Object.keys(input.values);
  if (fieldIds.length === 0) {
    return { ok: true, saved: 0, warnings: [] };
  }

  // Load field metadata — restrict to fields belonging to this instance's
  // worksheet template so callers cannot write values for fields of a
  // different template within the same project.
  const fieldMetas = await db
    .select({ id: fields.id, dataType: fields.dataType, symbol: fields.symbol })
    .from(fields)
    .where(
      and(
        inArray(fields.id, fieldIds),
        eq(fields.worksheetTemplateId, instance.worksheetTemplateId),
      ),
    );
  const dataTypeById = new Map(fieldMetas.map((f) => [f.id, f.dataType]));
  const symbolById = new Map(fieldMetas.map((f) => [f.id, f.symbol]));

  // Single-source integrity: a value this worksheet's equations PRODUCE must be
  // persisted as `derived`, never as an engineer `entered` input — even when it
  // arrives via the client engine's write-back auto-save rather than the
  // surface-materialization path below. Compute the produced-symbol set from the
  // template's equations (displayOnly outputs stay `entered` — they're engineer
  // iteration variables). See @/lib/eval/derived-output-symbols.
  const templateEquations = await db
    .select({ id: equations.id, outputSymbol: equations.outputSymbol })
    .from(equations)
    .where(eq(equations.worksheetTemplateId, instance.worksheetTemplateId));
  const derivedSymbols = derivedOutputSymbols(templateEquations);

  // Load existing parameters for diff
  const existing = await db
    .select()
    .from(projectParameters)
    .where(
      and(
        eq(projectParameters.projectId, instance.projectId),
        inArray(projectParameters.fieldId, fieldIds),
      ),
    );
  const existingById = new Map(existing.map((p) => [p.fieldId, p]));

  const warnings: string[] = [];

  // Build batched arrays — validated rows only
  type ParameterRow = {
    projectId: string;
    fieldId: string;
    sourceWorksheetInstanceId: string;
    sourceType: string;
    enteredBy: string;
    valueNumber: string | null;
    valueText: string | null;
    valueEnum: string | null;
    valueDate: string | null;
    valueBoolean: boolean | null;
    valueJson: unknown;
  };
  type AuditRow = {
    actorId: string;
    actorRole: string;
    projectId: string;
    tableName: string;
    recordId: string;
    action: string;
    changes: object;
  };

  const parameterValues: ParameterRow[] = [];
  const auditValues: AuditRow[] = [];

  for (const fieldId of fieldIds) {
    const expectedType = dataTypeById.get(fieldId);
    const incoming = input.values[fieldId];
    if (!expectedType) {
      warnings.push(`Field ${fieldId} not found — skipped`);
      continue;
    }
    if (expectedType !== incoming.type) {
      warnings.push(
        `Field ${fieldId} expected ${expectedType} but got ${incoming.type} — skipped`,
      );
      continue;
    }

    const valueColumns: {
      valueNumber: string | null;
      valueText: string | null;
      valueEnum: string | null;
      valueDate: string | null;
      valueBoolean: boolean | null;
      valueJson: unknown;
    } = {
      valueNumber: null,
      valueText: null,
      valueEnum: null,
      valueDate: null,
      valueBoolean: null,
      valueJson: null,
    };
    switch (incoming.type) {
      case 'number':
        valueColumns.valueNumber = incoming.value == null ? null : String(incoming.value);
        break;
      case 'text':
        valueColumns.valueText = incoming.value;
        break;
      case 'enum':
        valueColumns.valueEnum = incoming.value;
        break;
      case 'date':
        valueColumns.valueDate = incoming.value;
        break;
      case 'boolean':
        valueColumns.valueBoolean = incoming.value;
        break;
      case 'json':
        valueColumns.valueJson = incoming.value;
        break;
    }

    const prev = existingById.get(fieldId);
    const action = prev ? 'update' : 'insert';

    // A value the worksheet's own equations produce is `derived`, not an
    // engineer `entered` input — so an engine write-back can never masquerade
    // as a hand-entered value (single-source invariant).
    const symbol = symbolById.get(fieldId);
    const sourceType = symbol != null && derivedSymbols.has(symbol) ? 'derived' : 'entered';

    parameterValues.push({
      projectId: instance.projectId,
      fieldId,
      sourceWorksheetInstanceId: instance.id,
      sourceType,
      enteredBy: userId,
      ...valueColumns,
    });

    auditValues.push({
      actorId: userId,
      actorRole: 'engineer',
      projectId: instance.projectId,
      tableName: 'project_parameters',
      recordId: fieldId,
      action,
      changes: {
        fieldId,
        before: prev ? extractValue(prev, expectedType) : null,
        after: incoming.value,
      },
    });
  }

  const savedCount = parameterValues.length;

  if (savedCount > 0) {
    await db.transaction(async (tx) => {
      // Single timestamp for the entire save — all rows written in this call
      // share the same enteredAt so there is no skew from multiple new Date() calls.
      const now = new Date();

      // ONE batched upsert for all parameter rows
      await tx
        .insert(projectParameters)
        .values(parameterValues)
        .onConflictDoUpdate({
          target: [projectParameters.projectId, projectParameters.fieldId],
          set: {
            valueNumber: sql`excluded.value_number`,
            valueText: sql`excluded.value_text`,
            valueEnum: sql`excluded.value_enum`,
            valueDate: sql`excluded.value_date`,
            valueBoolean: sql`excluded.value_boolean`,
            valueJson: sql`excluded.value_json`,
            sourceType: sql`excluded.source_type`,
            sourceWorksheetInstanceId: sql`excluded.source_worksheet_instance_id`,
            enteredBy: sql`excluded.entered_by`,
            enteredAt: now,
          },
        });

      // Materialize derived surface outputs when A138-07's surface_inventory was saved.
      // Runs inside the same transaction so derived rows are always consistent with
      // the entered carrier value.
      //
      // Optimization: first do a cheap indexed lookup — only if the saved batch
      // actually contains a surface_inventory field for this template do we proceed
      // to the full sibling-fields query + materialization.
      const [surfacePresence] = await tx
        .select({ id: fields.id })
        .from(fields)
        .where(
          and(
            inArray(fields.id, fieldIds),
            eq(fields.symbol, 'surface_inventory'),
            eq(fields.worksheetTemplateId, instance.worksheetTemplateId),
          ),
        )
        .limit(1);

      if (surfacePresence) {
        const surfaceFieldId = surfacePresence.id;
        const wsFields = await tx
          .select({ id: fields.id, symbol: fields.symbol })
          .from(fields)
          .where(and(eq(fields.worksheetTemplateId, instance.worksheetTemplateId), eq(fields.active, true)));
        const carrier = input.values[surfaceFieldId]?.type === 'json' ? input.values[surfaceFieldId].value : null;
        const outputs = materializeSurfaceOutputs(carrier);
        const idBySymbol = new Map(wsFields.map((f) => [f.symbol, f.id]));
        const derivedRows = (SURFACE_DERIVED_SYMBOLS as readonly string[])
          .map((sym) => ({ sym, fieldId: idBySymbol.get(sym) }))
          .filter((x): x is { sym: string; fieldId: string } => x.fieldId != null)
          .map((x) => ({
            projectId: instance.projectId,
            fieldId: x.fieldId,
            valueNumber: outputs[x.sym as keyof typeof outputs] == null ? null : String(outputs[x.sym as keyof typeof outputs]),
            sourceType: 'derived' as const,
            enteredBy: userId,
            enteredAt: now,
          }));
        if (derivedRows.length > 0) {
          await tx.insert(projectParameters).values(derivedRows).onConflictDoUpdate({
            target: [projectParameters.projectId, projectParameters.fieldId],
            set: {
              valueNumber: sql`excluded.value_number`,
              sourceType: sql`excluded.source_type`,
              enteredBy: sql`excluded.entered_by`,
              enteredAt: now,
            },
          });
        }
      }

      // Materialize basin governing outputs (r_D_n, D_min) whenever this save
      // targets the basin worksheet (A138-13). Persisted as derived rows so
      // A138-10 inherits them via same-symbol consolidation without re-running
      // the governing-duration iteration (single-producer rule).
      //
      // Detection: the saved template owns the basin Gl.8 equation. We already
      // loaded `templateEquations` for this template above (line ~119). This
      // is topology-stable: the equation lives on A138-13 regardless of which
      // fields are in the current save batch — so any A138-13 save triggers a
      // recompute. (Previously the gate was on r_D_n_table being in the save
      // batch, but that carrier moved to A138-04, making the block dead.)
      const isBasinSave = templateEquations.some((e) => e.id === BASIN_GL8_EQUATION_ID);

      if (isBasinSave) {
        // 1. Gather sibling fields for this template (to resolve output field ids +
        //    to pick scalar values from the saved batch).
        const basinWsFields = await tx
          .select({ id: fields.id, symbol: fields.symbol, dataType: fields.dataType })
          .from(fields)
          .where(and(eq(fields.worksheetTemplateId, instance.worksheetTemplateId), eq(fields.active, true)));
        const basinIdBySymbol = new Map(basinWsFields.map((f) => [f.symbol, f.id]));

        // 2. Carrier (r_D_n_table): read cross-worksheet from project_parameters.
        //    The carrier lives on A138-04 (moved there during 2D-grid work) so it
        //    is never in an A138-13 save batch. Look it up globally by symbol and
        //    read the persisted value for this project — mirroring the cross-worksheet
        //    scalar reads below (step 4).
        // NOTE: today exactly one worksheet template owns the `r_D_n_table` field
        // (A138-04), so this symbol+active lookup is unambiguous. If a second template
        // ever introduced its own `r_D_n_table` field, the limit(1) would silently pick
        // one — the same latent multi-owner ambiguity noted on the scalar cross-worksheet
        // reads below. Scope by template if that ever happens.
        const [carrierField] = await tx
          .select({ id: fields.id })
          .from(fields)
          .where(and(eq(fields.symbol, 'r_D_n_table'), eq(fields.active, true)))
          .limit(1);
        let carrierRaw: unknown = null;
        if (carrierField) {
          const [carrierParam] = await tx
            .select({ valueJson: projectParameters.valueJson })
            .from(projectParameters)
            .where(and(
              eq(projectParameters.projectId, instance.projectId),
              eq(projectParameters.fieldId, carrierField.id),
            ))
            .limit(1);
          carrierRaw = carrierParam?.valueJson ?? null;
        }

        // 3. rainfall_table_ref: prefer the value being saved now, then fall back
        //    to the existing persisted value.
        const rainfallRefFieldId = basinIdBySymbol.get('rainfall_table_ref');
        let rainfallTableRef: string | null = null;
        if (rainfallRefFieldId) {
          const savedRef = input.values[rainfallRefFieldId];
          if (savedRef?.type === 'text' && typeof savedRef.value === 'string') {
            rainfallTableRef = savedRef.value || null;
          } else {
            // Not in this save batch — read the already-persisted value.
            const [existing] = await tx
              .select({ valueText: projectParameters.valueText })
              .from(projectParameters)
              .where(and(
                eq(projectParameters.projectId, instance.projectId),
                eq(projectParameters.fieldId, rainfallRefFieldId),
              ))
              .limit(1);
            rainfallTableRef = existing?.valueText ?? null;
          }
        }

        // 4. Cross-worksheet scalars + T_n resolution symbols: look up field ids
        //    across ALL templates in the project (scalars come from A138-08/10/12).
        //    Then fetch their persisted values from project_parameters.
        //    NOTE: this intentionally reads ALREADY-PERSISTED values (before this
        //    transaction's writes) because the scalar fields belong to OTHER worksheets
        //    and their values are not part of this save batch.
        const LOOKUP_SYMS = new Set(BASIN_LOOKUP_SYMBOLS);
        const crossFields = await tx
          .select({ id: fields.id, symbol: fields.symbol, dataType: fields.dataType })
          .from(fields)
          .where(
            and(
              inArray(fields.symbol, [...BASIN_LOOKUP_SYMBOLS]),
              eq(fields.active, true),
            ),
          );

        // Multiple templates may define a symbol (e.g. r_D_n appears on A138-13 itself);
        // prefer a cross-worksheet parameter row that has an actual value.
        const crossFieldIds = crossFields.map((f) => f.id);
        const crossParams = crossFieldIds.length > 0
          ? await tx
              .select({
                fieldId: projectParameters.fieldId,
                valueNumber: projectParameters.valueNumber,
                valueText: projectParameters.valueText,
              })
              .from(projectParameters)
              .where(and(
                eq(projectParameters.projectId, instance.projectId),
                inArray(projectParameters.fieldId, crossFieldIds),
              ))
          : [];

        // Build symbol→numeric map (first non-null wins per symbol).
        const crossNumBySymbol = new Map<string, number | null>();
        const crossTextBySymbol = new Map<string, string | null>();
        const crossFieldById = new Map(crossFields.map((f) => [f.id, f]));
        for (const p of crossParams) {
          const f = crossFieldById.get(p.fieldId);
          if (!f) continue;
          if (f.dataType === 'number' && !crossNumBySymbol.has(f.symbol)) {
            const v = p.valueNumber != null ? Number(p.valueNumber) : null;
            crossNumBySymbol.set(f.symbol, v != null && Number.isFinite(v) ? v : null);
          }
          if (f.dataType === 'text' && !crossTextBySymbol.has(f.symbol)) {
            crossTextBySymbol.set(f.symbol, p.valueText ?? null);
          }
        }

        // Also check the CURRENT save batch for scalar overrides (in case any
        // scalar fields belong to THIS template and are being saved right now).
        for (const f of basinWsFields) {
          if (!LOOKUP_SYMS.has(f.symbol as typeof BASIN_LOOKUP_SYMBOLS[number])) continue;
          const saved = input.values[f.id];
          if (saved?.type === 'number' && typeof saved.value === 'number' && Number.isFinite(saved.value)) {
            crossNumBySymbol.set(f.symbol, saved.value);
          }
        }

        // 5. Resolve T_n via facilityReturnPeriod (A138-13 uses project n / T_n).
        const pickNum = (sym: string): number | null => crossNumBySymbol.get(sym) ?? null;
        const T_n = facilityReturnPeriod('A138-13', pickNum);

        // 6. Build scalar bag.
        const scalars = {
          A_C:  crossNumBySymbol.get('A_C')  ?? (null as unknown as number),
          A_VA: crossNumBySymbol.get('A_VA') ?? (null as unknown as number),
          Q_S:  crossNumBySymbol.get('Q_S')  ?? (null as unknown as number),
          Q_Dr: crossNumBySymbol.get('Q_Dr') ?? (null as unknown as number),
          f_Z:  crossNumBySymbol.get('f_Z')  ?? (null as unknown as number),
          f_A:  crossNumBySymbol.get('f_A')  ?? (null as unknown as number),
        };

        // 7. Run the pure governing-iteration.
        const governing = materializeBasinGoverning({
          carrierRaw,
          rainfallTableRef,
          T_n,
          scalars,
        });

        // 8. UPSERT the two derived rows, or clear them when not computable.
        //    Clearing (valueNumber=null) ensures A138-10 blanks-with-cause when
        //    the basin is manual_required, rather than showing a stale value.
        const basinDerivedRows = (BASIN_GOVERNING_SYMBOLS as readonly string[])
          .map((sym) => ({ sym, fieldId: basinIdBySymbol.get(sym) }))
          .filter((x): x is { sym: string; fieldId: string } => x.fieldId != null)
          .map((x) => ({
            projectId: instance.projectId,
            fieldId: x.fieldId,
            valueNumber: governing != null
              ? String(governing[x.sym as keyof typeof governing])
              : null,
            sourceType: 'derived' as const,
            enteredBy: userId,
            enteredAt: now,
          }));

        if (basinDerivedRows.length > 0) {
          await tx.insert(projectParameters).values(basinDerivedRows).onConflictDoUpdate({
            target: [projectParameters.projectId, projectParameters.fieldId],
            set: {
              valueNumber: sql`excluded.value_number`,
              sourceType: sql`excluded.source_type`,
              enteredBy: sql`excluded.entered_by`,
              enteredAt: now,
            },
          });
        }
      }

      // ONE batched insert for all audit rows
      await tx.insert(auditLog).values(auditValues);

      await tx
        .update(worksheetInstances)
        .set({ updatedAt: new Date() })
        .where(eq(worksheetInstances.id, instance.id));
    });
  }

  return { ok: true, saved: savedCount, warnings };
}

function extractValue(
  p: typeof projectParameters.$inferSelect,
  type: string,
): unknown {
  switch (type) {
    case 'number':
      return p.valueNumber;
    case 'text':
      return p.valueText;
    case 'enum':
      return p.valueEnum;
    case 'date':
      return p.valueDate;
    case 'boolean':
      return p.valueBoolean;
    case 'json':
      return p.valueJson;
    default:
      return null;
  }
}
