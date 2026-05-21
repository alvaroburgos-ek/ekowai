import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql, eq, inArray, and } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';
import type {
  ParsedWorkbook,
  EnumValueRow,
} from './_pass3c-types';

const {
  standards,
  worksheetTemplates,
  worksheetSections,
  fields,
  equations,
  complianceRequirements,
} = schema;

export type ImportCounts = {
  standards: number;
  worksheetTemplates: number;
  worksheetSections: number;
  fields: number;
  equations: number;
  complianceRequirements: number;
};

function parseRequired(v: string | null): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === 'yes' || s === 'true' || s === '1' || s === 'required';
}

function parseList(v: string | null): string[] | null {
  if (!v) return null;
  return v
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

type EnumValuePayload = {
  value: string;
  label_de: string | null;
  label_en: string | null;
  order_index: number;
  regulation_reference: string | null;
};

function groupEnumValues(rows: EnumValueRow[]): Map<string, EnumValuePayload[]> {
  const map = new Map<string, EnumValuePayload[]>();
  for (const r of rows) {
    const arr = map.get(r.enum_name) ?? [];
    arr.push({
      value: r.value,
      label_de: r.label_de,
      label_en: r.label_en,
      order_index: r.order_index,
      regulation_reference: r.regulation_reference,
    });
    map.set(r.enum_name, arr);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.order_index - b.order_index);
  }
  return map;
}

