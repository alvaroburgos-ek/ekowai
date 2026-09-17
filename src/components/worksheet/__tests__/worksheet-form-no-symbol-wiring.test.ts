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
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '..', 'worksheet-form.tsx'), 'utf8');
const page = readFileSync(
  join(__dirname, '..', '..', '..', 'app', '[locale]', '(app)', 'projects', '[id]', 'standards', '[standardCode]', 'worksheets', '[worksheetCode]', 'page.tsx'),
  'utf8',
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

const all = (re: RegExp) => [...src.matchAll(re)].map((m) => m[1]);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('Plan 2b: one renderer path', () => {
  it('worksheet-form.tsx has no symbol-keyed carrier wiring left', () => {
    for (const c of MIGRATED_CARRIERS) {
      expect(src, `fieldBySymbol.get('${c}')`).not.toMatch(new RegExp(`fieldBySymbol\\.get\\('${esc(c)}'\\)`));
      expect(src, `.symbol === '${c}'`).not.toMatch(new RegExp(`\\.symbol\\s*[!=]==\\s*'${esc(c)}'`));
      expect(src, `fields.find(... '${c}')`).not.toMatch(new RegExp(`fields\\.find\\([^)]*'${esc(c)}'`));
    }
    for (const sym of RETIRED_LITERALS) {
      expect(src.includes(`'${sym}'`) || src.includes(sym + ')'), sym).toBe(false);
    }
    expect(src).not.toMatch(/fields\.find\(\(f\) => f\.symbol ===/);
    // ac_as_ratio_limit survives ONLY as a LOADING_CHECK_SYMBOLS member.
    const limitHits = [...src.matchAll(/'ac_as_ratio_limit'/g)];
    expect(limitHits).toHaveLength(1);
    const block = src.slice(src.indexOf('const LOADING_CHECK_SYMBOLS'), src.indexOf(']);', src.indexOf('const LOADING_CHECK_SYMBOLS')));
    expect(block).toContain("'ac_as_ratio_limit'");
  });

  it('every remaining symbol-keyed read is on the documented allow-list (exact set)', () => {
    expect(new Set(all(/fieldBySymbol\.get\('([^']+)'\)/g))).toEqual(new Set(ALLOWED_GET));
    expect(new Set(all(/\.symbol\s*===\s*'([^']+)'/g))).toEqual(new Set(ALLOWED_EQ));
  });

  it('the ASM method/provenance symbols stay (they feed DynamicField props, not carrier dispatch)', () => {
    expect(src).toMatch(/'a_s_m_determination_method'/);
  });

  it('the form dispatches every field through renderWidget (the WIDGETS registry), never indexing WIDGETS itself', () => {
    expect(src).toMatch(/renderWidget\(f, widgetCtx\)/);
    expect(src).not.toMatch(/WIDGETS\[/);
  });

  it('page.tsx no longer casts the field list (or initialValues) to never', () => {
    expect(page).not.toMatch(/\}\) as never\}\s*\n\s*equations=/);
    expect(page).not.toMatch(/as never/);
    expect(page).toMatch(/import type \{ WorksheetFormField \} from '@\/components\/worksheet\/worksheet-form'/);
    expect(page).toMatch(/\(f\): WorksheetFormField =>/);
  });
});
