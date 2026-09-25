'use server';

import { db } from '@/lib/db';
import { worksheetInstances, worksheetTemplates, standards } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { resolveProjectAccess, assertInternal, AccessDeniedError } from '@/lib/auth/project-access';
import { loadCaptureInputs, buildSnapshotPayload } from '@/lib/snapshots/capture';
import { draftRationale } from '@/lib/llm/client';
import type { RationaleRequest } from '@/lib/llm/types';

export type DraftRationaleResult =
  | { ok: true; text: string; provider: string }
  | { ok: false; error: string };

/**
 * Generate an AI rationale/explanation text for one worksheet instance.
 *
 * Read-only: assembles the current inputs + freshly-computed equation outputs
 * (via the same `loadCaptureInputs` + `buildSnapshotPayload` path the snapshot
 * capture uses — but live, not from a stored snapshot) and hands them to the
 * Mistral-backed `draftRationale`. v1 does NOT persist the text; the client
 * displays it. Auth mirrors `saveWorksheet`: internal org members only.
 */
export async function draftWorksheetRationale(input: {
  worksheetInstanceId: string;
  locale: 'de' | 'en';
}): Promise<DraftRationaleResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Not authenticated' };
  const userId = auth.user.id;

  // Access boundary — `db` uses the postgres role and bypasses RLS, so this
  // app-level check is the real gate (same pattern as saveWorksheet).
  const [instance] = await db
    .select({ id: worksheetInstances.id, projectId: worksheetInstances.projectId })
    .from(worksheetInstances)
    .where(eq(worksheetInstances.id, input.worksheetInstanceId))
    .limit(1);
  if (!instance) return { ok: false, error: 'Worksheet not found or no access' };

  try {
    assertInternal(await resolveProjectAccess(userId, instance.projectId));
  } catch (e) {
    if (e instanceof AccessDeniedError) return { ok: false, error: 'Worksheet not found or no access' };
    throw e;
  }

  // regulation (standard code) + version for the prompt header.
  const [meta] = await db
    .select({ regulation: standards.code, regulationVersion: standards.version })
    .from(worksheetInstances)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, worksheetInstances.worksheetTemplateId))
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(eq(worksheetInstances.id, input.worksheetInstanceId))
    .limit(1);
  if (!meta) return { ok: false, error: 'Worksheet not found or no access' };

  // Live inputs + computed outputs (fresh evaluation, no stored snapshot).
  const captured = await loadCaptureInputs({ worksheetInstanceId: input.worksheetInstanceId });
  if (!captured) return { ok: false, error: 'Worksheet not found or no access' };

  const payload = buildSnapshotPayload({
    fields: captured.fields,
    equations: captured.equations,
    complianceRequirements: captured.complianceRequirements,
    parameters: captured.parameters,
    worksheetCode: captured.worksheetCode,
    ambiguousSymbols: captured.ambiguousSymbols,
  });

  // inputs: symbol → entered/derived value (payload.parameters is keyed by
  // fieldId; re-key by field symbol so the prompt is readable). JSON carriers
  // are skipped — too structured for a prose prompt.
  const symbolByFieldId = new Map(captured.fields.map((f) => [f.id, f.symbol]));
  const inputs: RationaleRequest['inputs'] = {};
  for (const [fieldId, pv] of Object.entries(payload.parameters)) {
    const symbol = symbolByFieldId.get(fieldId);
    if (!symbol || pv.type === 'json') continue;
    inputs[symbol] = pv.value as number | string | boolean | null;
  }

  // computed: outputSymbol (fallback equationNumber) → computed value.
  const computed: RationaleRequest['computed'] = {};
  for (const eq of captured.equations) {
    const out = payload.equationOutputs[eq.equationNumber];
    if (out && out.kind === 'computed') {
      computed[eq.outputSymbol ?? eq.equationNumber] = out.value;
    }
  }

  if (Object.keys(inputs).length === 0 && Object.keys(computed).length === 0) {
    return {
      ok: false,
      error: input.locale === 'de'
        ? 'Keine Eingaben vorhanden — bitte zuerst Werte erfassen.'
        : 'No inputs yet — please enter values first.',
    };
  }

  try {
    const { text, provider } = await draftRationale({
      worksheetId: captured.worksheetCode,
      regulation: meta.regulation,
      regulationVersion: meta.regulationVersion,
      inputs,
      computed,
      locale: input.locale,
    });
    return { ok: true, text, provider };
  } catch (e) {
    console.error('[rationale] draft failed', e);
    return {
      ok: false,
      error: input.locale === 'de'
        ? 'KI-Erläuterung konnte nicht erstellt werden. Bitte später erneut versuchen.'
        : 'Could not generate the AI rationale. Please try again later.',
    };
  }
}