/** Run the import inside a single transaction. Returns row counts. */
export async function importWorkbook(
  databaseUrl: string,
  parsed: ParsedWorkbook,
  options: { dryRun?: boolean } = {},
): Promise<ImportCounts> {
  const client = postgres(databaseUrl, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });

  try {
    if (options.dryRun) {
      return {
        standards: 1,
        worksheetTemplates: parsed.worksheets.length,
        worksheetSections: parsed.sections.length,
        fields: parsed.fields.length,
        equations: parsed.equations.length,
        complianceRequirements: parsed.complianceRequirements.length,
      };
    }

    return await db.transaction(async (tx) => {
      // ---- 1. Standards (1 row UPSERT by code) ----
      const stdRow = await tx
        .insert(standards)
        .values({
          code: parsed.standard.standard_code,
          titleDe: parsed.standard.title_de,
          titleEn: parsed.standard.title_en,
          version: parsed.standard.edition,
        })
        .onConflictDoUpdate({
          target: standards.code,
          set: {
            titleDe: parsed.standard.title_de,
            titleEn: parsed.standard.title_en,
            version: parsed.standard.edition,
          },
        })
        .returning({ id: standards.id });
      const standardId = stdRow[0].id;

      // I4: warn about DB field symbols that are no longer in the xlsx for this standard
      const existingFieldSymbols = await tx
        .select({ symbol: fields.symbol, worksheetCode: worksheetTemplates.code })
        .from(fields)
        .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
        .where(eq(worksheetTemplates.standardId, standardId));
      const xlsxFieldKeys = new Set(
        parsed.fields.map((f) => `${f.origin_worksheet}|${f.symbol}`),
      );
      const orphans = existingFieldSymbols.filter(
        (r) => !xlsxFieldKeys.has(`${r.worksheetCode}|${r.symbol}`),
      );
      if (orphans.length > 0) {
        console.warn(
          `⚠ ${orphans.length} field(s) exist in DB but not in xlsx — possible rename or removal. They remain in DB:`,
        );
        for (const o of orphans.slice(0, 10)) {
          console.warn(`    ${o.worksheetCode} · ${o.symbol}`);
        }
        if (orphans.length > 10) console.warn(`    ... and ${orphans.length - 10} more`);
      }

      // ---- 2. Worksheet templates ----
      const tmplValues = parsed.worksheets.map((w) => ({
        standardId,
        code: w.worksheet_code,
        titleDe: w.title_de,
        titleEn: w.title_en,
        phase: w.phase,
        archetype: w.archetype,
        orderIndex: w.order_index,
        description: w.description,
      }));
      const insertedTemplates = await tx
        .insert(worksheetTemplates)
        .values(tmplValues)
        .onConflictDoUpdate({
          target: [worksheetTemplates.standardId, worksheetTemplates.code],
          set: {
            titleDe: sql`excluded.title_de`,
            titleEn: sql`excluded.title_en`,
            phase: sql`excluded.phase`,
            archetype: sql`excluded.archetype`,
            orderIndex: sql`excluded.order_index`,
            description: sql`excluded.description`,
          },
        })
        .returning({ id: worksheetTemplates.id, code: worksheetTemplates.code });
      const tmplByCode = new Map(insertedTemplates.map((t) => [t.code, t.id]));

      // I5: warn about worksheet codes that collide with other standards (cross-standard)
      const collisions = await tx
        .select({
          code: worksheetTemplates.code,
          otherStandardCode: standards.code,
        })
        .from(worksheetTemplates)
        .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
        .where(
          and(
            inArray(
              worksheetTemplates.code,
              parsed.worksheets.map((w) => w.worksheet_code),
            ),
            sql`${standards.id} <> ${standardId}`,
          ),
        );
      if (collisions.length > 0) {
        console.warn(
          `ℹ ${collisions.length} worksheet code(s) also exist in other standards (Phase 2: cross-standard field_bindings):`,
        );
        for (const c of collisions.slice(0, 10)) {
          console.warn(`    ${c.code} (also in ${c.otherStandardCode})`);
        }
      }

      // ---- 3a. Sections, pass 1 (no parent_section_id) ----
      // Sections have no unique constraint on (worksheet_template_id, code),
      // so we wipe sections for this standard's worksheets and reinsert.
      const tmplIds = Array.from(tmplByCode.values());
      // Clear section_id on fields that reference these worksheets' sections before deleting,
      // otherwise the FK constraint (fields.section_id → worksheet_sections.id) blocks the delete.
      if (tmplIds.length > 0) {
        await tx
          .update(fields)
          .set({ sectionId: null })
          .where(inArray(fields.worksheetTemplateId, tmplIds));
      }
      await tx.delete(worksheetSections).where(inArray(worksheetSections.worksheetTemplateId, tmplIds));

      const sectionValues = parsed.sections.map((s) => ({
        worksheetTemplateId: tmplByCode.get(s.worksheet_code)!,
        code: s.section_code,
        titleDe: s.title,
        orderIndex: s.order_index,
      }));
      const insertedSections = sectionValues.length === 0 ? [] : await tx
        .insert(worksheetSections)
        .values(sectionValues)
        .returning({
          id: worksheetSections.id,
          worksheetTemplateId: worksheetSections.worksheetTemplateId,
          code: worksheetSections.code,
        });
      const sectionByKey = new Map<string, string>();
      for (const s of insertedSections) {
        sectionByKey.set(`${s.worksheetTemplateId}|${s.code}`, s.id);
      }

      // ---- 3b. Sections, pass 2: resolve parent_section_id ----
      for (const src of parsed.sections) {
        if (!src.parent_section_code) continue;
        const tmplId = tmplByCode.get(src.worksheet_code);
        if (!tmplId) continue;
        const selfId = sectionByKey.get(`${tmplId}|${src.section_code}`);
        const parentId = sectionByKey.get(`${tmplId}|${src.parent_section_code}`);
        if (selfId && parentId) {
          await tx
            .update(worksheetSections)
            .set({ parentSectionId: parentId })
            .where(eq(worksheetSections.id, selfId));
        }
      }

      // ---- 4. Fields (with enum_values merged + section_id resolved) ----
      const enumGroups = groupEnumValues(parsed.enumValues);
      const fieldValues = parsed.fields.map((f) => {
        const tmplId = tmplByCode.get(f.origin_worksheet)!;
        const sectionId = f.origin_section
          ? sectionByKey.get(`${tmplId}|${f.origin_section}`) ?? null
          : null;
        const enumValues =
          f.data_type === 'enum' ? enumGroups.get(f.symbol) ?? null : null;
        const validationRules = f.validation_rules
          ? { raw: f.validation_rules }
          : null;
        return {
          worksheetTemplateId: tmplId,
          sectionId,
          symbol: f.symbol,
          labelDe: f.label_de,
          labelEn: f.label_en,
          dataType: f.data_type,
          unit: f.unit,
          isRequired: parseRequired(f.required),
          enumValues,
          validationRules,
          clauseReference: f.regulation_reference,
          description: f.description,
          consumerWorksheets: parseList(f.consumer_worksheets),
        };
      });
      if (fieldValues.length > 0) {
        await tx
          .insert(fields)
          .values(fieldValues)
          .onConflictDoUpdate({
            target: [fields.worksheetTemplateId, fields.symbol],
            set: {
              sectionId: sql`excluded.section_id`,
              labelDe: sql`excluded.label_de`,
              labelEn: sql`excluded.label_en`,
              dataType: sql`excluded.data_type`,
              unit: sql`excluded.unit`,
              isRequired: sql`excluded.is_required`,
              enumValues: sql`excluded.enum_values`,
              validationRules: sql`excluded.validation_rules`,
              clauseReference: sql`excluded.clause_reference`,
              description: sql`excluded.description`,
              consumerWorksheets: sql`excluded.consumer_worksheets`,
              // verification_status DELIBERATELY NOT updated — preserve engineer_verified
            },
          });
      }

      // ---- 5. Equations ----
      const eqValues = parsed.equations.map((row) => ({
        worksheetTemplateId: tmplByCode.get(row.used_in_worksheet)!,
        equationNumber: row.equation_number,
        formula: row.formula,
        inputSymbols: parseList(row.input_symbols),
        outputSymbol: row.output_symbol,
        clauseReference: row.regulation_reference,
        description: row.description_de,
      }));
      if (eqValues.length > 0) {
        await tx
          .insert(equations)
          .values(eqValues)
          .onConflictDoUpdate({
            target: [equations.worksheetTemplateId, equations.equationNumber],
            set: {
              formula: sql`excluded.formula`,
              inputSymbols: sql`excluded.input_symbols`,
              outputSymbol: sql`excluded.output_symbol`,
              clauseReference: sql`excluded.clause_reference`,
              description: sql`excluded.description`,
              // verification_status preserved
            },
          });
      }

      // ---- 6. Compliance requirements ----
      // Pass3c compliance_requirements are per-standard, but the DB schema
      // requires worksheet_template_id. We attach each to the worksheet whose
      // phase matches the requirement's phase, falling back to first phase-1
      // worksheet, then first worksheet. Phase 2 may add a standard-level
      // compliance table.
      const firstPhase1 = parsed.worksheets.find((w) => w.phase === 1) ?? parsed.worksheets[0];
      const crValues = parsed.complianceRequirements.map((cr) => {
        const matchingByPhase = cr.phase != null
          ? parsed.worksheets.find((w) => w.phase === cr.phase)
          : undefined;
        const targetWorksheet = matchingByPhase ?? firstPhase1;
        // For field_presence type CRs the xlsx may omit evaluation_expression.
        // Build a synthetic condition from required_field_symbols so the notNull DB column is satisfied.
        let condition = cr.evaluation_expression;
        if (!condition) {
          if (cr.required_field_symbols) {
            // e.g. "k_f, permeability_test_method" → "k_f IS NOT NULL AND permeability_test_method IS NOT NULL"
            condition = cr.required_field_symbols
              .split(/[,;]/)
              .map((s) => s.trim())
              .filter((s) => s.length > 0)
              .map((s) => `${s} IS NOT NULL`)
              .join(' AND ');
          } else {
            condition = 'TRUE';
          }
        }
        return {
          worksheetTemplateId: tmplByCode.get(targetWorksheet.worksheet_code)!,
          code: cr.requirement_code,
          titleDe: cr.title,
          condition,
          description: cr.description,
          clauseReference: cr.regulation_reference,
          severity: 'block' as const,
        };
      });
      if (crValues.length > 0) {
        await tx
          .insert(complianceRequirements)
          .values(crValues)
          .onConflictDoUpdate({
            target: [complianceRequirements.worksheetTemplateId, complianceRequirements.code],
            set: {
              titleDe: sql`excluded.title_de`,
              condition: sql`excluded.condition`,
              description: sql`excluded.description`,
              clauseReference: sql`excluded.clause_reference`,
              severity: sql`excluded.severity`,
            },
          });
      }

      return {
        standards: 1,
        worksheetTemplates: insertedTemplates.length,
        worksheetSections: insertedSections.length,
        fields: parsed.fields.length,
        equations: parsed.equations.length,
        complianceRequirements: parsed.complianceRequirements.length,
      };
    });
  } finally {
    await client.end();
  }
}
