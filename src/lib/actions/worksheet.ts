'use server';
import { db } from '@/lib/db';
import {
  worksheetInstances,
  projectParameters,
  fields,
  auditLog,
  equations,
  worksheetTemplates,
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
import { materializeLoadingCheck } from '@/lib/eval/materialize-tab6-loading';
import { A138_12_ASM_EQUATION_ID } from '@/lib/eval/tab6-loading';
import { materializeAsm, computeMuldeGeometrySweep } from '@/lib/eval/materialize-asm';
import { ASM_GL7_EQUATION_ID, type AsmMethod, type FacilityType, type Tab13Bodenart, validateGeometryAgainstMax } from '@/lib/eval/asm-source';
import { normalizeRainfallCarrier, resolveSelectedTable, resolveColumn, FACILITY_FREQUENCY_SYMBOL } from '@/lib/eval/rainfall-tables';
import { MATERIALIZE_REGISTRY, producerFiredEntries } from './materialize-registry';

/** Symbols the basin Gl.8 governing-iteration produces and persists.
 * These map to field symbols on the A138-13 worksheet template (same-symbol
 * consolidation: A138-10 inherits them as its r_D_n/D_min inputs). */
const BASIN_GOVERNING_SYMBOLS = ['r_D_n', 'D_min'] as const;

/** The six scalar symbols A138-13 Gl.8 reads from other worksheets. */
const BASIN_SCALAR_SYMBOLS = ['A_C', 'A_VA', 'Q_S', 'Q_Dr', 'f_Z', 'f_A'] as const;

/** All symbols that need to be resolved from project_parameters for basin
 * governing materialisation (scalars + return-period resolution). */
const BASIN_LOOKUP_SYMBOLS = [...BASIN_SCALAR_SYMBOLS, 'n', 'T_n', 'rainfall_table_ref'] as const;

/** Symbols the Tab.6 loading-check materialize produces and persists on A138-12.
 * Disjoint from BASIN_GOVERNING_SYMBOLS (r_D_n / D_min) — no shared writes. */
const LOADING_CHECK_OUTPUT_SYMBOLS = ['ac_as_ratio', 'ac_as_ratio_limit', 'ac_as_ratio_check', 'ac_as_ratio_check_reason'] as const;

/** Cross-worksheet inputs the Tab.6 loading-check reads from other templates. */
const LOADING_CHECK_CROSS_SYMBOLS = ['A_C', 'flaechengruppe', 'bbz_thickness'] as const;

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

/** A single server-materialized derived value returned after a successful save.
 * The client applies these to the store surgically (read-only computed fields
 * only) so they appear without a manual page reload. */
export type SavedDerivedRow = {
  fieldId: string;
  valueNumber: string | null;
  valueText: string | null;
};

export type SaveWorksheetResult =
  | { ok: true; saved: number; warnings: string[]; derived: SavedDerivedRow[] }
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

  // Single-source integrity: a value this worksheet's equations PRODUCE must be
  // persisted as `derived`, never as an engineer `entered` input — even when it
  // arrives via the client engine's write-back auto-save rather than the
  // surface-materialization path below. Compute the produced-symbol set from the
  // template's equations (displayOnly outputs stay `entered` — they're engineer
  // iteration variables). See @/lib/eval/derived-output-symbols.
  //
  // Loaded BEFORE the early-return check so topology-driven triggers
  // (isBasinSave, isLoadingSave) are available even on empty-batch saves.
  const templateEquations = await db
    .select({ id: equations.id, outputSymbol: equations.outputSymbol })
    .from(equations)
    .where(eq(equations.worksheetTemplateId, instance.worksheetTemplateId));
  const derivedSymbols = derivedOutputSymbols(templateEquations);

  // Topology-based trigger flags — computed at function scope so the outer
  // transaction guard can use them on empty-batch saves (savedCount === 0).
  // These depend only on which equations the template owns, not on what's in
  // the current save batch.
  const isBasinSave   = templateEquations.some((e) => e.id === BASIN_GL8_EQUATION_ID);
  const isLoadingSave = templateEquations.some((e) => e.id === A138_12_ASM_EQUATION_ID);
  // A138-12 A_S,m single-source owner: fires when this worksheet is A138-12 and must
  // materialize A_S,m from the active determination method. ASM_GL7_EQUATION_ID is the
  // same UUID as A138_12_ASM_EQUATION_ID — both identify the A138-12 Gl.7 equation —
  // so isAsmSave === isLoadingSave. Declared separately for semantic clarity and to
  // mirror the loading block pattern exactly (each owner block has its own flag).
  const isAsmSave     = templateEquations.some((e) => e.id === ASM_GL7_EQUATION_ID);

  // Standard of the saved worksheet — scopes producer-side propagation to the SAME
  // standard. worksheet_templates.code is unique per-standard, NOT globally, so a
  // consumer lookup by code alone could misfire into another guideline that shares
  // a code (e.g. a second standard with an 'A138-12'). Fail-closed: if unknown, skip.
  const [savedTemplateRow] = await db
    .select({ standardId: worksheetTemplates.standardId })
    .from(worksheetTemplates)
    .where(eq(worksheetTemplates.id, instance.worksheetTemplateId))
    .limit(1);
  const savedStandardId = savedTemplateRow?.standardId ?? null;

  // Fast-path: nothing submitted AND no topology-triggered recompute needed.
  if (fieldIds.length === 0 && !isBasinSave && !isLoadingSave && !isAsmSave) {
    return { ok: true, saved: 0, warnings: [], derived: [] };
  }

  // Load field metadata — restrict to fields belonging to this instance's
  // worksheet template so callers cannot write values for fields of a
  // different template within the same project.
  // Guard against empty fieldIds: inArray with [] is a SQL error in some drivers.
  const fieldMetas = fieldIds.length > 0
    ? await db
        .select({ id: fields.id, dataType: fields.dataType, symbol: fields.symbol })
        .from(fields)
        .where(
          and(
            inArray(fields.id, fieldIds),
            eq(fields.worksheetTemplateId, instance.worksheetTemplateId),
          ),
        )
    : [];
  const dataTypeById = new Map(fieldMetas.map((f) => [f.id, f.dataType]));
  const symbolById = new Map(fieldMetas.map((f) => [f.id, f.symbol]));

  // Load existing parameters for diff (skip if no fields to diff).
  const existing = fieldIds.length > 0
    ? await db
        .select()
        .from(projectParameters)
        .where(
          and(
            eq(projectParameters.projectId, instance.projectId),
            inArray(projectParameters.fieldId, fieldIds),
          ),
        )
    : [];
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

  // ── A_S,m validation (owner path, before persistence) ─────────────────────
  // Only runs when the saved worksheet is A138-12 (isAsmSave). Filters invalid
  // rows out of parameterValues/auditValues before savedCount is computed so the
  // transaction never persists values that violate the single-source invariant.
  if (isAsmSave && fieldIds.length > 0) {
    // V-1: A_S_min must not exceed A_S_max. If both are in the batch, reject the pair.
    // Resolve field ids for the two symbols within this template's field map.
    let aSmInFieldId: string | null = null;
    let aSmAxFieldId: string | null = null;
    for (const [fid, sym] of symbolById.entries()) {
      if (sym === 'A_S_min') aSmInFieldId = fid;
      if (sym === 'A_S_max') aSmAxFieldId = fid;
    }
    if (aSmInFieldId && aSmAxFieldId) {
      const batchMin = input.values[aSmInFieldId];
      const batchMax = input.values[aSmAxFieldId];
      if (
        batchMin?.type === 'number' && typeof batchMin.value === 'number' &&
        batchMax?.type === 'number' && typeof batchMax.value === 'number' &&
        batchMin.value > batchMax.value
      ) {
        warnings.push(
          `A_S,min (${batchMin.value}) ist größer als A_S,max (${batchMax.value}) — Eingabe abgelehnt. Bitte korrigieren.`,
        );
        // Remove both fields from the persistence batch (keep the rest of the save intact).
        const rejected = new Set([aSmInFieldId, aSmAxFieldId]);
        const keepIdx = (fid: string) => !rejected.has(fid);
        parameterValues.splice(0, parameterValues.length,
          ...parameterValues.filter((r) => keepIdx(r.fieldId)),
        );
        auditValues.splice(0, auditValues.length,
          ...auditValues.filter((r) => keepIdx(r.recordId)),
        );
      }
    }

    // V-2: manual method requires a non-empty a_s_m_provenance.
    // Resolve the method field id and check batch + persisted.
    let asmMethodFieldId: string | null = null;
    let asmProvenanceFieldId: string | null = null;
    for (const [fid, sym] of symbolById.entries()) {
      if (sym === 'a_s_m_determination_method') asmMethodFieldId = fid;
      if (sym === 'a_s_m_provenance') asmProvenanceFieldId = fid;
    }
    // Determine the method from the batch or existing persisted value.
    let batchMethod: string | null = null;
    if (asmMethodFieldId) {
      const batchMethodVal = input.values[asmMethodFieldId];
      if (batchMethodVal?.type === 'enum' && typeof batchMethodVal.value === 'string') {
        batchMethod = batchMethodVal.value;
      } else {
        // Not in batch — check persisted.
        const existingMethod = existingById.get(asmMethodFieldId);
        batchMethod = existingMethod?.valueEnum ?? null;
      }
    }
    if (batchMethod === 'manual') {
      // Check provenance: prefer the batch value, else check persisted.
      let hasProvenance = false;
      if (asmProvenanceFieldId) {
        const batchProv = input.values[asmProvenanceFieldId];
        if (batchProv?.type === 'text' && typeof batchProv.value === 'string' && batchProv.value.trim() !== '') {
          hasProvenance = true;
        } else {
          const existingProv = existingById.get(asmProvenanceFieldId);
          if (existingProv?.valueText && existingProv.valueText.trim() !== '') {
            hasProvenance = true;
          }
        }
      }
      if (!hasProvenance) {
        warnings.push(
          'Methode "Manuell": Herkunftsangabe (Datenblatt/Quelle) für A_S,m ist erforderlich — bitte ausfüllen.',
        );
      }
    }
  }
  // ── End A_S,m validation ───────────────────────────────────────────────────

  const savedCount = parameterValues.length;

  // ── Option A: producer-side reactive recompute ─────────────────────────────
  // Compute the set of symbols whose value ACTUALLY changed in this save batch
  // (comparing incoming vs previously persisted). This is the producer-side
  // trigger signal: a downstream materialize fires when one of ITS input symbols
  // is in this set.
  //
  // GENERAL MECHANISM: nothing here is 138-specific. The registry declares which
  // symbols each materialize reads; this block just computes the changed set and
  // asks the registry which materializes should fire.
  //
  // NOTE: we use `parameterValues` (validated rows only) NOT `fieldIds` so that
  // skipped fields (wrong type, not found) do not spuriously trigger a recompute.
  const changedSymbols = new Set<string>();
  for (const row of parameterValues) {
    const sym = symbolById.get(row.fieldId);
    if (!sym) continue;
    // Use the already-computed audit change record to determine whether the value
    // actually differs from the previously persisted value.
    //   action='insert' → no prior row → definitely a new/changed value.
    //   action='update' → compare before/after; only add to changedSymbols if different.
    // This avoids spurious producer-fires when an engineer saves an identical value
    // (e.g. re-saves A138-06 with the same flaechengruppe — should NOT trigger recompute).
    const auditRow = auditValues.find((a) => a.recordId === row.fieldId);
    if (auditRow?.action === 'insert') {
      changedSymbols.add(sym);
    } else if (auditRow?.action === 'update') {
      // `before` and `after` are computed in the audit pass above.
      if (auditRow.changes && 'before' in auditRow.changes && 'after' in auditRow.changes) {
        const c = auditRow.changes as { before: unknown; after: unknown };
        // Stringify comparison handles number/string/null/boolean uniformly without
        // floating-point precision issues (audit stores raw incoming.value).
        if (JSON.stringify(c.before) !== JSON.stringify(c.after)) {
          changedSymbols.add(sym);
        }
      }
    }
  }

  // Determine which registry entries already fire via ownerTrigger (topology).
  // These are excluded from producer-fire to prevent double-execution.
  const ownerFiredIds = new Set<string>();
  for (const entry of MATERIALIZE_REGISTRY) {
    if (entry.ownerTrigger(templateEquations)) {
      ownerFiredIds.add(entry.id);
    }
  }
  // isBasinSave and isLoadingSave already correspond to the 'basin' and 'loading'
  // registry entries. They are expressed directly in the topology flags above;
  // the ownerFiredIds set is used to prevent double-fire in producerFiredEntries.

  // Registry entries that should fire as producers (changed input, not already firing).
  const producerEntries = producerFiredEntries(changedSymbols, ownerFiredIds);

  // Accumulated derived rows written by the materialize passes below.
  // Populated inside the transaction; returned to the client on ok=true.
  const writtenDerived: SavedDerivedRow[] = [];

  // Open the transaction when:
  //   (a) there are actual parameter rows to write (savedCount > 0), OR
  //   (b) this worksheet owns a topology-triggered materialize block that must
  //       recompute even on an empty save batch (upstream input changed on another
  //       worksheet → stale-verdict fix), OR
  //   (c) a producer-side input symbol changed → a downstream materialize must fire.
  //   The SURFACE block is excluded from the guard because surface_inventory being
  //   in the save batch is what identifies a surface save — it only fires when
  //   savedCount > 0, so adding surfacePresence here would be redundant.
  if (savedCount > 0 || isBasinSave || isLoadingSave || isAsmSave || producerEntries.length > 0) {
    await db.transaction(async (tx) => {
      // Single timestamp for the entire save — all rows written in this call
      // share the same enteredAt so there is no skew from multiple new Date() calls.
      const now = new Date();

      // ONE batched upsert for all parameter rows — guarded so an empty batch
      // (topology-triggered recompute with no local field change) does not
      // attempt to insert zero rows (which is a no-op but wastes a round-trip).
      if (parameterValues.length > 0) {
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
      }

      // Materialize derived surface outputs when A138-07's surface_inventory was saved.
      // Runs inside the same transaction so derived rows are always consistent with
      // the entered carrier value.
      //
      // Optimization: first do a cheap indexed lookup — only if the saved batch
      // actually contains a surface_inventory field for this template do we proceed
      // to the full sibling-fields query + materialization.
      // Guard inArray against an empty batch — empty-array inArray is fragile across
      // drizzle versions (provably safe on 0.45.2 today, but don't rely on it). An
      // empty fieldIds means no surface_inventory in the batch, so the block is a no-op.
      const [surfacePresence] = fieldIds.length > 0
        ? await tx
            .select({ id: fields.id })
            .from(fields)
            .where(
              and(
                inArray(fields.id, fieldIds),
                eq(fields.symbol, 'surface_inventory'),
                eq(fields.worksheetTemplateId, instance.worksheetTemplateId),
              ),
            )
            .limit(1)
        : [];

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
          // Collect for client-side apply (Task B display-fix)
          for (const r of derivedRows) {
            writtenDerived.push({ fieldId: r.fieldId, valueNumber: r.valueNumber, valueText: null });
          }
        }
      }

      // Materialize basin governing outputs (r_D_n, D_min) whenever this save
      // targets the basin worksheet (A138-13). Persisted as derived rows so
      // A138-10 inherits them via same-symbol consolidation without re-running
      // the governing-duration iteration (single-producer rule).
      //
      // Detection: the saved template owns the basin Gl.8 equation. We already
      // loaded `templateEquations` for this template above and hoisted `isBasinSave`
      // to function scope. This is topology-stable: the equation lives on A138-13
      // regardless of which fields are in the current save batch — so any A138-13
      // save triggers a recompute. (Previously the gate was on r_D_n_table being in
      // the save batch, but that carrier moved to A138-04, making the block dead.)
      // `isBasinSave` is now declared at function scope (see above); used here directly.

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
          // Collect for client-side apply (Task B display-fix)
          for (const r of basinDerivedRows) {
            writtenDerived.push({ fieldId: r.fieldId, valueNumber: r.valueNumber, valueText: null });
          }
        }
      }

      // Materialize A_S,m (owner path) when this save targets A138-12.
      //
      // Detection: A138-12 owns ASM_GL7_EQUATION_ID (same UUID as A138_12_ASM_EQUATION_ID
      // used for isLoadingSave). `isAsmSave` is hoisted to function scope; used here directly.
      // This is topology-stable — any A138-12 save triggers a recompute so A_S_m always
      // reflects the latest inputs, regardless of which fields are in the batch.
      //
      // MUST run BEFORE isLoadingSave: both blocks fire on the same A138-12 save.
      // The asm block UPSERTs A_S_m into project_parameters; the loading block then reads
      // the persisted A_S_m. Running asm first ensures the loading block sees the
      // freshly-materialized value within the same transaction (Postgres: prior writes are
      // visible to subsequent reads in the same transaction).
      //
      // Owner path only: geometry sweep (Mulde/Rigole) is computed in the LATER producer
      // task when a facility worksheet saves and writes A_S_m back to A138-12. Here we
      // pass through the currently-persisted A_S_m value for method='geometry' (idempotent
      // re-write — safe and correct; returns indeterminate when nothing is persisted yet).
      //
      // Inputs read:
      //   LOCAL to A138-12 (prefer save batch, else persisted — mirrors the A_S_m read
      //   in the isLoadingSave block below): A_S_min, A_S_max, a_s_m_determination_method,
      //   soil_bodenart_tab13, a_s_m_provenance; A_C (may also come from A138-07 cross but
      //   is listed on A138-12 as a derived consumer — read by symbol like loading block reads A_C).
      //   LOCAL manual value: when method='manual', the A_S_m entered by the engineer in batch.
      //   CROSS: facility_type_selected (A138-15), geometryValue (persisted A_S_m on A138-12).
      if (isAsmSave) {
        // 1. Sibling field ids for A138-12.
        const asmWsFields = await tx
          .select({ id: fields.id, symbol: fields.symbol, dataType: fields.dataType })
          .from(fields)
          .where(and(eq(fields.worksheetTemplateId, instance.worksheetTemplateId), eq(fields.active, true)));
        const asmIdBySymbol = new Map(asmWsFields.map((f) => [f.symbol, f.id]));

        // Helper: read a numeric field from the save batch or persisted project_parameters.
        const readLocalNum = async (sym: string): Promise<number | null> => {
          const fid = asmIdBySymbol.get(sym);
          if (!fid) return null;
          const saved = input.values[fid];
          if (saved?.type === 'number' && typeof saved.value === 'number' && Number.isFinite(saved.value)) {
            return saved.value;
          }
          const [existing] = await tx
            .select({ valueNumber: projectParameters.valueNumber })
            .from(projectParameters)
            .where(and(eq(projectParameters.projectId, instance.projectId), eq(projectParameters.fieldId, fid)))
            .limit(1);
          const v = existing?.valueNumber != null ? Number(existing.valueNumber) : null;
          return v != null && Number.isFinite(v) ? v : null;
        };

        // Helper: read an enum/text field from batch or persisted.
        const readLocalEnum = async (sym: string): Promise<string | null> => {
          const fid = asmIdBySymbol.get(sym);
          if (!fid) return null;
          const saved = input.values[fid];
          if (saved?.type === 'enum' && typeof saved.value === 'string') return saved.value || null;
          if (saved?.type === 'text' && typeof saved.value === 'string') return saved.value || null;
          const [existing] = await tx
            .select({ valueEnum: projectParameters.valueEnum, valueText: projectParameters.valueText })
            .from(projectParameters)
            .where(and(eq(projectParameters.projectId, instance.projectId), eq(projectParameters.fieldId, fid)))
            .limit(1);
          return existing?.valueEnum ?? existing?.valueText ?? null;
        };

        // 2. Determination method (value_enum), default 'direct'.
        const rawMethod = await readLocalEnum('a_s_m_determination_method');
        const method: AsmMethod = (rawMethod === 'direct' || rawMethod === 'geometry' || rawMethod === 'soil_estimate' || rawMethod === 'manual')
          ? rawMethod
          : 'direct';

        // 3. Local numeric inputs.
        const A_S_min = await readLocalNum('A_S_min');
        const A_S_max = await readLocalNum('A_S_max');

        // 4. A_C — read cross-worksheet by symbol (same pattern as loading block's A_C read).
        //    Prefer a value from project_parameters for this project; cross-worksheet because
        //    A_C is produced on A138-07 and shared by symbol. Fallback to A138-12 local if set.
        const crossAcFields = await tx
          .select({ id: fields.id, symbol: fields.symbol, dataType: fields.dataType })
          .from(fields)
          .where(and(eq(fields.symbol, 'A_C'), eq(fields.active, true)));
        const crossAcFieldIds = crossAcFields.map((f) => f.id);
        let A_C: number | null = null;
        if (crossAcFieldIds.length > 0) {
          const crossAcParams = await tx
            .select({ fieldId: projectParameters.fieldId, valueNumber: projectParameters.valueNumber })
            .from(projectParameters)
            .where(and(
              eq(projectParameters.projectId, instance.projectId),
              inArray(projectParameters.fieldId, crossAcFieldIds),
            ));
          for (const p of crossAcParams) {
            if (p.valueNumber != null) {
              const v = Number(p.valueNumber);
              if (Number.isFinite(v)) { A_C = v; break; }
            }
          }
        }

        // 5. Bodenart (Tab.13 selector, local to A138-12).
        const rawBodenart = await readLocalEnum('soil_bodenart_tab13');
        const bodenart: Tab13Bodenart | null = (rawBodenart === 'mittel_feinsand' || rawBodenart === 'schluffig')
          ? rawBodenart
          : null;

        // 6. Manual inputs: provenance + manual value (A_S_m user-entered, only used when method='manual').
        const manualProvenance = await readLocalEnum('a_s_m_provenance');
        let manualValue: number | null = null;
        if (method === 'manual') {
          // When method='manual', the A_S_m field itself is user-editable.
          // Read whatever the engineer entered in this batch (or the last persisted value).
          manualValue = await readLocalNum('A_S_m');
        }

        // 7. CROSS: facility_type_selected (A138-15) — read by symbol, like the loading
        //    block reads flaechengruppe.
        const crossFtFields = await tx
          .select({ id: fields.id })
          .from(fields)
          .where(and(eq(fields.symbol, 'facility_type_selected'), eq(fields.active, true)));
        const crossFtFieldIds = crossFtFields.map((f) => f.id);
        let facilityType: FacilityType | null = null;
        if (crossFtFieldIds.length > 0) {
          const [ftParam] = await tx
            .select({ valueEnum: projectParameters.valueEnum, valueText: projectParameters.valueText })
            .from(projectParameters)
            .where(and(
              eq(projectParameters.projectId, instance.projectId),
              inArray(projectParameters.fieldId, crossFtFieldIds),
            ))
            .limit(1);
          const rawFt = ftParam?.valueEnum ?? ftParam?.valueText ?? null;
          if (rawFt === 'flaeche' || rawFt === 'mulde' || rawFt === 'rigole' || rawFt === 'schacht' || rawFt === 'becken') {
            facilityType = rawFt;
          }
        }

        // 8. geometryValue: the currently-persisted A_S_m on A138-12.
        //    For method='geometry', the owner path just passes through this value
        //    (the geometry sweep is computed by the facility worksheet producer task).
        //    Returns null if nothing persisted yet → materializeAsm returns indeterminate.
        let geometryValue: number | null = null;
        const asmFieldId = asmIdBySymbol.get('A_S_m');
        if (method === 'geometry' && asmFieldId) {
          const [existingAsm] = await tx
            .select({ valueNumber: projectParameters.valueNumber })
            .from(projectParameters)
            .where(and(eq(projectParameters.projectId, instance.projectId), eq(projectParameters.fieldId, asmFieldId)))
            .limit(1);
          const gv = existingAsm?.valueNumber != null ? Number(existingAsm.valueNumber) : null;
          geometryValue = gv != null && Number.isFinite(gv) ? gv : null;
        }

        // 9. Materialize.
        const out = materializeAsm({
          method,
          A_S_min,
          A_S_max,
          A_C,
          bodenart,
          geometryValue,
          manualValue,
          manualProvenance: manualProvenance || null,
          facilityType,
          sourceWorksheet: 'A138-12',
        });

        // V-2: when method='geometry' and A_S_max is present, warn if the geometry-derived
        // A_S,m falls below A_S,max (§6.3.2 Flächenbedarf-Untergrenze). Flag-only — does
        // NOT change the computed A_S_m value.
        if (method === 'geometry' && out.A_S_m != null) {
          const v2 = validateGeometryAgainstMax(out.A_S_m, A_S_max);
          if (v2.flag && v2.reason) {
            warnings.push(v2.reason);
          }
        }

        // 10. UPSERT A_S_m as a derived row, mirroring the loading-check UPSERT shape exactly.
        //     Only write when A_S_m is computable (non-null). When indeterminate, leave
        //     the existing persisted value in place (do not overwrite with null — that
        //     would break the loading-check's A_S_m read on the next save).
        if (asmFieldId && out.A_S_m != null) {
          await tx
            .insert(projectParameters)
            .values([{
              projectId: instance.projectId,
              fieldId: asmFieldId,
              valueNumber: String(out.A_S_m),
              valueText: null,
              sourceType: 'derived',
              enteredBy: userId,
              enteredAt: now,
            }])
            .onConflictDoUpdate({
              target: [projectParameters.projectId, projectParameters.fieldId],
              set: {
                valueNumber: sql`excluded.value_number`,
                valueText: sql`excluded.value_text`,
                sourceType: sql`excluded.source_type`,
                enteredBy: sql`excluded.entered_by`,
                enteredAt: now,
              },
            });
          writtenDerived.push({ fieldId: asmFieldId, valueNumber: String(out.A_S_m), valueText: null });
        }
      }

      // Materialize Tab.6 loading-check outputs (ac_as_ratio, ac_as_ratio_limit,
      // ac_as_ratio_check, ac_as_ratio_check_reason) whenever this save targets the
      // A138-12 (BBZ loading check) worksheet. Persisted as derived rows.
      //
      // Detection: A138-12 owns the A_S_m equation (55151cb1-…). `isLoadingSave`
      // is hoisted to function scope (see above) and used here directly.
      // This is topology-stable: the equation lives on A138-12 regardless of which
      // fields are in the current save batch — so ANY A138-12 save triggers a
      // recompute. Previously the gate was on `ac_as_ratio` being in the save batch,
      // but ac_as_ratio is read-only/derived and is never user-entered → the block
      // was permanently dead (same dead-trigger class fixed for the basin block above).
      //
      // Cross-worksheet reads:
      //   A_S_m         — LOCAL to A138-12 (prefer save batch, else persisted)
      //   A_C           — cross-worksheet from A138-07 (persisted)
      //   flaechengruppe— cross-worksheet from A138-06 (persisted, value_enum/value_text)
      //   bbz_thickness — cross-worksheet from A138-06 (persisted, value_number)
      // `isLoadingSave` is declared at function scope; used here directly.

      if (isLoadingSave) {
        // 1. Sibling field ids for A138-12 (resolve output field ids + A_S_m local field).
        const lcWsFields = await tx
          .select({ id: fields.id, symbol: fields.symbol, dataType: fields.dataType })
          .from(fields)
          .where(and(eq(fields.worksheetTemplateId, instance.worksheetTemplateId), eq(fields.active, true)));
        const lcIdBySymbol = new Map(lcWsFields.map((f) => [f.symbol, f.id]));

        // 2. A_S_m — prefer save batch, else persisted A138-12 value.
        const aSmFieldId = lcIdBySymbol.get('A_S_m');
        let A_S_m: number | null = null;
        if (aSmFieldId) {
          const saved = input.values[aSmFieldId];
          if (saved?.type === 'number' && typeof saved.value === 'number' && Number.isFinite(saved.value)) {
            A_S_m = saved.value;
          } else {
            const [existing] = await tx
              .select({ valueNumber: projectParameters.valueNumber })
              .from(projectParameters)
              .where(and(
                eq(projectParameters.projectId, instance.projectId),
                eq(projectParameters.fieldId, aSmFieldId),
              ))
              .limit(1);
            A_S_m = existing?.valueNumber != null ? Number(existing.valueNumber) : null;
            if (A_S_m != null && !Number.isFinite(A_S_m)) A_S_m = null;
          }
        }

        // 3. Cross-worksheet inputs from A138-06 (flaechengruppe, bbz_thickness)
        //    and A138-07 (A_C). Look up by symbol across all active fields in the project.
        //    NOTE: same single-owner assumption as the basin cross-worksheet reads.
        const crossLcFields = await tx
          .select({ id: fields.id, symbol: fields.symbol, dataType: fields.dataType })
          .from(fields)
          .where(
            and(
              inArray(fields.symbol, [...LOADING_CHECK_CROSS_SYMBOLS]),
              eq(fields.active, true),
            ),
          );
        const crossLcFieldIds = crossLcFields.map((f) => f.id);
        const crossLcParams = crossLcFieldIds.length > 0
          ? await tx
              .select({
                fieldId: projectParameters.fieldId,
                valueNumber: projectParameters.valueNumber,
                valueText: projectParameters.valueText,
                valueEnum: projectParameters.valueEnum,
              })
              .from(projectParameters)
              .where(and(
                eq(projectParameters.projectId, instance.projectId),
                inArray(projectParameters.fieldId, crossLcFieldIds),
              ))
          : [];

        const crossLcFieldById = new Map(crossLcFields.map((f) => [f.id, f]));
        const crossLcNumBySymbol = new Map<string, number | null>();
        const crossLcTextBySymbol = new Map<string, string | null>();
        for (const p of crossLcParams) {
          const f = crossLcFieldById.get(p.fieldId);
          if (!f) continue;
          if (f.dataType === 'number' && !crossLcNumBySymbol.has(f.symbol)) {
            const v = p.valueNumber != null ? Number(p.valueNumber) : null;
            crossLcNumBySymbol.set(f.symbol, v != null && Number.isFinite(v) ? v : null);
          }
          // flaechengruppe is stored as 'enum' in the field definition, read value_enum first
          if ((f.dataType === 'enum' || f.dataType === 'text') && !crossLcTextBySymbol.has(f.symbol)) {
            crossLcTextBySymbol.set(f.symbol, p.valueEnum ?? p.valueText ?? null);
          }
        }

        const A_C           = crossLcNumBySymbol.get('A_C')            ?? null;
        const flaechengruppe= crossLcTextBySymbol.get('flaechengruppe') ?? null;
        const bbz_thickness = crossLcNumBySymbol.get('bbz_thickness')  ?? null;

        // 4. Run the pure loading-check materialize.
        const lc = materializeLoadingCheck({ A_C, A_S_m, flaechengruppe, bbz_thickness });

        // 5. UPSERT the four derived rows.
        //    When a field id is missing (migration not yet applied), the map returns
        //    undefined and the row is filtered out — safe no-op.
        type LcDerivedRow = {
          projectId: string;
          fieldId: string;
          valueNumber: string | null;
          valueText: string | null;
          sourceType: 'derived';
          enteredBy: string;
          enteredAt: Date;
        };
        // Map over the shared constant so the symbol list has a single source of truth.
        const lcValueMap: Record<string, { valueNumber: string | null; valueText: string | null }> = {
          ac_as_ratio:              { valueNumber: lc.ac_as_ratio != null ? String(lc.ac_as_ratio) : null, valueText: null },
          ac_as_ratio_limit:        { valueNumber: lc.ac_as_ratio_limit != null ? String(lc.ac_as_ratio_limit) : null, valueText: null },
          ac_as_ratio_check:        { valueNumber: null, valueText: lc.ac_as_ratio_check },
          ac_as_ratio_check_reason: { valueNumber: null, valueText: lc.ac_as_ratio_check_reason },
        };
        const lcDerivedRows: LcDerivedRow[] = LOADING_CHECK_OUTPUT_SYMBOLS
          .map((sym) => ({ sym, ...lcValueMap[sym] }))
          .map((x) => ({ ...x, fieldId: lcIdBySymbol.get(x.sym) }))
          .filter((x): x is typeof x & { fieldId: string } => x.fieldId != null)
          .map((x) => ({
            projectId: instance.projectId,
            fieldId: x.fieldId,
            valueNumber: x.valueNumber,
            valueText: x.valueText,
            sourceType: 'derived' as const,
            enteredBy: userId,
            enteredAt: now,
          }));

        if (lcDerivedRows.length > 0) {
          await tx.insert(projectParameters).values(lcDerivedRows).onConflictDoUpdate({
            target: [projectParameters.projectId, projectParameters.fieldId],
            set: {
              valueNumber: sql`excluded.value_number`,
              valueText: sql`excluded.value_text`,
              sourceType: sql`excluded.source_type`,
              enteredBy: sql`excluded.entered_by`,
              enteredAt: now,
            },
          });
          // Collect for client-side apply (Task B display-fix)
          for (const r of lcDerivedRows) {
            writtenDerived.push({ fieldId: r.fieldId, valueNumber: r.valueNumber, valueText: r.valueText });
          }
        }
      }

      // ── Option A: producer-side materialize firings ──────────────────────
      //
      // GENERAL MECHANISM: for each registry entry that should fire as a producer
      // (because a changed input symbol ∈ entry.inputSymbols), we:
      //   1. Look up the consumer worksheet_template by consumerTemplateCode.
      //   2. Resolve output field ids against THAT template (not the saved template).
      //   3. Run the materialize compute function with cross-worksheet inputs.
      //   4. UPSERT the derived rows.
      //
      // CRITICAL (consumer-template resolution): the existing owner-triggered loading
      // block at line ~657 queries `instance.worksheetTemplateId` to get lcWsFields.
      // When the SAVED worksheet is A138-12, that is correct. When the SAVED worksheet
      // is A138-06 (producer-fire), using `instance.worksheetTemplateId` would resolve
      // A138-06's fields — but A138-06 has NO ac_as_ratio symbol, so lcDerivedRows
      // would be empty. The fix: resolve the consumer template by `consumerTemplateCode`.
      //
      // 138-SPECIFIC: only the 'loading' block is producer-fired for now (the basin block
      // reads its inputs from the saved template + cross-worksheet scalars, but its
      // producer-fire would require the same fix; deferred until a concrete trigger exists).
      // Surface is self-referential and handled by the in-batch check above.
      // The dispatch below is general — it iterates producerEntries and dispatches by entry.id.

      for (const producerEntry of producerEntries) {
        if (producerEntry.id === 'loading') {
          // ── Consumer-template resolution (the crux) ──────────────────────
          // Look up the A138-12 template by code (consumerTemplateCode = 'A138-12').
          // This is INDEPENDENT of `instance.worksheetTemplateId` (the saved template).
          // GENERAL: any materialize entry with id='loading' uses its consumerTemplateCode.
          // Scope by standard_id (fail-closed): resolve the consumer template ONLY within
          // the SAME standard as the saved worksheet. Without this, a second standard that
          // shares the code could be picked arbitrarily (cross-standard misfire). If the
          // saved standard is unknown, do not fire producer-side.
          const [consumerTmpl] = savedStandardId
            ? await tx
                .select({ id: worksheetTemplates.id })
                .from(worksheetTemplates)
                .where(and(
                  eq(worksheetTemplates.code, producerEntry.consumerTemplateCode),
                  eq(worksheetTemplates.standardId, savedStandardId),
                ))
                .limit(1)
            : [];

          if (!consumerTmpl) {
            // Consumer template not found in this standard — skip gracefully (migration not
            // yet applied, code differs, or unknown standard). Do not error; the save succeeded.
            continue;
          }

          // Resolve output field ids from the CONSUMER template (not the saved template).
          const lcWsFieldsProducer = await tx
            .select({ id: fields.id, symbol: fields.symbol, dataType: fields.dataType })
            .from(fields)
            .where(and(eq(fields.worksheetTemplateId, consumerTmpl.id), eq(fields.active, true)));
          const lcIdBySymbolProducer = new Map(lcWsFieldsProducer.map((f) => [f.symbol, f.id]));

          // A_S_m — read from the consumer (A138-12) project_parameters (persisted).
          // It is NOT in the current save batch (which belongs to A138-06).
          const aSmFieldIdProducer = lcIdBySymbolProducer.get('A_S_m');
          let A_S_m_producer: number | null = null;
          if (aSmFieldIdProducer) {
            const [existingAsm] = await tx
              .select({ valueNumber: projectParameters.valueNumber })
              .from(projectParameters)
              .where(and(
                eq(projectParameters.projectId, instance.projectId),
                eq(projectParameters.fieldId, aSmFieldIdProducer),
              ))
              .limit(1);
            A_S_m_producer = existingAsm?.valueNumber != null ? Number(existingAsm.valueNumber) : null;
            if (A_S_m_producer != null && !Number.isFinite(A_S_m_producer)) A_S_m_producer = null;
          }

          // Cross-worksheet inputs: A_C, flaechengruppe, bbz_thickness.
          // These are read from project_parameters — INCLUDING the values just written
          // by the main parameter UPSERT above (because we're inside the same transaction,
          // the writes are visible to subsequent reads within the transaction).
          const crossLcFieldsP = await tx
            .select({ id: fields.id, symbol: fields.symbol, dataType: fields.dataType })
            .from(fields)
            .where(
              and(
                inArray(fields.symbol, [...LOADING_CHECK_CROSS_SYMBOLS]),
                eq(fields.active, true),
              ),
            );
          const crossLcFieldIdsP = crossLcFieldsP.map((f) => f.id);
          const crossLcParamsP = crossLcFieldIdsP.length > 0
            ? await tx
                .select({
                  fieldId: projectParameters.fieldId,
                  valueNumber: projectParameters.valueNumber,
                  valueText: projectParameters.valueText,
                  valueEnum: projectParameters.valueEnum,
                })
                .from(projectParameters)
                .where(and(
                  eq(projectParameters.projectId, instance.projectId),
                  inArray(projectParameters.fieldId, crossLcFieldIdsP),
                ))
            : [];

          const crossLcFieldByIdP = new Map(crossLcFieldsP.map((f) => [f.id, f]));
          const crossLcNumBySymbolP = new Map<string, number | null>();
          const crossLcTextBySymbolP = new Map<string, string | null>();
          for (const p of crossLcParamsP) {
            const f = crossLcFieldByIdP.get(p.fieldId);
            if (!f) continue;
            if (f.dataType === 'number' && !crossLcNumBySymbolP.has(f.symbol)) {
              const v = p.valueNumber != null ? Number(p.valueNumber) : null;
              crossLcNumBySymbolP.set(f.symbol, v != null && Number.isFinite(v) ? v : null);
            }
            if ((f.dataType === 'enum' || f.dataType === 'text') && !crossLcTextBySymbolP.has(f.symbol)) {
              crossLcTextBySymbolP.set(f.symbol, p.valueEnum ?? p.valueText ?? null);
            }
          }

          const A_C_p            = crossLcNumBySymbolP.get('A_C')             ?? null;
          const flaechengruppe_p = crossLcTextBySymbolP.get('flaechengruppe') ?? null;
          const bbz_thickness_p  = crossLcNumBySymbolP.get('bbz_thickness')   ?? null;

          const lc_p = materializeLoadingCheck({
            A_C: A_C_p,
            A_S_m: A_S_m_producer,
            flaechengruppe: flaechengruppe_p,
            bbz_thickness: bbz_thickness_p,
          });

          type LcDerivedRowP = {
            projectId: string;
            fieldId: string;
            valueNumber: string | null;
            valueText: string | null;
            sourceType: 'derived';
            enteredBy: string;
            enteredAt: Date;
          };
          const lcValueMapP: Record<string, { valueNumber: string | null; valueText: string | null }> = {
            ac_as_ratio:              { valueNumber: lc_p.ac_as_ratio != null ? String(lc_p.ac_as_ratio) : null, valueText: null },
            ac_as_ratio_limit:        { valueNumber: lc_p.ac_as_ratio_limit != null ? String(lc_p.ac_as_ratio_limit) : null, valueText: null },
            ac_as_ratio_check:        { valueNumber: null, valueText: lc_p.ac_as_ratio_check },
            ac_as_ratio_check_reason: { valueNumber: null, valueText: lc_p.ac_as_ratio_check_reason },
          };
          const lcDerivedRowsP: LcDerivedRowP[] = LOADING_CHECK_OUTPUT_SYMBOLS
            .map((sym) => ({ sym, ...lcValueMapP[sym] }))
            .map((x) => ({ ...x, fieldId: lcIdBySymbolProducer.get(x.sym) }))
            .filter((x): x is typeof x & { fieldId: string } => x.fieldId != null)
            .map((x) => ({
              projectId: instance.projectId,
              fieldId: x.fieldId,
              valueNumber: x.valueNumber,
              valueText: x.valueText,
              sourceType: 'derived' as const,
              enteredBy: userId,
              enteredAt: now,
            }));

          if (lcDerivedRowsP.length > 0) {
            await tx.insert(projectParameters).values(lcDerivedRowsP).onConflictDoUpdate({
              target: [projectParameters.projectId, projectParameters.fieldId],
              set: {
                valueNumber: sql`excluded.value_number`,
                valueText: sql`excluded.value_text`,
                sourceType: sql`excluded.source_type`,
                enteredBy: sql`excluded.entered_by`,
                enteredAt: now,
              },
            });
            for (const r of lcDerivedRowsP) {
              writtenDerived.push({ fieldId: r.fieldId, valueNumber: r.valueNumber, valueText: r.valueText });
            }
          }
        } else if (producerEntry.id === 'asm') {
          // ── A_S,m producer branch (geometry write-back) ───────────────────
          // Fires when a facility worksheet (A138-17 Mulde / A138-18 Rigole) or
          // A138-15 (facility_type_selected) saves and a relevant input changed.
          // Mirrors the 'loading' producer branch: resolve consumer template by
          // code + savedStandardId (fail-closed), then recompute A_S_m on A138-12.
          //
          // ORDERING: the 'loading' entry precedes 'asm' in MATERIALIZE_REGISTRY, so
          // the loading pass fires first in this loop. The chained Tab.6 re-fire
          // (step 7, inside this branch) ensures a same-save geometry change updates
          // BOTH A_S_m AND the Tab.6 verdict without depending on loop ordering.

          // 1. Resolve the A138-12 consumer template by code + standardId.
          //    Mirrors the loading branch's resolution exactly (fail-closed).
          const [asmConsumerTmpl] = savedStandardId
            ? await tx
                .select({ id: worksheetTemplates.id })
                .from(worksheetTemplates)
                .where(and(
                  eq(worksheetTemplates.code, producerEntry.consumerTemplateCode),
                  eq(worksheetTemplates.standardId, savedStandardId),
                ))
                .limit(1)
            : [];

          if (!asmConsumerTmpl) {
            // Consumer template A138-12 not found in this standard — skip gracefully.
            continue;
          }

          // Resolve field ids from the CONSUMER (A138-12) template.
          const asmCWsFields = await tx
            .select({ id: fields.id, symbol: fields.symbol, dataType: fields.dataType })
            .from(fields)
            .where(and(eq(fields.worksheetTemplateId, asmConsumerTmpl.id), eq(fields.active, true)));
          const asmCIdBySymbol = new Map(asmCWsFields.map((f) => [f.symbol, f.id]));

          // 2. Read a_s_m_determination_method + facility_type_selected from persisted params.
          //    The method lives on A138-12 (consumer); facility_type on A138-15 (cross-ws).
          // 2a. Method — read from consumer template's persisted params.
          const asmMethodFieldIdP = asmCIdBySymbol.get('a_s_m_determination_method');
          let asmMethodP: AsmMethod = 'direct';
          if (asmMethodFieldIdP) {
            const [mRow] = await tx
              .select({ valueEnum: projectParameters.valueEnum })
              .from(projectParameters)
              .where(and(
                eq(projectParameters.projectId, instance.projectId),
                eq(projectParameters.fieldId, asmMethodFieldIdP),
              ))
              .limit(1);
            const rawM = mRow?.valueEnum ?? null;
            if (rawM === 'direct' || rawM === 'geometry' || rawM === 'soil_estimate' || rawM === 'manual') {
              asmMethodP = rawM;
            }
          }

          // 2b. facility_type_selected — cross-worksheet by symbol (same as isAsmSave owner path).
          const crossFtFieldsP = await tx
            .select({ id: fields.id })
            .from(fields)
            .where(and(eq(fields.symbol, 'facility_type_selected'), eq(fields.active, true)));
          const crossFtFieldIdsP = crossFtFieldsP.map((f) => f.id);
          let facilityTypeP: FacilityType | null = null;
          if (crossFtFieldIdsP.length > 0) {
            const [ftRowP] = await tx
              .select({ valueEnum: projectParameters.valueEnum, valueText: projectParameters.valueText })
              .from(projectParameters)
              .where(and(
                eq(projectParameters.projectId, instance.projectId),
                inArray(projectParameters.fieldId, crossFtFieldIdsP),
              ))
              .limit(1);
            const rawFt = ftRowP?.valueEnum ?? ftRowP?.valueText ?? null;
            if (rawFt === 'flaeche' || rawFt === 'mulde' || rawFt === 'rigole' ||
                rawFt === 'schacht' || rawFt === 'becken') {
              facilityTypeP = rawFt;
            }
          }

          // 3. Compute geometryValue when method==='geometry'.
          let geometryValueP: number | null = null;

          if (asmMethodP === 'geometry') {
            if (facilityTypeP === 'mulde') {
              // ── Mulde Gl.16 Dauerstufen sweep (A-2) ──────────────────────
              // Read the r_D_n_table carrier the SAME WAY the isBasinSave block does:
              // global symbol lookup (carrier lives on A138-04, not the facility ws).
              const [muldeCarrierField] = await tx
                .select({ id: fields.id })
                .from(fields)
                .where(and(eq(fields.symbol, 'r_D_n_table'), eq(fields.active, true)))
                .limit(1);
              let muldeCarrierRaw: unknown = null;
              if (muldeCarrierField) {
                const [muldeCarrierParam] = await tx
                  .select({ valueJson: projectParameters.valueJson })
                  .from(projectParameters)
                  .where(and(
                    eq(projectParameters.projectId, instance.projectId),
                    eq(projectParameters.fieldId, muldeCarrierField.id),
                  ))
                  .limit(1);
                muldeCarrierRaw = muldeCarrierParam?.valueJson ?? null;
              }

              // Read rainfall_table_ref: prefer the save batch value, else persisted.
              // The producer save targets A138-17 — worksheetTemplateId is A138-17's id.
              const muldeWsFields = await tx
                .select({ id: fields.id, symbol: fields.symbol })
                .from(fields)
                .where(and(eq(fields.worksheetTemplateId, instance.worksheetTemplateId), eq(fields.active, true)));
              const muldeIdBySymbol = new Map(muldeWsFields.map((f) => [f.symbol, f.id]));

              const muldeRrFieldId = muldeIdBySymbol.get('rainfall_table_ref');
              let muldeRainfallTableRef: string | null = null;
              if (muldeRrFieldId) {
                const saved = input.values[muldeRrFieldId];
                if (saved?.type === 'text' && typeof saved.value === 'string') {
                  muldeRainfallTableRef = saved.value || null;
                } else {
                  const [existingRr] = await tx
                    .select({ valueText: projectParameters.valueText })
                    .from(projectParameters)
                    .where(and(
                      eq(projectParameters.projectId, instance.projectId),
                      eq(projectParameters.fieldId, muldeRrFieldId),
                    ))
                    .limit(1);
                  muldeRainfallTableRef = existingRr?.valueText ?? null;
                }
              }

              // Read scalars A_C, h_M, f_Z, k_i + frequency symbols for T_n resolution.
              // These are read cross-worksheet by symbol (A_C from A138-07; h_M/f_Z/k_i from A138-17).
              // n_M_Bemessung is A138-17's local return-period selector (FACILITY_FREQUENCY_SYMBOL).
              const muldeFreqSym = FACILITY_FREQUENCY_SYMBOL['A138-17'];
              const MULDE_SCALAR_SYMS = ['A_C', 'h_M', 'f_Z', 'k_i', muldeFreqSym!, 'n', 'T_n'] as const;
              const mScalarCrossFields = await tx
                .select({ id: fields.id, symbol: fields.symbol, dataType: fields.dataType })
                .from(fields)
                .where(and(
                  inArray(fields.symbol, [...MULDE_SCALAR_SYMS]),
                  eq(fields.active, true),
                ));
              const mScalarFieldIds = mScalarCrossFields.map((f) => f.id);
              const mScalarParams = mScalarFieldIds.length > 0
                ? await tx
                    .select({
                      fieldId: projectParameters.fieldId,
                      valueNumber: projectParameters.valueNumber,
                    })
                    .from(projectParameters)
                    .where(and(
                      eq(projectParameters.projectId, instance.projectId),
                      inArray(projectParameters.fieldId, mScalarFieldIds),
                    ))
                : [];
              const mScalarFieldById = new Map(mScalarCrossFields.map((f) => [f.id, f]));
              const mNumBySymbol = new Map<string, number | null>();
              for (const p of mScalarParams) {
                const f = mScalarFieldById.get(p.fieldId);
                if (!f) continue;
                if (!mNumBySymbol.has(f.symbol)) {
                  const v = p.valueNumber != null ? Number(p.valueNumber) : null;
                  mNumBySymbol.set(f.symbol, v != null && Number.isFinite(v) ? v : null);
                }
              }
              // Also check the current save batch for the producer (A138-17) field overrides.
              for (const f of muldeWsFields) {
                if (!(MULDE_SCALAR_SYMS as readonly string[]).includes(f.symbol)) continue;
                const saved = input.values[f.id];
                if (saved?.type === 'number' && typeof saved.value === 'number' && Number.isFinite(saved.value)) {
                  mNumBySymbol.set(f.symbol, saved.value);
                }
              }

              // Resolve T_n for A138-17 (uses n_M_Bemessung local, else project n/T_n).
              const pickMuldeNum = (sym: string): number | null => mNumBySymbol.get(sym) ?? null;
              const muldeT_n = facilityReturnPeriod('A138-17', pickMuldeNum);

              // Resolve the column from the carrier (mirrors materialize-basin-governing.ts).
              const muldeCarrier = normalizeRainfallCarrier(muldeCarrierRaw);
              const muldeTable = resolveSelectedTable(muldeCarrier, muldeRainfallTableRef);
              if (muldeTable) {
                const muldeCol = resolveColumn(muldeTable, muldeT_n);
                if (muldeCol.status !== 'missing' && muldeCol.rows.length > 0) {
                  const mAC = mNumBySymbol.get('A_C') ?? null;
                  const mhM = mNumBySymbol.get('h_M') ?? null;
                  const mfZ = mNumBySymbol.get('f_Z') ?? null;
                  const mki = mNumBySymbol.get('k_i') ?? null;
                  if (mAC != null && mhM != null && mfZ != null && mki != null) {
                    const muldeSwept = computeMuldeGeometrySweep(muldeCol.rows, {
                      A_C: mAC, h_M: mhM, f_Z: mfZ, k_i: mki,
                    });
                    geometryValueP = muldeSwept.A_S_m;
                  }
                }
              }

            } else if (facilityTypeP === 'rigole') {
              // ── Rigole one-shot Gl.17 = (b_R + h_R) · L_R + b_R · h_R ──
              // Read b_R, h_R, L_R from the producer worksheet (A138-18).
              // Cross-worksheet by symbol — prefer current save batch, else persisted.
              const RIGOLE_SYMS = ['b_R', 'h_R', 'L_R'] as const;
              const rigoleCrossFields = await tx
                .select({ id: fields.id, symbol: fields.symbol, dataType: fields.dataType })
                .from(fields)
                .where(and(
                  inArray(fields.symbol, [...RIGOLE_SYMS]),
                  eq(fields.active, true),
                ));
              const rigoleFieldIds = rigoleCrossFields.map((f) => f.id);
              const rigoleParams = rigoleFieldIds.length > 0
                ? await tx
                    .select({
                      fieldId: projectParameters.fieldId,
                      valueNumber: projectParameters.valueNumber,
                    })
                    .from(projectParameters)
                    .where(and(
                      eq(projectParameters.projectId, instance.projectId),
                      inArray(projectParameters.fieldId, rigoleFieldIds),
                    ))
                : [];
              const rigoleFieldById = new Map(rigoleCrossFields.map((f) => [f.id, f]));
              const rigoleNumBySymbol = new Map<string, number | null>();
              for (const p of rigoleParams) {
                const f = rigoleFieldById.get(p.fieldId);
                if (!f) continue;
                if (!rigoleNumBySymbol.has(f.symbol)) {
                  const v = p.valueNumber != null ? Number(p.valueNumber) : null;
                  rigoleNumBySymbol.set(f.symbol, v != null && Number.isFinite(v) ? v : null);
                }
              }
              // Prefer current save batch for the producer (A138-18) overrides.
              const rigoleWsFields = await tx
                .select({ id: fields.id, symbol: fields.symbol })
                .from(fields)
                .where(and(eq(fields.worksheetTemplateId, instance.worksheetTemplateId), eq(fields.active, true)));
              for (const f of rigoleWsFields) {
                if (!(RIGOLE_SYMS as readonly string[]).includes(f.symbol)) continue;
                const saved = input.values[f.id];
                if (saved?.type === 'number' && typeof saved.value === 'number' && Number.isFinite(saved.value)) {
                  rigoleNumBySymbol.set(f.symbol, saved.value);
                }
              }
              const bR = rigoleNumBySymbol.get('b_R') ?? null;
              const hR = rigoleNumBySymbol.get('h_R') ?? null;
              const lR = rigoleNumBySymbol.get('L_R') ?? null;
              if (bR != null && hR != null && lR != null) {
                // Gl.17: A_S,m = (b_R + h_R) · L_R + b_R · h_R
                geometryValueP = (bR + hR) * lR + bR * hR;
              }
            }
            // For other facility types with method='geometry', geometryValueP remains null →
            // materializeAsm returns indeterminate (geometry only valid for mulde/rigole).
          }

          // 4. Read remaining A138-12 inputs for materializeAsm.
          //    These are LOCAL to the consumer (A138-12) — read from persisted params only
          //    (the current save batch belongs to the producer worksheet, not A138-12).
          const readConsumerNum = async (sym: string): Promise<number | null> => {
            const fid = asmCIdBySymbol.get(sym);
            if (!fid) return null;
            const [row] = await tx
              .select({ valueNumber: projectParameters.valueNumber })
              .from(projectParameters)
              .where(and(
                eq(projectParameters.projectId, instance.projectId),
                eq(projectParameters.fieldId, fid),
              ))
              .limit(1);
            const v = row?.valueNumber != null ? Number(row.valueNumber) : null;
            return v != null && Number.isFinite(v) ? v : null;
          };
          const readConsumerEnum = async (sym: string): Promise<string | null> => {
            const fid = asmCIdBySymbol.get(sym);
            if (!fid) return null;
            const [row] = await tx
              .select({ valueEnum: projectParameters.valueEnum, valueText: projectParameters.valueText })
              .from(projectParameters)
              .where(and(
                eq(projectParameters.projectId, instance.projectId),
                eq(projectParameters.fieldId, fid),
              ))
              .limit(1);
            return row?.valueEnum ?? row?.valueText ?? null;
          };

          const pA_S_min = await readConsumerNum('A_S_min');
          const pA_S_max = await readConsumerNum('A_S_max');
          // A_C — cross-worksheet by symbol (same pattern as owner/loading branches).
          const crossAcFieldsP2 = await tx
            .select({ id: fields.id, symbol: fields.symbol, dataType: fields.dataType })
            .from(fields)
            .where(and(eq(fields.symbol, 'A_C'), eq(fields.active, true)));
          const crossAcFieldIdsP2 = crossAcFieldsP2.map((f) => f.id);
          let pA_C: number | null = null;
          if (crossAcFieldIdsP2.length > 0) {
            const crossAcParamsP2 = await tx
              .select({ fieldId: projectParameters.fieldId, valueNumber: projectParameters.valueNumber })
              .from(projectParameters)
              .where(and(
                eq(projectParameters.projectId, instance.projectId),
                inArray(projectParameters.fieldId, crossAcFieldIdsP2),
              ));
            for (const p of crossAcParamsP2) {
              if (p.valueNumber != null) {
                const v = Number(p.valueNumber);
                if (Number.isFinite(v)) { pA_C = v; break; }
              }
            }
          }
          const pRawBodenart = await readConsumerEnum('soil_bodenart_tab13');
          const pBodenart: Tab13Bodenart | null =
            pRawBodenart === 'mittel_feinsand' || pRawBodenart === 'schluffig' ? pRawBodenart : null;
          const pManualProvenance = await readConsumerEnum('a_s_m_provenance');
          let pManualValue: number | null = null;
          if (asmMethodP === 'manual') {
            pManualValue = await readConsumerNum('A_S_m');
          }

          // 5. Materialize A_S_m.
          const asmOutP = materializeAsm({
            method: asmMethodP,
            A_S_min: pA_S_min,
            A_S_max: pA_S_max,
            A_C: pA_C,
            bodenart: pBodenart,
            geometryValue: geometryValueP,
            manualValue: pManualValue,
            manualProvenance: pManualProvenance || null,
            facilityType: facilityTypeP,
            sourceWorksheet: 'A138-12',
          });

          // 6. UPSERT A_S_m onto the A138-12 consumer template's field id.
          //    Mirrors the owner-path UPSERT (isAsmSave block) exactly.
          const asmConsumerFieldId = asmCIdBySymbol.get('A_S_m');
          if (asmConsumerFieldId && asmOutP.A_S_m != null) {
            await tx
              .insert(projectParameters)
              .values([{
                projectId: instance.projectId,
                fieldId: asmConsumerFieldId,
                valueNumber: String(asmOutP.A_S_m),
                valueText: null,
                sourceType: 'derived',
                enteredBy: userId,
                enteredAt: now,
              }])
              .onConflictDoUpdate({
                target: [projectParameters.projectId, projectParameters.fieldId],
                set: {
                  valueNumber: sql`excluded.value_number`,
                  valueText: sql`excluded.value_text`,
                  sourceType: sql`excluded.source_type`,
                  enteredBy: sql`excluded.entered_by`,
                  enteredAt: now,
                },
              });
            writtenDerived.push({
              fieldId: asmConsumerFieldId,
              valueNumber: String(asmOutP.A_S_m),
              valueText: null,
            });

            // 7. Chained Tab.6 re-fire: A_S_m just changed → re-run materializeLoadingCheck
            //    with the fresh A_S_m so the Tab.6 verdict updates in the same save.
            //    We use asmOutP.A_S_m directly (no DB round-trip needed; the value is
            //    already consistent with the UPSERT above, visible within this transaction).
            //    Cross-worksheet inputs (A_C, flaechengruppe, bbz_thickness) read from
            //    project_parameters — identical to the loading producer branch.
            const chainedLcCrossFields = await tx
              .select({ id: fields.id, symbol: fields.symbol, dataType: fields.dataType })
              .from(fields)
              .where(and(
                inArray(fields.symbol, [...LOADING_CHECK_CROSS_SYMBOLS]),
                eq(fields.active, true),
              ));
            const chainedLcFieldIds = chainedLcCrossFields.map((f) => f.id);
            const chainedLcParams = chainedLcFieldIds.length > 0
              ? await tx
                  .select({
                    fieldId: projectParameters.fieldId,
                    valueNumber: projectParameters.valueNumber,
                    valueText: projectParameters.valueText,
                    valueEnum: projectParameters.valueEnum,
                  })
                  .from(projectParameters)
                  .where(and(
                    eq(projectParameters.projectId, instance.projectId),
                    inArray(projectParameters.fieldId, chainedLcFieldIds),
                  ))
              : [];
            const chainedLcFieldById = new Map(chainedLcCrossFields.map((f) => [f.id, f]));
            const chainedLcNumBySymbol = new Map<string, number | null>();
            const chainedLcTextBySymbol = new Map<string, string | null>();
            for (const p of chainedLcParams) {
              const f = chainedLcFieldById.get(p.fieldId);
              if (!f) continue;
              if (f.dataType === 'number' && !chainedLcNumBySymbol.has(f.symbol)) {
                const v = p.valueNumber != null ? Number(p.valueNumber) : null;
                chainedLcNumBySymbol.set(f.symbol, v != null && Number.isFinite(v) ? v : null);
              }
              if ((f.dataType === 'enum' || f.dataType === 'text') && !chainedLcTextBySymbol.has(f.symbol)) {
                chainedLcTextBySymbol.set(f.symbol, p.valueEnum ?? p.valueText ?? null);
              }
            }
            const chainedAC             = chainedLcNumBySymbol.get('A_C')             ?? null;
            const chainedFlaechengruppe = chainedLcTextBySymbol.get('flaechengruppe') ?? null;
            const chainedBbzThickness   = chainedLcNumBySymbol.get('bbz_thickness')   ?? null;

            const chainedLc = materializeLoadingCheck({
              A_C: chainedAC,
              A_S_m: asmOutP.A_S_m,
              flaechengruppe: chainedFlaechengruppe,
              bbz_thickness: chainedBbzThickness,
            });

            type AsmChainedLcRow = {
              projectId: string;
              fieldId: string;
              valueNumber: string | null;
              valueText: string | null;
              sourceType: 'derived';
              enteredBy: string;
              enteredAt: Date;
            };
            const chainedLcValueMap: Record<string, { valueNumber: string | null; valueText: string | null }> = {
              ac_as_ratio:              { valueNumber: chainedLc.ac_as_ratio != null ? String(chainedLc.ac_as_ratio) : null, valueText: null },
              ac_as_ratio_limit:        { valueNumber: chainedLc.ac_as_ratio_limit != null ? String(chainedLc.ac_as_ratio_limit) : null, valueText: null },
              ac_as_ratio_check:        { valueNumber: null, valueText: chainedLc.ac_as_ratio_check },
              ac_as_ratio_check_reason: { valueNumber: null, valueText: chainedLc.ac_as_ratio_check_reason },
            };
            const chainedLcRows: AsmChainedLcRow[] = LOADING_CHECK_OUTPUT_SYMBOLS
              .map((sym) => ({ sym, ...chainedLcValueMap[sym] }))
              .map((x) => ({ ...x, fieldId: asmCIdBySymbol.get(x.sym) }))
              .filter((x): x is typeof x & { fieldId: string } => x.fieldId != null)
              .map((x) => ({
                projectId: instance.projectId,
                fieldId: x.fieldId,
                valueNumber: x.valueNumber,
                valueText: x.valueText,
                sourceType: 'derived' as const,
                enteredBy: userId,
                enteredAt: now,
              }));

            if (chainedLcRows.length > 0) {
              await tx.insert(projectParameters).values(chainedLcRows).onConflictDoUpdate({
                target: [projectParameters.projectId, projectParameters.fieldId],
                set: {
                  valueNumber: sql`excluded.value_number`,
                  valueText: sql`excluded.value_text`,
                  sourceType: sql`excluded.source_type`,
                  enteredBy: sql`excluded.entered_by`,
                  enteredAt: now,
                },
              });
              for (const r of chainedLcRows) {
                writtenDerived.push({ fieldId: r.fieldId, valueNumber: r.valueNumber, valueText: r.valueText });
              }
            }
          }
        }
        // NOTE: 'basin' and 'surface' producer-fire paths not yet implemented.
        // Basin producer-fire would require the same consumer-template resolution fix
        // (resolve A138-13 by code), then run materializeBasinGoverning.
        // Surface is self-referential (producer == consumer) and already handled above.
        // Both are left as registry entries (for structural completeness + future extension)
        // but the dispatch here is a no-op for them.
      }
      // ── End Option A ─────────────────────────────────────────────────────

      // ONE batched insert for all audit rows — guarded so an empty-batch
      // topology-triggered save (no local field change) does not attempt to
      // insert zero audit rows (which would be a DB error).
      if (auditValues.length > 0) {
        await tx.insert(auditLog).values(auditValues);
      }

      await tx
        .update(worksheetInstances)
        .set({ updatedAt: new Date() })
        .where(eq(worksheetInstances.id, instance.id));
    });
  }

  return { ok: true, saved: savedCount, warnings, derived: writtenDerived };
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
