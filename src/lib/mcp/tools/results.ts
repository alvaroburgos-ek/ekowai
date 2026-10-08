import { z } from 'zod';
import { and, asc, eq } from 'drizzle-orm';
import type { McpServer } from '@modelcontextprotocol/server';
import { db } from '@/lib/db';
import {
  standards,
  worksheetInstances,
  worksheetTemplates,
} from '@/lib/db/schema';
import { summarizeStandardProgress } from '@/lib/projects/standard-progress';
import { loadRequiredFieldCounts } from '@/lib/projects/load-required-field-counts';
import { transitionWorksheet } from '@/lib/actions/worksheet-transition';
import { env } from '@/env';
import { defineTool, unwrap } from '../define-tool';
import { assertInternalAccess } from './projects';

export function registerResultTools(server: McpServer) {
  defineTool(
    server,
    'get_standard_progress',
    {
      title: 'Fortschritt einer Norm',
      readOnly: true,
      description:
        'Zeigt für eine Norm im Projekt, wie viele Arbeitsblätter genehmigt, offen, in Prüfung oder als "nicht zutreffend" markiert sind, was der nächste sinnvolle Schritt ist und ob die Konformitätserklärung schon erstellt werden kann. Nutze dies, um dem Ingenieur den Stand zusammenzufassen.',
      inputSchema: z.object({
        projectId: z.string().uuid(),
        standardCode: z.string().describe('Norm-Code, z. B. "FLL-Naturteich"'),
      }),
    },
    async ({ projectId, standardCode }, user) => {
      await assertInternalAccess(user.id, projectId);

      const worksheets = await db
        .select({
          instanceId: worksheetInstances.id,
          code: worksheetTemplates.code,
          titleDe: worksheetTemplates.titleDe,
          status: worksheetInstances.status,
          templateId: worksheetTemplates.id,
          standardId: standards.id,
        })
        .from(worksheetInstances)
        .innerJoin(
          worksheetTemplates,
          eq(worksheetInstances.worksheetTemplateId, worksheetTemplates.id),
        )
        .innerJoin(standards, eq(worksheetTemplates.standardId, standards.id))
        .where(
          and(
            eq(worksheetInstances.projectId, projectId),
            eq(standards.code, standardCode),
          ),
        )
        .orderBy(asc(worksheetTemplates.orderIndex));

      if (worksheets.length === 0) {
        throw new Error(
          `Für Norm "${standardCode}" gibt es in diesem Projekt keine Arbeitsblätter. Ist die Norm dem Projekt zugeordnet (get_project)?`,
        );
      }

      // Required-field counts per template by the approval gate's rule (C-7, 2026-10-08): a required field
      // hidden by `visible_when` under the saved values is neither total nor open; an inherited conflict-free
      // project-wide value satisfies (A4). Same loader as the worksheet sidebar.
      const counts = await loadRequiredFieldCounts(projectId, worksheets[0].standardId);

      const progress = summarizeStandardProgress(
        worksheets.map((w) => ({
          code: w.code,
          titleDe: w.titleDe,
          status: w.status,
          totalRequired: counts.get(w.templateId)?.totalRequired ?? 0,
          filledRequired: counts.get(w.templateId)?.filledRequired ?? 0,
        })),
      );

      return { projectId, standardCode, ...progress };
    },
  );

  defineTool(
    server,
    'get_document_links',
    {
      title: 'PDF-Dokumente einer Norm',
      readOnly: true,
      description:
        'Gibt die Download-Links für die erzeugten Dokumente einer Norm zurück: Bericht, Konformitätserklärung, Wertetabelle, Einreichungs-Checkliste und Prüf-Memo. Die Konformitätserklärung ist erst vollständig, wenn alle zutreffenden Arbeitsblätter genehmigt sind — prüfe das vorher mit get_standard_progress.',
      inputSchema: z.object({
        projectId: z.string().uuid(),
        standardCode: z.string(),
      }),
    },
    async ({ projectId, standardCode }, user) => {
      await assertInternalAccess(user.id, projectId);
      const base = `${env.NEXT_PUBLIC_APP_URL}/api/projects/${projectId}/standards/${encodeURIComponent(standardCode)}`;
      return {
        bericht: `${base}/report`,
        konformitaetserklaerung: `${base}/conformity`,
        wertetabelle: `${base}/valuetable`,
        checkliste: `${base}/checklist`,
        pruefmemo: `${base}/pruefmemo`,
        hinweis:
          'Die Links verlangen eine angemeldete Browser-Sitzung — sie sind für den Ingenieur zum Anklicken gedacht, nicht zum Abruf durch das Modell.',
      };
    },
  );

  defineTool(
    server,
    'transition_worksheet',
    {
      title: 'Arbeitsblatt-Status ändern',
      description:
        'Ändert den Status eines Arbeitsblatts: submit (zur Prüfung einreichen), engineer_approve (genehmigen), engineer_reject (zurückweisen), finalize (final setzen), reopen (wieder zum Bearbeiten öffnen), deactivate ("nicht zutreffend"), reactivate. Jede Änderung braucht einen Kommentar, der im Prüfpfad landet. Genehmigen und Finalisieren sind Ingenieursentscheidungen — führe sie nur aus, wenn der Nutzer sie ausdrücklich verlangt, niemals eigenständig nach dem Befüllen.',
      inputSchema: z.object({
        instanceId: z.string().uuid(),
        event: z.enum([
          'submit',
          'engineer_approve',
          'engineer_reject',
          'finalize',
          'reopen',
          'deactivate',
          'reactivate',
        ]),
        comment: z.string().min(1).describe('Begründung für den Prüfpfad'),
      }),
    },
    async ({ instanceId, event, comment }, user) => {
      const [instance] = await db
        .select({ projectId: worksheetInstances.projectId })
        .from(worksheetInstances)
        .where(eq(worksheetInstances.id, instanceId))
        .limit(1);
      if (!instance) throw new Error('Arbeitsblatt nicht gefunden.');
      await assertInternalAccess(user.id, instance.projectId);

      const result = unwrap(
        await transitionWorksheet({ instanceId, eventType: event, comment }),
      );
      return { instanceId, newStatus: result.newStatus };
    },
  );
}
