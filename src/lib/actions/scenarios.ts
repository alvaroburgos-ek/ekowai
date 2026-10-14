'use server';
/**
 * What-if cases („Fälle") — server actions (spec §2, §3 step 7, §4). Cases live ONLY in project_scenarios /
 * project_scenario_overrides / project_scenario_settings; nothing here writes project_parameters, worksheet_instances,
 * approval_events or audit_log. Access: internal org members (same boundary as saveWorksheet — `db` bypasses RLS, so
 * this app-level check is the real boundary). Tolerates the staged tables being absent (42P01).
 */
import { and, asc, eq, ilike, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  projectScenarios, projectScenarioOverrides, projectScenarioSettings, fields, worksheetTemplates, worksheetInstances,
  standards, equations, projectParameters,
} from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';
import { resolveProjectAccess } from '@/lib/auth/project-access';
import { firstFreeSlot, type OverridableFieldHit, type ScenarioResultsPayload, type ScenarioSummary, type ScenarioValue } from '@/lib/scenarios/types';
import { isMissingRelationError, SCENARIOS_UNAVAILABLE } from '@/lib/scenarios/missing-table';
import { overrideRefusal, coerceOverrideValue, type OverrideFieldMeta } from '@/lib/scenarios/validate-override';
import { paramToFieldValue } from '@/lib/scenarios/values';
import { buildSummaries } from '@/lib/scenarios/summaries';
import { loadScenarioBaseline } from '@/lib/scenarios/load-baseline';
import { runScenarioCases } from '@/lib/scenarios/run-cases';

type Fail = { ok: false; error: string };
const LIMIT_MSG = 'Höchstens 6 aktive Fälle je Projekt — zuerst einen Fall archivieren.';
const NO_PROJECT_ACCESS = 'Kein Zugriff auf dieses Projekt.';
/** Same message for „does not exist" and „not yours" — a caller cannot probe foreign case ids. */
const CASE_NOT_FOUND = 'Fall nicht gefunden oder kein Zugriff.';
const ARCHIVED_MSG = 'Ein archivierter Fall kann nicht geändert werden.';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (x: unknown): x is string => typeof x === 'string' && UUID_RE.test(x);
const isFail = (x: unknown): x is Fail => typeof x === 'object' && x !== null && (x as { ok?: unknown }).ok === false;
const trimmed = (x: unknown): string => (typeof x === 'string' ? x.trim() : '');

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function requireInternal(projectId: string): Promise<{ userId: string } | Fail> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Nicht angemeldet.' };
  if (!isUuid(projectId)) return { ok: false, error: NO_PROJECT_ACCESS };
  const access = await resolveProjectAccess(userId, projectId);
  if (access.scope !== 'internal') return { ok: false, error: NO_PROJECT_ACCESS };
  return { userId };
}

type ScenarioDbRow = typeof projectScenarios.$inferSelect;

/** Authenticate, load the case, then check internal access to ITS project. Not found and no access look identical. */
async function requireScenario(scenarioId: string): Promise<{ userId: string; row: ScenarioDbRow } | Fail> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Nicht angemeldet.' };
  if (!isUuid(scenarioId)) return { ok: false, error: CASE_NOT_FOUND };
  const [row] = await db.select().from(projectScenarios).where(eq(projectScenarios.id, scenarioId)).limit(1);
  if (!row) return { ok: false, error: CASE_NOT_FOUND };
  const access = await resolveProjectAccess(userId, row.projectId);
  if (access.scope !== 'internal') return { ok: false, error: CASE_NOT_FOUND };
  return { userId, row };
}

async function tolerant<T>(fn: () => Promise<T>): Promise<T | Fail> {
  try { return await fn(); } catch (e) {
    if (isMissingRelationError(e)) return { ok: false, error: SCENARIOS_UNAVAILABLE.de };
    throw e;
  }
}

