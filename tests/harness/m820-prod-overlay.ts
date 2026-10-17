/**
 * Prod overlay for the DWA-M 820 harness seed (2026-10-17).
 *
 * WHY: the three 2026-10-05 dumps (tests/harness/m820-*.dump.json) carry no `verification_quote` column, so a harness seeded from
 * them + the 19 prior M820 blocks has NULL quotes where prod holds printed-source quotes (627 of 729 active DWA-M 820-1/-2/-3 fields;
 * 582 differ from the seed). Every other signature column of all 729 rows already equals prod (column diff 2026-10-17). The staged
 * C4 blocks 20261015130000 / 140000 / 150000 / 160000 sign verification_quote in their pre-state guards, so without this overlay
 * the harness proved them against a state prod does not have (fields_pre 5/18, 8/18, 5/24, 26/91 on prod).
 *
 * WHAT: after PRIOR_BLOCKS, set verification_quote of every active 820 field to the prod value of 2026-10-17
 * (m820-prod-vq-2026-10-17.json, exported READ ONLY), then assert that the full field signature of all 729 rows equals prod's.
 * Seed/test data only — no prod access here.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type postgres from 'postgres';

type Row = { std: string; ws: string; symbol: string; verification_quote: string | null; sig: string };
const FILE = resolve(__dirname, 'm820-prod-vq-2026-10-17.json');

let cache: Row[] | null = null;
/** Prod's verification_quote of one active 820 field on 2026-10-17 (null = none) — for "prod quote kept" assertions. */
export function prodQuote(std: string, ws: string, symbol: string): string | null {
  cache ??= (JSON.parse(readFileSync(FILE, 'utf8')) as { rows: Row[] }).rows;
  const r = cache.find((x) => x.std === std && x.ws === ws && x.symbol === symbol);
  if (!r) throw new Error(`m820 prod overlay: no row ${std} ${ws} ${symbol}`);
  return r.verification_quote;
}
/** Touched-field texts whose prod quote was lost: every quote prod had must survive the block (kept as prefix, block quote after " | "). */
export function lostProdQuotes(std: string, texts: Array<{ k: string; vq: string | null }>): string[] {
  return texts.filter((x) => x.k.startsWith('f ')).filter((x) => {
    const [, ws, sym] = x.k.split(' ');
    cache ??= (JSON.parse(readFileSync(FILE, 'utf8')) as { rows: Row[] }).rows;
    if (!cache.some((r) => r.std === std && r.ws === ws && r.symbol === sym)) return false; // a field the block inserts (not on prod yet)
    const p = prodQuote(std, ws, sym);
    return p !== null && !(x.vq === p || (x.vq ?? '').startsWith(`${p} | `));
  }).map((x) => x.k);
}

export async function applyM820ProdOverlay(sql: postgres.Sql): Promise<{ fields: number; matched: number }> {
  const { rows } = JSON.parse(readFileSync(FILE, 'utf8')) as { rows: Row[] };
  const res = await sql`
    UPDATE fields f SET verification_quote = o.verification_quote
      FROM jsonb_to_recordset(${sql.json(rows as never)}::jsonb) AS o(std text, ws text, symbol text, verification_quote text, sig text),
           worksheet_templates w, standards s
     WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = o.std AND w.code = o.ws AND f.symbol = o.symbol AND f.active`;
  if (res.count !== rows.length) throw new Error(`m820 prod overlay: updated ${res.count} of ${rows.length} rows`);
  const [m] = await sql<{ n: number }[]>`
    SELECT count(*)::int AS n
      FROM jsonb_to_recordset(${sql.json(rows as never)}::jsonb) AS o(std text, ws text, symbol text, verification_quote text, sig text)
      JOIN standards s ON s.code = o.std JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = o.ws
      JOIN fields f ON f.worksheet_template_id = w.id AND f.symbol = o.symbol AND f.active
     WHERE md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type, md5(coalesce(f.verification_quote,'')), coalesce(f.source_anchor,''))) = o.sig`;
  if (m.n !== rows.length) throw new Error(`m820 prod overlay: ${m.n} of ${rows.length} field signatures equal prod — seed drifted`);
  return { fields: rows.length, matched: m.n };
}
