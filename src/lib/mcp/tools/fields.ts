import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type { McpServer } from '@modelcontextprotocol/server';
import { db } from '@/lib/db';
import { fields, worksheetInstances } from '@/lib/db/schema';
import { saveWorksheet } from '@/lib/actions/worksheet';
import { addCitation } from '@/lib/actions/citations';
import { setClientSupplied } from '@/lib/actions/client-supplied';
import { defineTool, unwrap } from '../define-tool';
import { assertInternalAccess } from './projects';

/**
 * Coerces the loosely-typed value a model supplies into the tagged union
 * `saveWorksheet` expects, using the field's declared dataType as the
 * authority. A model will happily send "12.5" for a numeric field; accepting
 * that string as text would write a value the calculation engine cannot use.
 */
export function toFieldValue(dataType: string, raw: unknown) {
  if (raw === null || raw === undefined || raw === '') {
    switch (dataType) {
      case 'number': return { type: 'number' as const, value: null };
      case 'boolean': return { type: 'boolean' as const, value: null };
      case 'date': return { type: 'date' as const, value: null };
      case 'enum': return { type: 'enum' as const, value: null };
      default: return { type: 'text' as const, value: null };
    }
  }

  switch (dataType) {
    case 'number': {
      const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
      if (!Number.isFinite(n)) {
        throw new Error(
          `Wert "${String(raw)}" ist keine Zahl, das Feld erwartet aber einen numerischen Wert.`,
        );
      }
      return { type: 'number' as const, value: n };
    }
    case 'boolean': {
      if (typeof raw === 'boolean') return { type: 'boolean' as const, value: raw };
      const s = String(raw).toLowerCase();
      if (['true', 'ja', 'yes', '1'].includes(s)) return { type: 'boolean' as const, value: true };
      if (['false', 'nein', 'no', '0'].includes(s)) return { type: 'boolean' as const, value: false };
      throw new Error(`Wert "${String(raw)}" ist kein Ja/Nein-Wert.`);
    }
    case 'date':
      return { type: 'date' as const, value: String(raw) };
    case 'enum':
      return { type: 'enum' as const, value: String(raw) };
    case 'json':
      return { type: 'json' as const, value: raw };
    default:
      return { type: 'text' as const, value: String(raw) };
  }
}

