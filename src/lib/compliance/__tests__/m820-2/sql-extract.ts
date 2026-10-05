import { readFileSync } from 'node:fs';
import { splitOnUnquotedSemicolons } from '../m820-1/sql-condition';

/**
 * DWA-M 820-2 registers — reads the SHIPPED values (ui_config json, equation formulas, gate condition) out of the staged
 * migration file, so the unit tests evaluate exactly the text the owner will apply.
 */

/** Every single-quoted SQL string literal of a statement, in order, with '' unescaped. */
export function literals(stmt: string): string[] {
  const out: string[] = [];
  const re = /'((?:[^']|'')*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stmt)) !== null) out.push(m[1].replace(/''/g, "'"));
  return out;
}

/** Literals immediately followed by `::jsonb`, parsed. */
export function jsonbLiterals(stmt: string): unknown[] {
  const out: unknown[] = [];
  const re = /'((?:[^']|'')*)'::jsonb/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stmt)) !== null) out.push(JSON.parse(m[1].replace(/''/g, "'")));
  return out;
}

function statements(file: string): string[] {
  return splitOnUnquotedSemicolons(readFileSync(file, 'utf8'));
}

/** The INSERT INTO fields statement that creates `symbol` (third literal after the section subquery = the symbol). */
export function insertedFieldStatement(file: string, symbol: string): string {
  for (const st of statements(file)) {
    if (/^\s*INSERT\s+INTO\s+fields/i.test(st) && st.includes(`f2.symbol = '${symbol}')`)) return st;
  }
  throw new Error(`no INSERT of field ${symbol} in ${file}`);
}

/** ui_config of an inserted register field. */
export function insertedUiConfig(file: string, symbol: string): unknown {
  const js = jsonbLiterals(insertedFieldStatement(file, symbol));
  if (js.length !== 1) throw new Error(`expected one jsonb literal for ${symbol}, got ${js.length}`);
  return js[0];
}

/** The UPDATE fields statement that targets `symbol`. */
export function updateStatement(file: string, symbol: string): string {
  for (const st of statements(file)) {
    if (/^\s*UPDATE\s+fields/i.test(st) && st.includes(`f.symbol = '${symbol}'`)) return st;
  }
  throw new Error(`no UPDATE of ${symbol} in ${file}`);
}

/** Formula of an inserted equation (the literal right after its equation number). */
export function formulaOf(file: string, equationNumber: string): string {
  for (const st of statements(file)) {
    if (!/^\s*INSERT\s+INTO\s+equations/i.test(st)) continue;
    const l = literals(st);
    const i = l.indexOf(equationNumber);
    if (i >= 0) return l[i + 1];
  }
  throw new Error(`no equation ${equationNumber} in ${file}`);
}

/** The condition of an inserted gate (`SELECT w.id, '<code>', '<title_de>', '<title_en>', '<condition>'`). */
export function insertedGateCondition(file: string, code: string): string {
  for (const st of statements(file)) {
    if (!/^\s*INSERT\s+INTO\s+compliance_requirements/i.test(st)) continue;
    const l = literals(st);
    if (l[0] === code) return l[3];
  }
  throw new Error(`no INSERT of gate ${code} in ${file}`);
}
