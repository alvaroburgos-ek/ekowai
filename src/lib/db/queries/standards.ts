import 'server-only';
import { db } from '@/lib/db';
import {
  standards,
  projectStandards,
  worksheetTemplates,
  worksheetInstances,
} from '@/lib/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import type { WorksheetStatus } from '@/lib/state-machine';

export async function listStandards() {
  return db.select().from(standards).orderBy(desc(standards.createdAt));
}

export async function listProjectStandards(projectId: string) {
  return db
    .select({
      projectStandardId: projectStandards.id,
      status: projectStandards.status,
      addedAt: projectStandards.addedAt,
      standard: {
        id: standards.id,
        code: standards.code,
        titleDe: standards.titleDe,
        titleEn: standards.titleEn,
        version: standards.version,
      },
    })
    .from(projectStandards)
    .innerJoin(standards, eq(standards.id, projectStandards.standardId))
    .where(
      and(
        eq(projectStandards.projectId, projectId),
        eq(projectStandards.status, 'active'),
      ),
    );
}

export type ProjectStandardLayer = 'management' | 'cost' | 'technical';

export type ProjectStandardWithWorksheets = {
  standard: {
    id: string;
    code: string;
    titleDe: string;
    titleEn: string | null;
    version: string;
  };
  layer: ProjectStandardLayer | null;
  stageOrder: number | null;
  worksheets: Array<{
    templateId: string;
    code: string;
    titleDe: string;
    titleEn: string | null;
    phase: number | null;
    archetype: string | null;
    orderIndex: number;
    instanceId: string | null;
    status: WorksheetStatus | null;
    isStale: boolean | null;
  }>;
};

export async function listProjectStandardsWithWorksheets(
  projectId: string,
): Promise<ProjectStandardWithWorksheets[]> {
  const rows = await db
    .select({
      standardId: standards.id,
      standardCode: standards.code,
      standardTitleDe: standards.titleDe,
      standardTitleEn: standards.titleEn,
      standardVersion: standards.version,
      layer: projectStandards.layer,
      stageOrder: projectStandards.stageOrder,
      templateId: worksheetTemplates.id,
      templateCode: worksheetTemplates.code,
      templateTitleDe: worksheetTemplates.titleDe,
      templateTitleEn: worksheetTemplates.titleEn,
      templatePhase: worksheetTemplates.phase,
      templateArchetype: worksheetTemplates.archetype,
      templateOrderIndex: worksheetTemplates.orderIndex,
      instanceId: worksheetInstances.id,
      instanceStatus: worksheetInstances.status,
      instanceIsStale: worksheetInstances.isStale,
    })
    .from(projectStandards)
    .innerJoin(standards, eq(standards.id, projectStandards.standardId))
    .innerJoin(
      worksheetTemplates,
      eq(worksheetTemplates.standardId, standards.id),
    )
    .leftJoin(
      worksheetInstances,
      and(
        eq(worksheetInstances.worksheetTemplateId, worksheetTemplates.id),
        eq(worksheetInstances.projectId, projectStandards.projectId),
      ),
    )
    .where(
      and(
        eq(projectStandards.projectId, projectId),
        eq(projectStandards.status, 'active'),
      ),
    )
    .orderBy(
      asc(standards.code),
      asc(worksheetTemplates.phase),
      asc(worksheetTemplates.orderIndex),
    );

  const grouped = new Map<string, ProjectStandardWithWorksheets>();
  for (const r of rows) {
    let group = grouped.get(r.standardId);
    if (!group) {
      group = {
        standard: {
          id: r.standardId,
          code: r.standardCode,
          titleDe: r.standardTitleDe,
          titleEn: r.standardTitleEn,
          version: r.standardVersion,
        },
        layer: r.layer as ProjectStandardLayer | null,
        stageOrder: r.stageOrder,
        worksheets: [],
      };
      grouped.set(r.standardId, group);
    }
    group.worksheets.push({
      templateId: r.templateId,
      code: r.templateCode,
      titleDe: r.templateTitleDe,
      titleEn: r.templateTitleEn,
      phase: r.templatePhase,
      archetype: r.templateArchetype,
      orderIndex: r.templateOrderIndex,
      instanceId: r.instanceId,
      status: r.instanceStatus as WorksheetStatus | null,
      isStale: r.instanceIsStale,
    });
  }
  return Array.from(grouped.values());
}
