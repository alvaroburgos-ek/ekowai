'use server';
import { db } from '@/lib/db';
import {
  projectParameters,
  fields,
  worksheetInstances,
  auditLog,
} from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { userHasProjectAccess } from '@/lib/db/queries/worksheet';
import { isWorksheetEditable, type WorksheetStatus } from '@/lib/state-machine';
import { parseSetClientSupplied } from './client-supplied-core';

export type SetClientSuppliedResult = { ok: true } | { ok: false; error: string };

/**
 * Mark (or unmark) a saved parameter as "Kundenangabe" — the value was
 * delivered by the client, not determined by EKOWAI (AGB input-error
 * carve-out, roadmap Stage 5).
 *
 * - Auth: session user must be a member of the owning project's org
 *   (`db` runs as postgres and bypasses RLS, so the org-membership join IS
 *   the access check — mirrors effort.ts).
 * - Write-lock: refuses when the project's instance of the field's worksheet
 *   template is approved/final (same integrity boundary saveWorksheet
 *   enforces; field → template → instance → isWorksheetEditable).
 * - UPDATEs the existing project_parameters row ONLY — flagging without a
 *   saved value is meaningless, so no row means `ok:false 'Erst Wert
 *   speichern'`. saveWorksheet is deliberately untouched: its upsert does not
 *   write client_supplied, so re-saving a value never clears the flag.
 */
export async function setClientSupplied(
  projectId: string,
  fieldId: string,
  clientSupplied: boolean,
): Promise<SetClientSuppliedResult> {
  const parsed = parseSetClientSupplied({ projectId, fieldId, clientSupplied });
  if (!parsed.success) return { ok: false, error: 'Ungültige Eingabe' };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Not authenticated' };
  const userId = auth.user.id;

  if (!(await userHasProjectAccess(parsed.data.projectId, userId))) {
    return { ok: false, error: 'Projekt nicht gefunden oder kein Zugriff' };
  }

  // Write-lock: resolve the owning worksheet-instance status for this field
  // within this project (field → worksheetTemplateId → project's instance).
  // Also blocks IDOR: a field id outside the project's instantiated
  // worksheets resolves to no row.
  const [instanceRow] = await db
    .select({ status: worksheetInstances.status })
    .from(fields)
    .innerJoin(
      worksheetInstances,
      eq(worksheetInstances.worksheetTemplateId, fields.worksheetTemplateId),
    )
    .where(
      and(
        eq(fields.id, parsed.data.fieldId),
        eq(worksheetInstances.projectId, parsed.data.projectId),
      ),
    )
    .limit(1);
  if (!instanceRow) return { ok: false, error: 'Feld gehört zu keinem Arbeitsblatt dieses Projekts' };
  if (!isWorksheetEditable(instanceRow.status as WorksheetStatus)) {
    return {
      ok: false,
      error: 'Arbeitsblatt ist genehmigt/final und schreibgeschützt — Kundenangabe-Kennzeichnung kann nicht geändert werden.',
    };
  }

  try {
    // UPDATE the existing row only — never create one (a flag without a
    // saved value would be an orphan parameter row).
    const updated = await db
      .update(projectParameters)
      .set({ clientSupplied: parsed.data.clientSupplied })
      .where(
        and(
          eq(projectParameters.projectId, parsed.data.projectId),
          eq(projectParameters.fieldId, parsed.data.fieldId),
        ),
      )
      .returning({ id: projectParameters.id });
    if (updated.length === 0) return { ok: false, error: 'Erst Wert speichern' };

    await db.insert(auditLog).values({
      actorId: userId,
      actorRole: 'engineer',
      projectId: parsed.data.projectId,
      tableName: 'project_parameters',
      recordId: parsed.data.fieldId,
      action: 'update',
      changes: { client_supplied: parsed.data.clientSupplied },
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