async function loadSummaries(projectId: string, includeArchived: boolean, ids?: string[]): Promise<ScenarioSummary[]> {
  const rows = await db.select().from(projectScenarios)
    .where(and(
      eq(projectScenarios.projectId, projectId),
      includeArchived ? undefined : isNull(projectScenarios.archivedAt),
      ids ? inArray(projectScenarios.id, ids) : undefined,
    ))
    .orderBy(asc(projectScenarios.sortOrder), asc(projectScenarios.createdAt));
  if (rows.length === 0) return [];
  const ov = await db
    .select({
      scenarioId: projectScenarioOverrides.scenarioId, fieldId: projectScenarioOverrides.fieldId, value: projectScenarioOverrides.value,
      baseValueAtCreation: projectScenarioOverrides.baseValueAtCreation, note: projectScenarioOverrides.note,
      symbol: fields.symbol, labelDe: fields.labelDe, labelEn: fields.labelEn, unit: fields.unit, dataType: fields.dataType,
      worksheetCode: worksheetTemplates.code, standardCode: standards.code,
    })
    .from(projectScenarioOverrides)
    .innerJoin(fields, eq(fields.id, projectScenarioOverrides.fieldId))
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(inArray(projectScenarioOverrides.scenarioId, rows.map((r) => r.id)))
    .orderBy(asc(worksheetTemplates.code), asc(fields.symbol));
  const fieldIds = [...new Set(ov.map((o) => o.fieldId))];
  const params = fieldIds.length === 0 ? [] : await db.select().from(projectParameters)
    .where(and(eq(projectParameters.projectId, projectId), inArray(projectParameters.fieldId, fieldIds)));
  return buildSummaries(rows, ov, new Map(params.map((p) => [p.fieldId, p])));
}

export async function listScenarios(projectId: string, opts?: { includeArchived?: boolean }):
  Promise<{ ok: true; available: boolean; enabled: boolean; scenarios: ScenarioSummary[] } | Fail> {
  const auth = await requireInternal(projectId);
  if (isFail(auth)) return auth;
  try {
    const scenarios = await loadSummaries(projectId, opts?.includeArchived === true);
    const [s] = await db.select({ enabled: projectScenarioSettings.enabled }).from(projectScenarioSettings)
      .where(eq(projectScenarioSettings.projectId, projectId)).limit(1);
    return { ok: true, available: true, enabled: s?.enabled === true, scenarios };
  } catch (e) {
    if (isMissingRelationError(e)) return { ok: true, available: false, enabled: false, scenarios: [] };
    throw e;
  }
}

/** Unique/check violation code, also when drizzle wraps the driver error in `cause`. */
function pgCode(e: unknown): string | undefined {
  let x: unknown = e;
  for (let i = 0; i < 5 && x != null && typeof x === 'object'; i++) {
    const c = (x as { code?: unknown }).code;
    if (typeof c === 'string') return c;
    x = (x as { cause?: unknown }).cause;
  }
  return undefined;
}

async function insertScenario(
  projectId: string, userId: string, values: { name: string; reason: string | null; includeInReport: boolean },
  copyFrom?: string,
): Promise<string | null> {
  try {
    return await db.transaction(async (tx) => {
      // Serialises concurrent creates per project so the slot pick + limit check are race-free.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${projectId}))`);
      const active = await tx.select({ s: projectScenarios.sortOrder }).from(projectScenarios)
        .where(and(eq(projectScenarios.projectId, projectId), isNull(projectScenarios.archivedAt)));
      const slot = firstFreeSlot(active.map((a) => a.s));
      if (slot == null) return null;
      const [row] = await tx.insert(projectScenarios)
        .values({ projectId, name: values.name, reason: values.reason, includeInReport: values.includeInReport, sortOrder: slot, createdBy: userId })
        .returning({ id: projectScenarios.id });
      if (copyFrom) {
        const src = await tx.select().from(projectScenarioOverrides).where(eq(projectScenarioOverrides.scenarioId, copyFrom));
        if (src.length > 0) {
          await tx.insert(projectScenarioOverrides).values(src.map((o) => ({
            scenarioId: row.id, fieldId: o.fieldId, value: o.value, baseValueAtCreation: o.baseValueAtCreation, note: o.note,
          })));
        }
      }
      return row.id;
    });
  } catch (e) {
    // Belt and braces: the partial unique index on active slots (+ slot check 1–6) refuses a 7th active case even without the lock.
    const code = pgCode(e);
    if (code === '23505' || code === '23514') return null;
    throw e;
  }
}