export function registerFieldTools(server: McpServer) {
  defineTool(
    server,
    'set_field_values',
    {
      title: 'Feldwerte erfassen',
      description:
        'Schreibt einen oder mehrere Feldwerte in ein Arbeitsblatt. Rufe vorher get_worksheet auf, um fieldId, Datentyp und Einheit zu kennen; Werte werden anhand des Datentyps geprüft. Gib bei Angaben, die aus einer Kundenmail oder einem Kundendokument stammen, immer `sourceQuote` mit dem wörtlichen Satz an — er wird als Quelle am Feld hinterlegt und das Feld als Kundenangabe markiert (AGB-Haftungsabgrenzung). Übertrage nur eindeutige Angaben; bei mehrdeutigen nutze flag_uncertain_value.',
      inputSchema: z.object({
        instanceId: z.string().uuid().describe('Arbeitsblatt aus list_worksheets'),
        values: z
          .array(
            z.object({
              fieldId: z.string().uuid().describe('Aus get_worksheet'),
              value: z
                .union([z.string(), z.number(), z.boolean(), z.null()])
                .describe('Der Wert in der Einheit, die get_worksheet für das Feld nennt'),
              sourceQuote: z
                .string()
                .optional()
                .describe(
                  'Wörtliches Zitat aus der Kundenmail/-unterlage, das diesen Wert belegt',
                ),
            }),
          )
          .min(1),
      }),
    },
    async ({ instanceId, values }, user) => {
      const [instance] = await db
        .select({
          id: worksheetInstances.id,
          projectId: worksheetInstances.projectId,
          templateId: worksheetInstances.worksheetTemplateId,
        })
        .from(worksheetInstances)
        .where(eq(worksheetInstances.id, instanceId))
        .limit(1);
      if (!instance) throw new Error('Arbeitsblatt nicht gefunden.');
      await assertInternalAccess(user.id, instance.projectId);

      // Resolve each field's declared dataType before coercing — writing a
      // string into a numeric field would silently break the equations.
      const templateFields = await db
        .select({ id: fields.id, dataType: fields.dataType, labelDe: fields.labelDe })
        .from(fields)
        .where(eq(fields.worksheetTemplateId, instance.templateId));
      const byId = new Map(templateFields.map((f) => [f.id, f]));

      const payload: Record<string, ReturnType<typeof toFieldValue>> = {};
      for (const entry of values) {
        const field = byId.get(entry.fieldId);
        if (!field) {
          throw new Error(
            `Feld ${entry.fieldId} gehört nicht zu diesem Arbeitsblatt. get_worksheet liefert die gültigen fieldIds.`,
          );
        }
        payload[entry.fieldId] = toFieldValue(field.dataType, entry.value);
      }

      const saved = unwrap(await saveWorksheet({ instanceId, values: payload }));

      // Attach provenance after the values land. A failure here must not be
      // reported as a failed write — the value IS saved — so each citation is
      // reported individually instead of aborting.
      const provenance: Array<{ fieldId: string; cited: boolean; note?: string }> = [];
      for (const entry of values) {
        if (!entry.sourceQuote) continue;
        const citation = await addCitation({
          projectId: instance.projectId,
          fieldId: entry.fieldId,
          // `label:` is the synthetic docId prefix for plain-text sources —
          // the quote itself is the document, there is no uploaded file.
          source: { docId: `label:${entry.sourceQuote}` },
        });
        const flagged = await setClientSupplied(instance.projectId, entry.fieldId, true);
        provenance.push({
          fieldId: entry.fieldId,
          cited: citation.ok,
          note: citation.ok
            ? flagged.ok
              ? undefined
              : `Zitat gesetzt, Kundenangabe-Markierung fehlgeschlagen: ${flagged.error}`
            : `Zitat konnte nicht gesetzt werden: ${citation.error}`,
        });
      }

      return {
        saved: saved.saved,
        warnings: saved.warnings,
        derived: saved.derived,
        provenance,
      };
    },
  );

  defineTool(
    server,
    'flag_uncertain_value',
    {
      title: 'Unsichere Angabe zur Klärung markieren',
      description:
        'Nutze dies STATT set_field_values, wenn eine Kundenangabe mehrdeutig ist — etwa wenn unklar ist, auf welches Feld sich eine Zahl bezieht ("Teich ca. 80 m²" kann Wasserfläche oder Gesamtanlage sein), eine Einheit fehlt oder mehrere Felder in Frage kommen. Der Wert wird NICHT gesetzt; stattdessen wird eine Notiz am Feld hinterlegt, die der Ingenieur in der App sieht und entscheidet. Lieber einmal zu oft markieren als einen falsch zugeordneten Wert schreiben.',
      inputSchema: z.object({
        projectId: z.string().uuid(),
        fieldId: z.string().uuid().describe('Das Feld, um das es vermutlich geht'),
        sourceQuote: z.string().describe('Der wörtliche Satz aus der Kundenunterlage'),
        question: z
          .string()
          .describe('Was genau unklar ist, als Frage an den Ingenieur formuliert'),
      }),
    },
    async ({ projectId, fieldId, sourceQuote, question }, user) => {
      await assertInternalAccess(user.id, projectId);
      const citation = unwrap(
        await addCitation({
          projectId,
          fieldId,
          source: {
            docId: `label:${sourceQuote}`,
            note: `KLÄRUNG NÖTIG: ${question}`,
          },
        }),
      );
      return {
        flagged: true,
        citationId: citation.id,
        fieldId,
        question,
        hint: 'Der Wert wurde bewusst NICHT gesetzt. Der Ingenieur entscheidet in der App.',
      };
    },
  );
}
