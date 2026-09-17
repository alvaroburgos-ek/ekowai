/**
 * Plan 2b, Task 8 — source-level guard: `worksheet-form.tsx` has ONE renderer
 * path (`renderWidget(f, widgetCtx)` → the WIDGETS registry) and no
 * symbol-keyed carrier wiring left. The only sanctioned symbol table is
 * `BESPOKE_BY_SYMBOL` in widgets.tsx (KOSTRA r_D_n_table, risk_register,
 * risk_mitigation_plan) — never the form.
 *
 * What the form may still read by symbol (every entry documented, and the
 * test pins the EXACT set so a new lookup fails here first):
 *   fieldBySymbol.get('…') —
 *     a_s_m_determination_method  A138-12 method → engine suppress set + DynamicField asmMethod
 *     a_s_m_provenance            DynamicField asmProvenance (badge text)
 *     a_s_m_needs_reconfirmation  DynamicField asmNeedsReconfirmation (amber badge)
 *     ac_as_ratio_check_reason    DynamicField statusReason for the sibling check field
 *   f.symbol === '…' —
 *     ac_as_ratio_check           gate for the statusReason feed above
 *     A_S_m                       manual-method exception to isComputed (A138-12)
 *   Set literals (computedSymbols contributions, gated by fieldBySymbol.has) —
 *     BASIN_GOVERNING_SYMBOLS, LOADING_CHECK_SYMBOLS (incl. ac_as_ratio_limit —
 *     the server-owned symbol the lookup_fill widget renders in display mode),
 *     PHASE4_READONLY_SYMBOLS, VSME_CO2_ENGINE_SYMBOLS (provenance hint only).
 *
 * Matching notes: the source is NORMALISED first — `"` and `` ` `` become `'` —
 * so a double-quoted or template-string literal cannot evade the checks. The
 * retired-literal check also rejects the bare token followed by `)` (`sym)`):
 * that is the comment-phrasing heuristic from the brief — it catches prose
 * like "(… A138-07 surface_inventory)" and call sites like `get(sym)` alike,
 * so retired names cannot linger in comments either.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Quote-normalise so `"x"` and `` `x` `` match the same patterns as `'x'`. */