export async function createScenario(input: { projectId: string; name: string; reason?: string | null; includeInReport?: boolean }):
  Promise<{ ok: true; scenario: ScenarioSummary } | Fail> {
  const auth = await requireInternal(input?.projectId);
  if (isFail(auth)) return auth;
  const name = trimmed(input.name);
  if (!name) return { ok: false, error: 'Name des Falls fehlt.' };
  return tolerant(async () => {
    const id = await insertScenario(input.projectId, auth.userId, { name, reason: trimmed(input.reason) || null, includeInReport: input.includeInReport === true });
    if (!id) return { ok: false as const, error: LIMIT_MSG };
    const [scenario] = await loadSummaries(input.projectId, true, [id]);
    return { ok: true as const, scenario };
  });
}

export async function duplicateScenario(scenarioId: string, name?: string): Promise<{ ok: true; scenario: ScenarioSummary } | Fail> {
  return tolerant(async () => {
    const auth = await requireScenario(scenarioId);
    if (isFail(auth)) return auth;
    const src = auth.row;
    const id = await insertScenario(src.projectId, auth.userId, {
      name: trimmed(name) || `${src.name} (Kopie)`, reason: src.reason, includeInReport: false,
    }, src.id);
    if (!id) return { ok: false as const, error: LIMIT_MSG };
    const [scenario] = await loadSummaries(src.projectId, true, [id]);
    return { ok: true as const, scenario };
  });
}

export async function updateScenario(scenarioId: string, patch: { name?: string; reason?: string | null; includeInReport?: boolean }):
  Promise<{ ok: true } | Fail> {
  return tolerant(async () => {
    const auth = await requireScenario(scenarioId);
    if (isFail(auth)) return auth;
    const p = patch ?? {};
    if (p.name !== undefined && !trimmed(p.name)) return { ok: false as const, error: 'Name des Falls fehlt.' };
    await db.update(projectScenarios).set({
      ...(p.name !== undefined ? { name: trimmed(p.name) } : {}),
      ...(p.reason !== undefined ? { reason: trimmed(p.reason) || null } : {}),
      ...(p.includeInReport !== undefined ? { includeInReport: p.includeInReport === true } : {}),
      updatedAt: new Date(),
    }).where(eq(projectScenarios.id, auth.row.id));
    return { ok: true as const };
  });
}

export async function archiveScenario(scenarioId: string): Promise<{ ok: true } | Fail> {
  return tolerant(async () => {
    const auth = await requireScenario(scenarioId);
    if (isFail(auth)) return auth;
    if (auth.row.archivedAt) return { ok: true as const }; // idempotent: the first archive date stays
    await db.update(projectScenarios).set({ archivedAt: new Date(), updatedAt: new Date() }).where(eq(projectScenarios.id, auth.row.id));
    return { ok: true as const };
  });
}

/** Field metadata + the overridable rule inputs for a set of field ids, scoped to the project's live sheets. */
async function overridableContext(projectId: string, fieldIds: string[]) {
  const metas = fieldIds.length === 0 ? [] : await db
    .select({
      id: fields.id, symbol: fields.symbol, labelDe: fields.labelDe, labelEn: fields.labelEn, unit: fields.unit, dataType: fields.dataType,
      active: fields.active, widget: fields.widget, uiConfig: fields.uiConfig, enumValues: fields.enumValues, validationRules: fields.validationRules,
      templateId: fields.worksheetTemplateId, worksheetCode: worksheetTemplates.code, standardCode: standards.code,
    })
    .from(fields)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(inArray(fields.id, fieldIds));
  const templateIds = [...new Set(metas.map((m) => m.templateId))];
  const live = templateIds.length === 0 ? [] : await db.select({ t: worksheetInstances.worksheetTemplateId }).from(worksheetInstances)
    .where(and(eq(worksheetInstances.projectId, projectId), inArray(worksheetInstances.worksheetTemplateId, templateIds), ne(worksheetInstances.status, 'deactivated')));
  const eqs = templateIds.length === 0 ? [] : await db.select({ id: equations.id, outputSymbol: equations.outputSymbol, templateId: equations.worksheetTemplateId })
    .from(equations).where(inArray(equations.worksheetTemplateId, templateIds));
  const params = fieldIds.length === 0 ? [] : await db.select().from(projectParameters)
    .where(and(eq(projectParameters.projectId, projectId), inArray(projectParameters.fieldId, fieldIds)));
  return {
    metaById: new Map(metas.map((m) => [m.id, m])),
    liveTemplates: new Set(live.map((l) => l.t)),
    eqsByTemplate: (t: string) => eqs.filter((e) => e.templateId === t),
    paramById: new Map(params.map((p) => [p.fieldId, p])),
  };
}
const asMeta = (m: { id: string; symbol: string; labelDe: string; dataType: string; active: boolean; widget: string | null; uiConfig: unknown; enumValues: unknown; validationRules: unknown }): OverrideFieldMeta => ({
  id: m.id, symbol: m.symbol, labelDe: m.labelDe, dataType: m.dataType, active: m.active, widget: m.widget, uiConfig: m.uiConfig,
  enumValues: (m.enumValues as Array<{ value: string }> | null) ?? null,
  validationRules: (m.validationRules as OverrideFieldMeta['validationRules']) ?? null,
});

