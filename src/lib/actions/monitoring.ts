'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  fields,
  maintenanceSchedules,
  monitoringEntries,
  projectDocuments,
  projectParameters,
  profiles,
  projectStandards,
  standards,
} from '@/lib/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { userHasProjectAccess } from '@/lib/db/queries/worksheet';
import { parseAddMonitoringEntry } from './monitoring-core';
import { dueStatus, type DueStatus } from '@/lib/monitoring/schedule';
import {
  FACILITY_TYPE_SYMBOLS,
  facilityValueToGroup,
  resolveFacilityTypeValue,
} from '@/lib/monitoring/grouping';

export type MonitoringEntryView = {
  id: string;
  entryDate: string;
  /** One of the six app-side categories (monitoring-core.ts). */
  category: string;
  note: string | null;
  documentId: string | null;
  documentTitle: string | null;
  documentCitationLabel: string | null;
  standardId: string | null;
  standardCode: string | null;
  standardTitleDe: string | null;
  createdAt: Date;
  userName: string | null;
};

/** Resolve the session user id or throw (mirrors addEffortEntry). */
async function requireSessionUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not authenticated');
  return auth.user.id;
}

function revalidateOverview() {
  // The Monitoring-Journal renders on the project overview page.
  revalidatePath('/[locale]/projects/[id]', 'page');
}

/**
 * Add a monitoring-journal entry for a project (documentation only — no
 * parameter values/units; the time-series schema follows with Stage 8).
 * Validation lives in `monitoring-core.ts`. `db` runs as postgres and
 * bypasses RLS, so the org-membership join inside `userHasProjectAccess`
 * IS the access check (mirrors addEffortEntry).
 */
