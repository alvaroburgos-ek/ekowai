import { z } from 'zod';
import { and, asc, eq } from 'drizzle-orm';
import type { McpServer } from '@modelcontextprotocol/server';
import { db } from '@/lib/db';
import {
  fields,
  projectParameters,
  standards,
  worksheetInstances,
  worksheetSections,
  worksheetTemplates,
} from '@/lib/db/schema';
import { defineTool } from '../define-tool';
import { assertInternalAccess } from './projects';

/** Renders a project_parameters row as the plain value the model should see. */
function readValue(row: {
  valueNumber: string | null;
  valueText: string | null;
  valueEnum: string | null;
  valueDate: string | null;
  valueBoolean: boolean | null;
  valueJson: unknown;
} | undefined): unknown {
  if (!row) return null;
  if (row.valueNumber !== null) return Number(row.valueNumber);
  if (row.valueText !== null) return row.valueText;
  if (row.valueEnum !== null) return row.valueEnum;
  if (row.valueDate !== null) return row.valueDate;
  if (row.valueBoolean !== null) return row.valueBoolean;
  return row.valueJson ?? null;
}

export function registerWorksheetTools(server: McpServer) {
  defineTool(
    server,
    'list_worksheets',
    {
      title: 'Arbeitsblätter eines Projekts',
      readOnly: true,
      description:
        'Listet die Arbeitsblätter, die im Projekt für eine Norm angelegt sind, mit Code, Titel, Phase, Status und der instanceId. Die instanceId brauchst du für get_worksheet und set_field_values.',
      inputSchema: z.object({
        projectId: z.string().uuid(),
        standardCode: z
          .string()
          .optional()
          .describe('Auf eine Norm einschränken; ohne Angabe alle Arbeitsblätter'),
      }),
    },
    async ({ projectId, standardCode }, user) => {
      await assertInternalAccess(user.id, projectId);

      const rows = await db
        .select({
          instanceId: worksheetInstances.id,
          status: worksheetInstances.status,
          isStale: worksheetInstances.isStale,
          code: worksheetTemplates.code,
          titleDe: worksheetTemplates.titleDe,
          phase: worksheetTemplates.phase,
          standardCode: standards.code,
        })
        .from(worksheetInstances)
        .innerJoin(
          worksheetTemplates,
          eq(worksheetInstances.worksheetTemplateId, worksheetTemplates.id),
        )
        .innerJoin(standards, eq(worksheetTemplates.standardId, standards.id))
        .where(eq(worksheetInstances.projectId, projectId))
        .orderBy(asc(worksheetTemplates.orderIndex));

      const filtered = standardCode
        ? rows.filter((r) => r.standardCode === standardCode)
        : rows;
      return { count: filtered.length, worksheets: filtered };
    },
  );

  defineTool(
    server,
    'get_worksheet',
    {
      title: 'Arbeitsblatt mit Feldern lesen',
      readOnly: true,
      description:
        'Liefert alle Felder eines Arbeitsblatts mit Symbol, Bezeichnung, Einheit, Datentyp, erlaubten Auswahlwerten und dem aktuell erfassten Wert. Rufe dies IMMER auf, bevor du mit set_field_values schreibst — nur so kennst du die gültigen fieldIds, Einheiten und Enum-Werte. Zeigt außerdem, welche Pflichtfelder noch leer sind.',
      inputSchema: z.object({
        instanceId: z.string().uuid().describe('Aus list_worksheets'),
        onlyEmpty: z
          .boolean()
          .optional()
          .describe('true = nur noch nicht befüllte Felder ausgeben'),
      }),
    },
    async ({ instanceId, onlyEmpty }, user) => {
      const [instance] = await db
        .select({
          id: worksheetInstances.id,
          projectId: worksheetInstances.projectId,
          templateId: worksheetInstances.worksheetTemplateId,
          status: worksheetInstances.status,
        })
        .from(worksheetInstances)
        .where(eq(worksheetInstances.id, instanceId))
        .limit(1);
      if (!instance) throw new Error('Arbeitsblatt nicht gefunden.');
      await assertInternalAccess(user.id, instance.projectId);

      const fieldRows = await db
        .select({
          fieldId: fields.id,
          symbol: fields.symbol,
          labelDe: fields.labelDe,
          dataType: fields.dataType,
          unit: fields.unit,
          isRequired: fields.isRequired,
          enumValues: fields.enumValues,
          description: fields.description,
          clauseReference: fields.clauseReference,
          sectionTitle: worksheetSections.titleDe,
          orderIndex: fields.orderIndex,
        })
        .from(fields)
        .leftJoin(worksheetSections, eq(fields.sectionId, worksheetSections.id))
        .where(
          and(
            eq(fields.worksheetTemplateId, instance.templateId),
            eq(fields.active, true),
          ),
        )
        .orderBy(asc(fields.orderIndex));

      const params = await db
        .select()
        .from(projectParameters)
        .where(eq(projectParameters.projectId, instance.projectId));
      const byField = new Map(params.map((p) => [p.fieldId, p]));

      const merged = fieldRows.map((f) => {
        const param = byField.get(f.fieldId);
        return {
          ...f,
          value: readValue(param),
          sourceType: param?.sourceType ?? null,
          clientSupplied: param?.clientSupplied ?? false,
          isFilled: param !== undefined,
        };
      });

      const visible = onlyEmpty ? merged.filter((f) => !f.isFilled) : merged;
      const missingRequired = merged.filter((f) => f.isRequired && !f.isFilled);

      return {
        instanceId,
        status: instance.status,
        editable: instance.status === 'draft',
        fieldCount: visible.length,
        missingRequiredCount: missingRequired.length,
        missingRequired: missingRequired.map((f) => ({
          fieldId: f.fieldId,
          symbol: f.symbol,
          labelDe: f.labelDe,
          unit: f.unit,
        })),
        fields: visible,
      };
    },
  );
}
