/**
 * Plan 3 Task 0 — the equations emitter: NEW `equations` rows only, from
 * `src/lib/eval/equations/<slug>.ts`.
 *
 *   - the worksheet is resolved by code (`w.code` + `s.code`), never by id;
 *   - `ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING` — an
 *     existing equation is never updated here (a replacement is a ruling and
 *     lives in `scripts/verification/<slug>-STAGED-plan3-rulings.sql` with
 *     its ☐ RATIFIED marker);
 *   - `verification_status = 'imported_unverified'` always (a text-only
 *     derivation ships the lifted sentence as `verification_quote`; `null`
 *     means the task filed a sign-off entry);
 *   - the `Plan 3:` description prefix is the rollback selector: the rollback
 *     deletes only rows this migration inserted.
 *
 * A formula is refused unless its right-hand side parses in the Plan-2a
 * language, names only functions the evaluator supports, and lists every
 * free worksheet symbol in `input_symbols` (register column names inside
 * row-scoped arguments are not free symbols — `extractSymbols` knows the
 * rule); `validateEngineEligibility` runs as well so the emitter and the
 * runtime gate agree. WRITTEN, NOT APPLIED.
 */
import { parseNumeric, extractSymbols, unknownFunctionNames, quotedComparisonLiterals } from '../../src/lib/expr';
import { validateEngineEligibility } from '../../src/lib/eval/engine-eligibility';
import type { EquationEntry } from '../../src/lib/eval/field-configs/types';
import { EQUATION_MODULES } from '../../src/lib/eval/equations';
import { q, JOIN, writeSql } from './emit-widget-configs-sql';

/** Math constants the evaluator resolves without a backing field (mirrors engine-eligibility.ts). */
const RESERVED_CONSTANTS: ReadonlySet<string> = new Set(['pi', 'e']);
const textOrNull = (v: string | null | undefined) => (v == null ? 'NULL' : q(v));

/** Split `out = expr`; the output symbol must match `output_symbol`. */
function splitFormula(e: EquationEntry): { lhs: string; rhs: string } {
  const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([\s\S]+)$/.exec(e.formula);
  if (!m) throw new Error(`${e.worksheet} ${e.equation_number}: formula does not parse — expected 'out = expr', got ${JSON.stringify(e.formula)}`);
  if (m[1] !== e.output_symbol) throw new Error(`${e.worksheet} ${e.equation_number}: formula output ${m[1]} != output_symbol ${e.output_symbol}`);
  return { lhs: m[1], rhs: m[2] };
}

function validateEntry(e: EquationEntry): void {
  if (!e.description.startsWith('Plan 3:')) throw new Error(`${e.worksheet} ${e.equation_number}: description must start with 'Plan 3:' (rollback selector)`);
  const { rhs } = splitFormula(e);
  const parsed = parseNumeric(rhs);
  if (!parsed.ok) throw new Error(`${e.worksheet} ${e.equation_number}: formula does not parse: ${parsed.message}`);
  const unknown = unknownFunctionNames(parsed.node);
  if (unknown.length) throw new Error(`${e.worksheet} ${e.equation_number}: not engine-eligible: unsupported function(s) ${unknown.join(', ')}`);
  const declared = new Set(e.input_symbols);
  const free = [...extractSymbols(parsed.node)].filter((s) => !declared.has(s) && !RESERVED_CONSTANTS.has(s));
  if (free.length) throw new Error(`${e.worksheet} ${e.equation_number}: not engine-eligible: free symbol(s) missing from input_symbols: ${free.join(', ')}`);
  const el = validateEngineEligibility(e.formula, e.input_symbols, declared);
  if (!el.verified) throw new Error(`${e.worksheet} ${e.equation_number}: not engine-eligible: ${el.reason}`);
}

/**
 * Task 13b (sign-off din276-X-1) belt-and-braces lint — a WARNING, never a refusal: a quoted string literal in
 * comparison position of a formula (`if(status == 'rechnung', …)`) is a literal by the engine rule, but when the same
 * token is also one of the equation's `input_symbols` or an output symbol of the worksheet's equations in this batch, a
 * bare-ident spelling of it elsewhere WOULD resolve to that symbol — the executor records it. Register column keys are
 * not known here (they live in the field-config module; `emit-field-configs-sql.ts` lints those).
 */
