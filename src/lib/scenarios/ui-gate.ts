// src/lib/scenarios/ui-gate.ts
import 'server-only';
/**
 * Where the case UI may appear (final review A1-M1 + A1-M9): the project tab „Fälle" and the sheet switch
 * „Fälle anzeigen" are shown only when the staged tables exist and the viewer is an internal org member — the same
 * boundary the case actions enforce (`resolveProjectAccess` scope `internal`). Client collaborators never see them.
 * The sheet switch additionally needs the project setting „Fälle aktiv". Any lookup error fails closed.
 */
import { createClient } from '@/lib/supabase/server';
import { resolveProjectAccess } from '@/lib/auth/project-access';
import { loadScenarioSettings } from './load-baseline';

export type ScenarioUiGate = { tab: boolean; sheetSwitch: boolean };

export function scenarioUiGate(s: { available: boolean; internal: boolean; enabled: boolean }): ScenarioUiGate {
  const tab = s.available && s.internal;
  return { tab, sheetSwitch: tab && s.enabled };
}

async function isInternalViewer(projectId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return false;
    return (await resolveProjectAccess(userId, projectId)).scope === 'internal';
  } catch (e) {
    console.error('[scenarios] access lookup for the case UI failed — cases hidden', e);
    return false;
  }
}

export async function loadScenarioUiGate(projectId: string): Promise<ScenarioUiGate> {
  const [settings, internal] = await Promise.all([loadScenarioSettings(projectId), isInternalViewer(projectId)]);
  return scenarioUiGate({ ...settings, internal });
}