export async function setScenarioOverrides(scenarioId: string, entries: Array<{ fieldId: string; value: unknown; note: string }>):
  Promise<{ ok: true; scenario: ScenarioSummary } | Fail> {
  return tolerant(async () => {
    const auth = await requireScenario(scenarioId);
    if (isFail(auth)) return auth;
    const row = auth.row;
    if (row.archivedAt) return { ok: false as const, error: ARCHIVED_MSG };
    if (!Array.isArray(entries) || entries.length === 0) return { ok: false as const, error: 'Keine Werte übergeben.' };
    const ctx = await overridableContext(row.projectId, [...new Set(entries.map((e) => e?.fieldId).filter(isUuid))]);
    const errors: string[] = [];
    const writes: Array<{ fieldId: string; value: ScenarioValue; base: ScenarioValue | null; note: string }> = [];
    for (const e of entries) {
      const m = isUuid(e?.fieldId) ? ctx.metaById.get(e.fieldId) : undefined;
      if (!m || !ctx.liveTemplates.has(m.templateId)) { errors.push(`Feld ${String(e?.fieldId)} gehört zu keinem Arbeitsblatt dieses Projekts.`); continue; }
      const note = trimmed(e.note);
      if (!note) { errors.push(`${m.labelDe} (${m.symbol}): Notiz zur Herkunft der Annahme fehlt.`); continue; }
      const stored = ctx.paramById.get(m.id);
      const refusal = overrideRefusal(asMeta(m), ctx.eqsByTemplate(m.templateId), stored?.sourceType ?? null);
      if (refusal) { errors.push(refusal); continue; }
      const c = coerceOverrideValue(asMeta(m), e.value);
      if (!c.ok) { errors.push(c.error); continue; }
      writes.push({ fieldId: m.id, value: c.value, base: paramToFieldValue(m.dataType, stored), note });
    }
    // All-or-nothing: any refused entry ⇒ nothing is written.
    if (errors.length > 0) return { ok: false as const, error: errors.join(' · ') };
    await db.transaction(async (tx) => {
      for (const w of writes) {
        await tx.insert(projectScenarioOverrides)
          .values({ scenarioId: row.id, fieldId: w.fieldId, value: w.value, baseValueAtCreation: w.base, note: w.note })
          .onConflictDoUpdate({
            target: [projectScenarioOverrides.scenarioId, projectScenarioOverrides.fieldId],
            set: { value: w.value, note: w.note, updatedAt: new Date() }, // base_value_at_creation stays (spec §2 drift)
          });
      }
      await tx.update(projectScenarios).set({ updatedAt: new Date() }).where(eq(projectScenarios.id, row.id));
    });
    const [scenario] = await loadSummaries(row.projectId, true, [row.id]);
    return { ok: true as const, scenario };
  });
}

export async function removeScenarioOverride(scenarioId: string, fieldId: string): Promise<{ ok: true } | Fail> {
  return tolerant(async () => {
    const auth = await requireScenario(scenarioId);
    if (isFail(auth)) return auth;
    if (auth.row.archivedAt) return { ok: false as const, error: ARCHIVED_MSG };
    if (!isUuid(fieldId)) return { ok: true as const }; // nothing to remove
    await db.delete(projectScenarioOverrides)
      .where(and(eq(projectScenarioOverrides.scenarioId, auth.row.id), eq(projectScenarioOverrides.fieldId, fieldId)));
    return { ok: true as const };
  });
}