export function quotedLiteralCollisionWarnings(entries: EquationEntry[]): string[] {
  const out: string[] = [];
  const outputsByWorksheet = new Map<string, Set<string>>();
  for (const e of entries) {
    if (!outputsByWorksheet.has(e.worksheet)) outputsByWorksheet.set(e.worksheet, new Set());
    outputsByWorksheet.get(e.worksheet)!.add(e.output_symbol);
  }
  for (const e of entries) {
    const m = /^\s*[A-Za-z_][A-Za-z0-9_]*\s*=\s*([\s\S]+)$/.exec(e.formula);
    const parsed = m ? parseNumeric(m[1]) : null;
    if (!parsed?.ok) continue;
    const inputs = new Set(e.input_symbols);
    for (const lit of quotedComparisonLiterals(parsed.node)) {
      const hits: string[] = [];
      if (inputs.has(lit)) hits.push('an input_symbols member');
      if (outputsByWorksheet.get(e.worksheet)?.has(lit)) hits.push(`an equation output on ${e.worksheet}`);
      if (hits.length) out.push(`WARNING ${e.worksheet} ${e.equation_number}: formula compares against the quoted literal '${lit}', which is also ${hits.join(' and ')} — a literal by the engine rule (Task 13b), but a bare-ident spelling of the same token would resolve to it; record on the sign-off sheet`);
    }
  }
  return out;
}

/** `warnings`: the Task 13b quoted-literal collision lint (never a refusal) — the CLI prints them to stderr. */
export function emitEquationsSql(slug: string, entries: EquationEntry[]): { up: string; down: string; warnings: string[] } {
  const up = [
    `-- Generated by scripts/regulation-tables/emit-equations-sql.ts for ${slug} (Plan 3). New rows only; existing equations are never updated here (rulings live in scripts/verification/${slug}-STAGED-plan3-rulings.sql). Regenerate, do not hand-edit.`,
    'BEGIN;',
  ];
  const down = [
    `-- Generated rollback for ${slug} equations (scripts/regulation-tables/emit-equations-sql.ts). Deletes only the 'Plan 3:' rows this migration inserted. Regenerate, do not hand-edit.`,
    'BEGIN;',
  ];
  const seen = new Set<string>();
  for (const e of entries) {
    const key = `${e.worksheet} ${e.equation_number}`;
    if (seen.has(key)) throw new Error(`${key}: duplicate equation_number on the worksheet`);
    seen.add(key);
    validateEntry(e);
    up.push(`INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status, verification_quote)
SELECT w.id, ${q(e.equation_number)}, ${q(e.formula)}, ARRAY[${e.input_symbols.map(q).join(',')}]::text[], ${q(e.output_symbol)}, ${textOrNull(e.output_unit)}, ${q(e.clause_reference)}, ${q(e.description)}, 'imported_unverified', ${textOrNull(e.verification_quote)}
${JOIN} WHERE w.code = ${q(e.worksheet)} AND s.code = ${q(e.standard)}
ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING;`);
    down.push(`DELETE FROM equations e USING worksheet_templates w, standards s WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = ${q(e.standard)} AND w.code = ${q(e.worksheet)} AND e.equation_number = ${q(e.equation_number)} AND e.description LIKE 'Plan 3:%';`);
  }
  up.push('COMMIT;'); down.push('COMMIT;');
  return { up: up.join('\n') + '\n', down: down.join('\n') + '\n', warnings: quotedLiteralCollisionWarnings(entries) };
}

/** Migration + rollback file paths for a slug and timestamp (relative to the repo root). */
export function equationFilesFor(slug: string, ts: string): { migration: string; rollback: string } {
  if (!/^\d{14}$/.test(ts)) throw new Error(`timestamp must be 14 digits, got ${JSON.stringify(ts)}`);
  return {
    migration: `scripts/migrations/${ts}_equations_${slug}.sql`,
    rollback: `scripts/rollback-${ts}-equations-${slug.replace(/_/g, '-')}.sql`,
  };
}

if (process.argv[1]?.endsWith('emit-equations-sql.ts')) {
  // CLI: tsx scripts/regulation-tables/emit-equations-sql.ts <slug> <ts>   (reads src/lib/eval/equations/<slug>.ts via EQUATION_MODULES)
  const [slug = '', ts = ''] = process.argv.slice(2);
  const load = EQUATION_MODULES[slug];
  if (!load) throw new Error(`unknown equations slug ${JSON.stringify(slug)} — known: ${Object.keys(EQUATION_MODULES).join(', ') || '(none)'}`);
  const files = equationFilesFor(slug, ts);
  load().then((m) => {
    const { up, down, warnings } = emitEquationsSql(slug, m.EQUATIONS);
    // Task 13b: quoted-literal ↔ input/output-symbol collisions are a WARNING (stderr), never a refusal.
    for (const w of warnings) console.error(w);
    writeSql(files.migration, up);
    writeSql(files.rollback, down);
    console.log(`wrote ${m.EQUATIONS.length} equations for ${slug} ->`, files.migration, files.rollback);
  }).catch((err) => { console.error(err); process.exit(1); });
}