export async function addMonitoringEntry(input: {
  projectId: string;
  entryDate: string;
  category: string;
  note?: string;
  documentId?: string;
  standardId?: string;
}): Promise<{ id: string }> {
  const parsed = parseAddMonitoringEntry(input);
  const userId = await requireSessionUserId();

  if (!(await userHasProjectAccess(parsed.projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  // A linked document must belong to the same project — never link across.
  if (parsed.documentId) {
    const [doc] = await db
      .select({ projectId: projectDocuments.projectId })
      .from(projectDocuments)
      .where(eq(projectDocuments.id, parsed.documentId))
      .limit(1);
    if (!doc || doc.projectId !== parsed.projectId) {
      throw new Error('Dokument gehört nicht zu diesem Projekt');
    }
  }

  // A linked guideline must be one of the project's ATTACHED standards
  // (active row in project_standards) — never an arbitrary library standard.
  if (parsed.standardId) {
    const [attached] = await db
      .select({ id: projectStandards.id })
      .from(projectStandards)
      .where(
        and(
          eq(projectStandards.projectId, parsed.projectId),
          eq(projectStandards.standardId, parsed.standardId),
          eq(projectStandards.status, 'active'),
        ),
      )
      .limit(1);
    if (!attached) {
      throw new Error('Regelwerk ist diesem Projekt nicht zugeordnet');
    }
  }

  const [row] = await db
    .insert(monitoringEntries)
    .values({
      projectId: parsed.projectId,
      entryDate: parsed.entryDate,
      category: parsed.category,
      note: parsed.note && parsed.note !== '' ? parsed.note : null,
      documentId: parsed.documentId ?? null,
      standardId: parsed.standardId ?? null,
      createdBy: userId,
    })
    .returning({ id: monitoringEntries.id });

  revalidateOverview();
  return { id: row.id };
}

/**
 * Delete a monitoring entry by id. Any member of the owning project's org may
 * delete (mirrors deleteEffortEntry — the simplest existing per-row pattern).
 */
export async function deleteMonitoringEntry(id: string): Promise<void> {
  const [entry] = await db
    .select({ projectId: monitoringEntries.projectId })
    .from(monitoringEntries)
    .where(eq(monitoringEntries.id, id))
    .limit(1);
  if (!entry) return; // already gone — nothing to delete

  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(entry.projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  await db.delete(monitoringEntries).where(eq(monitoringEntries.id, id));
  revalidateOverview();
}

export type MaintenanceTaskView = {
  id: string;
  title: string;
  /** One of the six monitoring categories (monitoring-core.ts). */
  category: string;
  /** VERBATIM printed interval wording, e.g. "halbjährlich". */
  intervalText: string | null;
  /** Numeric interpretation in months; null = no fixed printed number. */
  intervalMonths: number | null;
  clauseReference: string | null;
  /** SR-1: verbatim quote from the standard's own text + page ref. */
  sourceQuote: string;
  status: DueStatus;
};

export type MaintenancePlanStandardView = {
  standardId: string;
  standardCode: string;
  standardTitleDe: string;
  tasks: MaintenanceTaskView[];
  /**
   * The project's stored facility-type value (project_parameters of the
   * facility-type field symbols, value_enum/value_text) — null when the
   * worksheet has no facility type yet. Same value for every standard of the
   * plan; carried per row so the view type stays a flat array.
   */
  facilityTypeValue: string | null;
  /**
   * E-table group key matched from the facility type (e.g. 'E.2') or null.
   * The UI auto-expands + tags this group; it never hides the others.
   */
  matchedGroup: string | null;
};

/**
 * The project's maintenance plan (read-only): the active maintenance_schedules
 * rows of the project's ATTACHED standards, grouped per standard, each with
 * its due-state computed against the project's Monitoring-Journal (pure core
 * src/lib/monitoring/schedule.ts — a journal entry ticks a duty off only when
 * category matches AND the entry is linked to the duty's standard). Standards
 * without schedule rows are omitted, so the UI can render nothing when the
 * library has no duties for this project.
 */
export async function listMaintenancePlan(
  projectId: string,
): Promise<MaintenancePlanStandardView[]> {
  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  // The project's attached (active) standards — the plan's grouping axis.
  const attached = await db
    .select({
      standardId: projectStandards.standardId,
      code: standards.code,
      titleDe: standards.titleDe,
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
  if (attached.length === 0) return [];

  const standardIds = attached.map((s) => s.standardId);
  const scheduleRows = await db
    .select({
      id: maintenanceSchedules.id,
      standardId: maintenanceSchedules.standardId,
      title: maintenanceSchedules.title,
      category: maintenanceSchedules.category,
      intervalText: maintenanceSchedules.intervalText,
      intervalMonths: maintenanceSchedules.intervalMonths,
      clauseReference: maintenanceSchedules.clauseReference,
      sourceQuote: maintenanceSchedules.sourceQuote,
    })
    .from(maintenanceSchedules)
    .where(
      and(
        inArray(maintenanceSchedules.standardId, standardIds),
        eq(maintenanceSchedules.active, true),
      ),
    )
    .orderBy(maintenanceSchedules.title);
  if (scheduleRows.length === 0) return [];

  // The journal slice the due-state rule needs (entryDate/category/standard).
  const journal = await db
    .select({
      entryDate: monitoringEntries.entryDate,
      category: monitoringEntries.category,
      standardId: monitoringEntries.standardId,
    })
    .from(monitoringEntries)
    .where(eq(monitoringEntries.projectId, projectId));

  // The project's chosen facility type (Anlagentyp) — read from
  // project_parameters via the field SYMBOLS (facility_type_dimensioned wins
  // over a138_anlagentyp_gewaehlt; resolution is the pure grouping core).
  // Maps onto an E-table group so the UI can focus the matching sub-group.
  const facilityRows = await db
    .select({
      symbol: fields.symbol,
      valueEnum: projectParameters.valueEnum,
      valueText: projectParameters.valueText,
      enteredAt: projectParameters.enteredAt,
    })
    .from(projectParameters)
    .innerJoin(fields, eq(fields.id, projectParameters.fieldId))
    .where(
      and(
        eq(projectParameters.projectId, projectId),
        inArray(fields.symbol, [...FACILITY_TYPE_SYMBOLS]),
      ),
    );
  const facilityTypeValue = resolveFacilityTypeValue(facilityRows);
  const matchedGroup = facilityValueToGroup(facilityTypeValue);

  // Server-local ISO date — the core itself stays clock-free (deterministic
  // `today` param; mirrors todayLocalIso in monitoring-journal.tsx).
  const now = new Date();
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);

  return attached
    .map((s) => ({
      standardId: s.standardId,
      standardCode: s.code,
      standardTitleDe: s.titleDe,
      facilityTypeValue,
      matchedGroup,
      tasks: scheduleRows
        .filter((r) => r.standardId === s.standardId)
        .map((r) => {
          // numeric comes back as string from Postgres; null = no fixed number.
          const intervalMonths =
            r.intervalMonths === null ? null : Number(r.intervalMonths);
          return {
            id: r.id,
            title: r.title,
            category: r.category,
            intervalText: r.intervalText,
            intervalMonths,
            clauseReference: r.clauseReference,
            sourceQuote: r.sourceQuote,
            status: dueStatus(
              { intervalMonths, category: r.category, standardId: r.standardId },
              journal,
              today,
            ),
          };
        }),
    }))
    .filter((s) => s.tasks.length > 0);
}

/** List a project's monitoring entries, newest first. */
export async function listMonitoringEntries(
  projectId: string,
): Promise<MonitoringEntryView[]> {
  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  return db
    .select({
      id: monitoringEntries.id,
      entryDate: monitoringEntries.entryDate,
      category: monitoringEntries.category,
      note: monitoringEntries.note,
      documentId: monitoringEntries.documentId,
      documentTitle: projectDocuments.title,
      documentCitationLabel: projectDocuments.citationLabel,
      standardId: monitoringEntries.standardId,
      standardCode: standards.code,
      standardTitleDe: standards.titleDe,
      createdAt: monitoringEntries.createdAt,
      userName: profiles.fullName,
    })
    .from(monitoringEntries)
    .leftJoin(projectDocuments, eq(projectDocuments.id, monitoringEntries.documentId))
    .leftJoin(standards, eq(standards.id, monitoringEntries.standardId))
    .leftJoin(profiles, eq(profiles.id, monitoringEntries.createdBy))
    .where(eq(monitoringEntries.projectId, projectId))
    .orderBy(desc(monitoringEntries.entryDate), desc(monitoringEntries.createdAt));
}
