import 'server-only';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export type StandardProgress = {
  id: string;
  code: string;
  titleDe: string;
  titleEn: string | null;
  version: string;
  issuedYear: number | null;
  createdAt: string;
  worksheetCount: number;
  fieldTotal: number;
  fieldVerified: number;
  equationTotal: number;
  equationVerified: number;
  complianceTotal: number;
};

/** All standards in the central library with verification progress aggregated
 * across their worksheets. Single round-trip via raw SQL — Drizzle's COUNT
 * FILTER support is patchy across versions. */
export async function loadStandardsProgress(): Promise<StandardProgress[]> {
  const rows = await db.execute<{
    id: string;
    code: string;
    title_de: string;
    title_en: string | null;
    version: string;
    issued_year: number | null;
    created_at: Date | string;
    worksheet_count: number;
    field_total: number;
    field_verified: number;
    equation_total: number;
    equation_verified: number;
    compliance_total: number;
  }>(sql`
    SELECT
      s.id, s.code, s.title_de, s.title_en, s.version, s.issued_year, s.created_at,
      COUNT(DISTINCT wt.id)::int                                                          AS worksheet_count,
      COUNT(DISTINCT f.id) FILTER (WHERE f.active)::int                                   AS field_total,
      COUNT(DISTINCT f.id) FILTER (WHERE f.active AND f.verification_status = 'engineer_verified')::int AS field_verified,
      COUNT(DISTINCT eq.id)::int                                                          AS equation_total,
      COUNT(DISTINCT eq.id) FILTER (WHERE eq.verification_status = 'engineer_verified')::int                AS equation_verified,
      COUNT(DISTINCT cr.id)::int                                                          AS compliance_total
    FROM standards s
    LEFT JOIN worksheet_templates wt        ON wt.standard_id = s.id
    LEFT JOIN fields f                       ON f.worksheet_template_id = wt.id
    LEFT JOIN equations eq                   ON eq.worksheet_template_id = wt.id
    LEFT JOIN compliance_requirements cr     ON cr.worksheet_template_id = wt.id
    GROUP BY s.id
    ORDER BY s.code
  `);
  type Row = {
    id: string;
    code: string;
    title_de: string;
    title_en: string | null;
    version: string;
    issued_year: number | null;
    created_at: Date | string;
    worksheet_count: number;
    field_total: number;
    field_verified: number;
    equation_total: number;
    equation_verified: number;
    compliance_total: number;
  };
  const rawRows: Row[] = Array.isArray(rows)
    ? (rows as Row[])
    : ((rows as { rows?: Row[] }).rows ?? []);
  return rawRows.map((r) => ({
    id: r.id,
    code: r.code,
    titleDe: r.title_de,
    titleEn: r.title_en,
    version: r.version,
    issuedYear: r.issued_year,
    createdAt: typeof r.created_at === 'string' ? r.created_at : r.created_at.toISOString(),
    worksheetCount: Number(r.worksheet_count),
    fieldTotal: Number(r.field_total),
    fieldVerified: Number(r.field_verified),
    equationTotal: Number(r.equation_total),
    equationVerified: Number(r.equation_verified),
    complianceTotal: Number(r.compliance_total),
  }));
}

export type WorksheetProgress = {
  id: string;
  code: string;
  titleDe: string;
  titleEn: string | null;
  orderIndex: number;
  phase: number | null;
  archetype: string | null;
  fieldTotal: number;
  fieldVerified: number;
  equationTotal: number;
  equationVerified: number;
  complianceTotal: number;
};

/** Worksheets of a given standard (by code) with per-worksheet verification
 * progress. Used by the standard-detail library page. */
export async function loadWorksheetsProgress(standardCode: string): Promise<{
  standard: { id: string; code: string; titleDe: string; titleEn: string | null; version: string };
  worksheets: WorksheetProgress[];
} | null> {
  const stRows = await db.execute<{
    id: string; code: string; title_de: string; title_en: string | null; version: string;
  }>(sql`SELECT id, code, title_de, title_en, version FROM standards WHERE code = ${standardCode} LIMIT 1`);
  type StRow = { id: string; code: string; title_de: string; title_en: string | null; version: string };
  const stArr: StRow[] = Array.isArray(stRows)
    ? (stRows as StRow[])
    : ((stRows as { rows?: StRow[] }).rows ?? []);
  if (stArr.length === 0) return null;
  const s = stArr[0];

  const wsRows = await db.execute<{
    id: string; code: string; title_de: string; title_en: string | null;
    order_index: number; phase: number | null; archetype: string | null;
    field_total: number; field_verified: number;
    equation_total: number; equation_verified: number;
    compliance_total: number;
  }>(sql`
    SELECT
      wt.id, wt.code, wt.title_de, wt.title_en, wt.order_index, wt.phase, wt.archetype,
      COUNT(DISTINCT f.id) FILTER (WHERE f.active)::int                                   AS field_total,
      COUNT(DISTINCT f.id) FILTER (WHERE f.active AND f.verification_status = 'engineer_verified')::int AS field_verified,
      COUNT(DISTINCT eq.id)::int                                                          AS equation_total,
      COUNT(DISTINCT eq.id) FILTER (WHERE eq.verification_status = 'engineer_verified')::int                AS equation_verified,
      COUNT(DISTINCT cr.id)::int                                                          AS compliance_total
    FROM worksheet_templates wt
    LEFT JOIN fields f                    ON f.worksheet_template_id = wt.id
    LEFT JOIN equations eq                ON eq.worksheet_template_id = wt.id
    LEFT JOIN compliance_requirements cr  ON cr.worksheet_template_id = wt.id
    WHERE wt.standard_id = ${s.id}
    GROUP BY wt.id
    ORDER BY wt.order_index
  `);
  type WsRow = {
    id: string; code: string; title_de: string; title_en: string | null;
    order_index: number; phase: number | null; archetype: string | null;
    field_total: number; field_verified: number;
    equation_total: number; equation_verified: number;
    compliance_total: number;
  };
  const wsArr: WsRow[] = Array.isArray(wsRows)
    ? (wsRows as WsRow[])
    : ((wsRows as { rows?: WsRow[] }).rows ?? []);
  return {
    standard: { id: s.id, code: s.code, titleDe: s.title_de, titleEn: s.title_en, version: s.version },
    worksheets: wsArr.map((r) => ({
      id: r.id,
      code: r.code,
      titleDe: r.title_de,
      titleEn: r.title_en,
      orderIndex: Number(r.order_index),
      phase: r.phase,
      archetype: r.archetype,
      fieldTotal: Number(r.field_total),
      fieldVerified: Number(r.field_verified),
      equationTotal: Number(r.equation_total),
      equationVerified: Number(r.equation_verified),
      complianceTotal: Number(r.compliance_total),
    })),
  };
}