const norm = (s: string) => s.replace(/["`]/g, "'");

const src = norm(readFileSync(join(__dirname, '..', 'worksheet-form.tsx'), 'utf8'));
const page = norm(
  readFileSync(
    join(__dirname, '..', '..', '..', 'app', '[locale]', '(app)', 'projects', '[id]', 'standards', '[standardCode]', 'worksheets', '[worksheetCode]', 'page.tsx'),
    'utf8',
  ),
);

/** The four carriers Plan 2b migrated off the form (Tasks 4–7). */
const MIGRATED_CARRIERS = ['surface_inventory', 'pollutant_register', 'rainfall_table_ref', 'ac_as_ratio_limit'];

/** Literals of the symbol-keyed era that must not appear quoted or as a `sym)` call/comment token. */
const RETIRED_LITERALS = [
  'surface_inventory',
  'rainfall_table_ref',
  'r_D_n_table',
  'risk_register',
  'risk_mitigation_plan',
  'pollutant_register',
  'POLLUTANT_REGISTER_SYMBOL',
  'SELECTION_CONFIGS',
];

const ALLOWED_GET = ['a_s_m_determination_method', 'a_s_m_provenance', 'a_s_m_needs_reconfirmation', 'ac_as_ratio_check_reason'];
const ALLOWED_EQ = ['ac_as_ratio_check', 'A_S_m'];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The three carrier-lookup shapes, as functions of the (normalised) source so a probe can reuse them. */
const lookupPatterns = (c: string) => ({
  get: new RegExp(`fieldBySymbol\\.get\\('${esc(c)}'\\)`),
  eq: new RegExp(`\\.symbol\\s*[!=]==\\s*'${esc(c)}'`),
  // `[^\n]*` (not `[^)]*`): the canonical `fields.find((f) => f.symbol === 'x')` has a `)` before the literal.
  find: new RegExp(`fields\\.find\\([^\\n]*'${esc(c)}'`),
});
const carrierLookups = (text: string, c: string) => {
  const p = lookupPatterns(c);
  return { get: p.get.test(text), eq: p.eq.test(text), find: p.find.test(text) };
};
const symbolReads = (text: string) => ({
  get: new Set([...text.matchAll(/fieldBySymbol\.get\('([^']+)'\)/g)].map((m) => m[1])),
  eq: new Set([...text.matchAll(/\.symbol\s*[!=]==\s*'([^']+)'/g)].map((m) => m[1])),
});

describe('Plan 2b: one renderer path', () => {
  it('worksheet-form.tsx has no symbol-keyed carrier wiring left', () => {
    for (const c of MIGRATED_CARRIERS) {
      expect(carrierLookups(src, c), c).toEqual({ get: false, eq: false, find: false });
    }
    for (const sym of RETIRED_LITERALS) {
      expect(src.includes(`'${sym}'`) || src.includes(sym + ')'), sym).toBe(false);
    }
    expect(src).not.toMatch(/fields\.find\(\(f\) => f\.symbol ===/);
    // ac_as_ratio_limit survives ONLY as a LOADING_CHECK_SYMBOLS member.
    const limitHits = [...src.matchAll(/'ac_as_ratio_limit'/g)];
    expect(limitHits).toHaveLength(1);
    const start = src.indexOf('const LOADING_CHECK_SYMBOLS');
    const block = src.slice(start, src.indexOf(']);', start));
    expect(block).toContain("'ac_as_ratio_limit'");
  });

  it('every remaining symbol-keyed read is on the documented allow-list (exact set, === and !== alike)', () => {
    const reads = symbolReads(src);
    expect(reads.get).toEqual(new Set(ALLOWED_GET));
    expect(reads.eq).toEqual(new Set(ALLOWED_EQ));
  });

  it('the ASM method/provenance symbols stay (they feed DynamicField props, not carrier dispatch)', () => {
    expect(src).toMatch(/'a_s_m_determination_method'/);
  });

  it('the form dispatches every field through renderWidget (the WIDGETS registry), never indexing WIDGETS itself', () => {
    expect(src).toMatch(/renderWidget\(f, widgetCtx\)/);
    expect(src).not.toMatch(/WIDGETS\[/);
  });

  it('the form imports no *Editor component except from ./widgets or ./register-editor', () => {
    const editorImports = [...src.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/g)]
      .filter((m) => /\w+Editor\b/.test(m[1]))
      .map((m) => m[2]);
    expect(editorImports.every((p) => p === './widgets' || p === './register-editor'), editorImports.join(', ')).toBe(true);
    // No import of any other `./…-editor` module (default/namespace forms included).
    expect(src).not.toMatch(/from\s+'\.\/(?!register-editor')[a-z-]*-editor'/);
  });

  it('page.tsx no longer casts the field list (or initialValues) to never', () => {
    expect(page).not.toMatch(/\}\) as never\}\s*\n\s*equations=/);
    expect(page).not.toMatch(/as never/);
    expect(page).toMatch(/import type \{ WorksheetFormField \} from '@\/components\/worksheet\/worksheet-form'/);
    expect(page).toMatch(/\(f\): WorksheetFormField =>/);
  });
});

describe('guard self-check: the hardened patterns catch what the review said the old ones missed', () => {
  const canonical = `const carrier = fields.find((f) => f.symbol === "surface_inventory");`;
  it('the canonical fields.find((f) => f.symbol === "…") shape, double-quoted, IS caught', () => {
    const text = norm(canonical);
    expect(carrierLookups(text, 'surface_inventory').find).toBe(true);
    expect(carrierLookups(text, 'surface_inventory').eq).toBe(true);
    expect(text.includes("'surface_inventory'")).toBe(true);
  });
  it('template-string and !== variants are caught too; an unrelated symbol is not', () => {
    const t = norm('if (f.symbol !== `pollutant_register`) return; fieldBySymbol.get(`rainfall_table_ref`)');
    expect(carrierLookups(t, 'pollutant_register').eq).toBe(true);
    expect(carrierLookups(t, 'rainfall_table_ref').get).toBe(true);
    expect(carrierLookups(t, 'surface_inventory')).toEqual({ get: false, eq: false, find: false });
    expect(symbolReads(t).eq).toEqual(new Set(['pollutant_register']));
  });
});