export async function setScenariosEnabled(projectId: string, enabled: boolean): Promise<{ ok: true } | Fail> {
  const auth = await requireInternal(projectId);
  if (isFail(auth)) return auth;
  const on = enabled === true;
  return tolerant(async () => {
    await db.insert(projectScenarioSettings).values({ projectId, enabled: on, updatedBy: auth.userId, updatedAt: new Date() })
      .onConflictDoUpdate({ target: projectScenarioSettings.projectId, set: { enabled: on, updatedBy: auth.userId, updatedAt: new Date() } });
    return { ok: true as const };
  });
}

/** ILIKE pattern with the user's text taken literally (`k_f` must not match `kxf`). */
const likeContains = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export async function searchOverridableFields(projectId: string, query: string): Promise<{ ok: true; fields: OverridableFieldHit[] } | Fail> {
  const auth = await requireInternal(projectId);
  if (isFail(auth)) return auth;
  const q = trimmed(query);
  if (q.length < 2) return { ok: true, fields: [] };
  const like = likeContains(q.slice(0, 100));
  const hits = await db
    .select({ id: fields.id })
    .from(fields)
    .innerJoin(worksheetInstances, and(eq(worksheetInstances.worksheetTemplateId, fields.worksheetTemplateId), eq(worksheetInstances.projectId, projectId), ne(worksheetInstances.status, 'deactivated')))
    .where(and(eq(fields.active, true), ne(fields.dataType, 'json'), or(ilike(fields.labelDe, like), ilike(fields.labelEn, like), ilike(fields.symbol, like))))
    .limit(60);
  const ctx = await overridableContext(projectId, hits.map((h) => h.id));
  const out: OverridableFieldHit[] = [];
  for (const h of hits) {
    const m = ctx.metaById.get(h.id);
    if (!m) continue;
    const stored = ctx.paramById.get(m.id);
    if (overrideRefusal(asMeta(m), ctx.eqsByTemplate(m.templateId), stored?.sourceType ?? null)) continue;
    out.push({
      fieldId: m.id, symbol: m.symbol, labelDe: m.labelDe, labelEn: m.labelEn ?? null, unit: m.unit ?? null, dataType: m.dataType,
      enumValues: (m.enumValues as OverridableFieldHit['enumValues']) ?? null, worksheetCode: m.worksheetCode, standardCode: m.standardCode,
      realValue: paramToFieldValue(m.dataType, stored),
    });
    if (out.length >= 30) break;
  }
  return { ok: true, fields: out };
}

/** Spec §3 step 7: computed on request, nothing persisted; per-request memoisation (one baseline, one Real run). */
export async function getScenarioResults(projectId: string, standardCode: string, scenarioIds?: string[]):
  Promise<({ ok: true } & ScenarioResultsPayload) | Fail> {
  const auth = await requireInternal(projectId);
  if (isFail(auth)) return auth;
  const code = trimmed(standardCode);
  const baseline = code ? await loadScenarioBaseline(projectId, code) : null;
  if (!baseline) return { ok: false, error: `Norm ${code} hat in diesem Projekt keine Arbeitsblätter.` };
  const requested = Array.isArray(scenarioIds) ? [...new Set(scenarioIds.map((x) => String(x)))] : undefined;
  let available = true;
  let summaries: ScenarioSummary[] = [];
  const ignored: string[] = [];
  try {
    // Active cases of THIS project only — archived and foreign ids never reach the runner.
    const active = await loadSummaries(projectId, false);
    if (requested) {
      summaries = active.filter((s) => requested.includes(s.id));
      for (const id of requested) if (!summaries.some((s) => s.id === id)) ignored.push(id);
    } else {
      summaries = active;
    }
  } catch (e) {
    if (!isMissingRelationError(e)) throw e;
    available = false;
    if (requested) ignored.push(...requested);
  }
  // Per-case containment: a case that throws becomes an error entry; Real and the other cases still render.
  const { real, cases } = runScenarioCases(baseline, summaries);
  return { ok: true, available, standardCode: baseline.standardCode, real, cases, ignoredScenarioIds: ignored };
}
