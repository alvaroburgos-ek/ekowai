import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import type { McpServer } from '@modelcontextprotocol/server';
import { db } from '@/lib/db';
import { orgMembers, projects, projectStandards, standards } from '@/lib/db/schema';
import { createProjectForOrg } from '@/lib/projects/create-project';
import { resolveProjectAccess } from '@/lib/auth/project-access';
import { listProjectsForUser } from '@/lib/actions/project';
import {
  addStandardByCodeToProject,
  removeStandardFromProject,
} from '@/lib/actions/project-standards';
import { defineTool, unwrap } from '../define-tool';

/** Shared guard: every tool that names a project verifies internal access first. */
async function assertInternalAccess(userId: string, projectId: string) {
  const access = await resolveProjectAccess(userId, projectId);
  if (access.scope !== 'internal') {
    throw new Error(
      `Kein Zugriff auf Projekt ${projectId} (oder Projekt existiert nicht).`,
    );
  }
  return access;
}

export function registerProjectTools(server: McpServer) {
  defineTool(
    server,
    'list_projects',
    {
      title: 'Projekte auflisten',
      readOnly: true,
      description:
        'Listet alle aktiven Projekte, auf die der angemeldete Ingenieur Zugriff hat, mit Id, Name, Auftraggeber und Ort. Rufe dies zuerst auf, wenn eine Anfrage ein Projekt beim Namen nennt — jedes andere Werkzeug braucht die projectId, nicht den Namen.',
      inputSchema: z.object({}),
    },
    async (_args, user) => {
      const rows = await listProjectsForUser(user.id);
      return { count: rows.length, projects: rows };
    },
  );

  defineTool(
    server,
    'get_project',
    {
      title: 'Projekt-Details',
      readOnly: true,
      description:
        'Liefert Stammdaten eines Projekts samt der zugeordneten Normen (Standards) mit deren Code und Titel. Nutze dies, um zu sehen, welche Normen ein Projekt bereits führt, bevor du Felder ausfüllst oder eine Norm ergänzt.',
      inputSchema: z.object({
        projectId: z.string().uuid().describe('Id aus list_projects'),
      }),
    },
    async ({ projectId }, user) => {
      await assertInternalAccess(user.id, projectId);

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
      if (!project) throw new Error('Projekt nicht gefunden.');

      const assigned = await db
        .select({
          projectStandardId: projectStandards.id,
          standardId: projectStandards.standardId,
          code: standards.code,
          titleDe: standards.titleDe,
          version: standards.version,
          layer: projectStandards.layer,
          stageOrder: projectStandards.stageOrder,
          relationType: projectStandards.relationType,
        })
        .from(projectStandards)
        .innerJoin(standards, eq(projectStandards.standardId, standards.id))
        .where(
          and(
            eq(projectStandards.projectId, projectId),
            eq(projectStandards.status, 'active'),
          ),
        );

      return { project, standards: assigned };
    },
  );

  defineTool(
    server,
    'create_project',
    {
      title: 'Projekt anlegen',
      description:
        'Legt ein neues Projekt in der Organisation des angemeldeten Ingenieurs an und gibt dessen Id zurück. Verwende dies, wenn eine Kundenanfrage ein Vorhaben beschreibt, für das noch kein Projekt existiert — prüfe vorher mit list_projects, ob es das Projekt schon gibt.',
      inputSchema: z.object({
        name: z.string().min(2).max(200).describe('Projektname, z. B. "Regenrückhaltebecken Musterstadt"'),
        clientName: z.string().max(200).optional().describe('Auftraggeber'),
        location: z.string().max(200).optional().describe('Standort / Ort des Vorhabens'),
      }),
    },
    async ({ name, clientName, location }, user) => {
      const [membership] = await db
        .select()
        .from(orgMembers)
        .where(eq(orgMembers.userId, user.id))
        .limit(1);
      if (!membership) {
        throw new Error(
          'Der angemeldete Nutzer gehört keiner Organisation an — Projekt kann nicht angelegt werden.',
        );
      }

      const created = await createProjectForOrg({
        orgId: membership.orgId,
        createdBy: user.id,
        name,
        clientName,
        location,
      });
      return { projectId: created.id, name, clientName, location };
    },
  );

  defineTool(
    server,
    'add_standard_to_project',
    {
      title: 'Norm zum Projekt hinzufügen',
      description:
        'Ordnet dem Projekt eine Norm über ihren Code zu (z. B. "FLL-Naturteich", "DWA-A-138") und legt dabei die Arbeitsblatt-Instanzen an, die danach ausgefüllt werden können. Ohne diesen Schritt gibt es für die Norm keine Felder im Projekt.',
      inputSchema: z.object({
        projectId: z.string().uuid(),
        standardCode: z
          .string()
          .min(1)
          .describe('Code der Norm, exakt wie in list_standards ausgegeben'),
      }),
    },
    async ({ projectId, standardCode }, user) => {
      await assertInternalAccess(user.id, projectId);
      const result = await addStandardByCodeToProject(projectId, standardCode);
      return unwrap(result);
    },
  );

  defineTool(
    server,
    'remove_standard_from_project',
    {
      title: 'Norm aus Projekt entfernen',
      description:
        'Nimmt eine Norm wieder aus dem Projekt. Bereits erfasste Werte bleiben für den Prüfpfad erhalten. Verlangt einen Grund, der im Audit-Log festgehalten wird.',
      inputSchema: z.object({
        projectId: z.string().uuid(),
        standardId: z
          .string()
          .uuid()
          .describe('standardId aus get_project (nicht projectStandardId)'),
        reason: z.string().min(3).describe('Warum die Norm entfernt wird'),
      }),
    },
    async ({ projectId, standardId, reason }, user) => {
      await assertInternalAccess(user.id, projectId);
      const result = await removeStandardFromProject(projectId, standardId, reason);
      return unwrap(result);
    },
  );

  defineTool(
    server,
    'list_standards',
    {
      title: 'Verfügbare Normen',
      readOnly: true,
      description:
        'Listet alle Normen der zentralen Bibliothek mit Code, Titel und Fassung. Nutze dies, um den korrekten standardCode für add_standard_to_project zu finden — rate den Code nie.',
      inputSchema: z.object({
        search: z
          .string()
          .optional()
          .describe('Optionaler Filter auf Code oder Titel, Teilstring genügt'),
      }),
    },
    async ({ search }) => {
      const rows = await db
        .select({
          code: standards.code,
          titleDe: standards.titleDe,
          version: standards.version,
          issuedYear: standards.issuedYear,
        })
        .from(standards)
        .where(isNull(standards.supersededBy));

      const needle = search?.toLowerCase();
      const filtered = needle
        ? rows.filter(
            (r) =>
              r.code.toLowerCase().includes(needle) ||
              r.titleDe.toLowerCase().includes(needle),
          )
        : rows;
      return { count: filtered.length, standards: filtered };
    },
  );

  defineTool(
    server,
    'archive_project',
    {
      title: 'Projekt archivieren',
      description:
        'Archiviert ein abgeschlossenes Projekt (blendet es aus der aktiven Liste aus, löscht nichts). Mit unarchive=true wird ein archiviertes Projekt wieder aktiv.',
      inputSchema: z.object({
        projectId: z.string().uuid(),
        unarchive: z.boolean().optional().describe('true = wieder aktivieren'),
      }),
    },
    async ({ projectId, unarchive }, user) => {
      await assertInternalAccess(user.id, projectId);
      // Deliberately NOT calling archiveProject/unarchiveProject from
      // @/lib/actions/project: both end in redirect(), which throws a
      // NEXT_REDIRECT control-flow error. That is correct for a form post and
      // fatal for a tool call, so this writes the same column directly.
      await db
        .update(projects)
        .set({ archivedAt: unarchive ? null : new Date() })
        .where(eq(projects.id, projectId));
      return { projectId, archived: !unarchive };
    },
  );
}

export { assertInternalAccess };
