import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import type { db } from '@/lib/db';
import { projectParameters, worksheetInstances } from '@/lib/db/schema';
import { consumerTemplatesReferencing, planStaleFlags, templateHasVisibilityRules } from '@/lib/eval/stale-flags';
import { inheritedFieldsFromMeta, type StandardVisibilityMeta } from '@/lib/actions/approval-gate';
import type { RequiredFieldCountArgs } from '@/lib/projects/required-field-counts';
import { isWorksheetEditable, type WorksheetStatus } from '@/lib/state-machine';

/** The client the pass runs on: the save's SAVEPOINT handle (`tx.transaction(async (sp) => …)`). */
export type StalePassClient = Pick<typeof db, 'select' | 'update'>;

export type StalePassContext = {
  projectId: string;
  /** The saved instance's template. */
  worksheetTemplateId: string;
  /** Its code (consumer_worksheets lookup of the inherited fields); null ⇒ no inherited fields. */
  savedTemplateCode: string | null;
  /** Field ids whose parameter rows this save wrote. */
  writtenFieldIds: ReadonlyArray<string>;
  /** Field id → symbol of the written fields. */
  symbolById: ReadonlyMap<string, string>;
  /** The save's shared standard metadata loader (cached per save). */
  getVisMeta: (client: Pick<typeof db, 'select'>) => Promise<StandardVisibilityMeta | null>;
  /** Visibility args as of NOW (parameters re-read on `client`; metadata shared). */
  loadVisNow: (client: Pick<typeof db, 'select'>) => Promise<{ meta: StandardVisibilityMeta; args: RequiredFieldCountArgs } | null>;
};

/**
 * U-1 (R-12) + M-1 (R-13) + R-14 + M-4: the save path's stale-flag pass, extracted from `saveWorksheet` (O-9) so its
 * UPDATE wiring is unit-testable. Behaviour unchanged:
 *   - L-3 fast path: the saved template has no visibility rule and no other template reads a written symbol ⇒ ONE
 *     UPDATE clearing `is_stale` on the written rows of this project that carry the flag; nothing is read beyond the
 *     shared metadata.
 *   - otherwise: parameters re-read (`loadVisNow`); M-4 one read of the consumer instances (only when there are
 *     consumers) — approved / final / deactivated consumer templates are never flagged; `planStaleFlags` decides;
 *     ≤ 2 UPDATEs (set, clear), each scoped to `project_id` + the planned field ids; an empty set issues no UPDATE.
 */
export async function runStaleFlagPass(sp: StalePassClient, ctx: StalePassContext): Promise<void> {
  const writtenIds = [...ctx.writtenFieldIds];
  const writtenSymbols = new Set(writtenIds.map((id) => ctx.symbolById.get(id)).filter((s): s is string => s != null));
  // The rule rows come from the shared per-save metadata (fix round 2: no separate rule SELECTs).
  const stMeta = await ctx.getVisMeta(sp);
  const ownHasRules = stMeta ? templateHasVisibilityRules(ctx.worksheetTemplateId, stMeta.fields, stMeta.sections) : false;
  const consumers = stMeta
    ? consumerTemplatesReferencing(writtenSymbols, stMeta.fields, stMeta.sections, ctx.worksheetTemplateId)
    : new Set<string>();
  // Post-everything view: parameters re-read (this tx sees its own writes and the materialised rows).
  const stVis = ownHasRules || consumers.size > 0 ? await ctx.loadVisNow(sp) : null;
  if (!stVis) {
    // Nothing on this sheet can be hidden and no other sheet reads what was written: only clear flags here.
    await sp
      .update(projectParameters)
      .set({ isStale: false })
      .where(and(
        eq(projectParameters.projectId, ctx.projectId),
        inArray(projectParameters.fieldId, writtenIds),
        eq(projectParameters.isStale, true),
      ));
    return;
  }
  // M-4 (fix round 4): a consumer sheet whose instance is approved / final / deactivated is never flagged
  // behind the engineer's back (post-approval immutability; it is re-opened explicitly). One read, only when
  // there are consumers. The own sheet needs no guard: saveWorksheet refuses a locked sheet before any write.
  const lockedTemplateIds = new Set<string>();
  if (consumers.size > 0) {
    const consumerInstances = await sp
      .select({ templateId: worksheetInstances.worksheetTemplateId, status: worksheetInstances.status })
      .from(worksheetInstances)
      .where(and(eq(worksheetInstances.projectId, ctx.projectId), inArray(worksheetInstances.worksheetTemplateId, [...consumers])));
    for (const ci of consumerInstances) {
      if (!isWorksheetEditable(ci.status as WorksheetStatus)) lockedTemplateIds.add(ci.templateId);
    }
  }
  const { setStale, clearStale } = planStaleFlags({
    visArgs: stVis.args,
    ownTemplateId: ctx.worksheetTemplateId,
    inheritedFields: ctx.savedTemplateCode
      ? inheritedFieldsFromMeta(stVis.meta, ctx.worksheetTemplateId, ctx.savedTemplateCode)
          .map((f) => ({ id: f.id, symbol: f.symbol, dataType: f.dataType }))
      : [],
    writtenFieldIds: new Set(writtenIds),
    consumerTemplateIds: consumers,
    lockedTemplateIds,
  });
  if (setStale.length > 0) {
    await sp
      .update(projectParameters)
      .set({ isStale: true })
      .where(and(eq(projectParameters.projectId, ctx.projectId), inArray(projectParameters.fieldId, setStale)));
  }
  if (clearStale.length > 0) {
    await sp
      .update(projectParameters)
      .set({ isStale: false })
      .where(and(eq(projectParameters.projectId, ctx.projectId), inArray(projectParameters.fieldId, clearStale)));
  }
}
