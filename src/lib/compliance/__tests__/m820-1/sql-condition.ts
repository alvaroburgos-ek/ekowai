import { readFileSync } from 'node:fs';

/**
 * DWA-M 820-1 client route — reads the SHIPPED conditions / visible_when rules out of the staged migration file, so the
 * unit tests evaluate exactly the text the owner will apply. Copied from the FLL-wave helper
 * (branch feat/fll-field-na-structure, src/lib/compliance/__tests__/fll-wave/sql-condition.ts, commits 524459a / 37c0006 /
 * f69dbe8) and extended with the two visible_when readers at the end.
 */

/**
 * Splits SQL text on unquoted semicolons (quote-aware and comment-aware).
 * Handles escaped single quotes ('') correctly.
 * Skips line comments (--) and block comments (with forward slash-star delimiters) outside quoted strings.
 * @param sql - SQL text to split
 * @returns Array of SQL statements
 */
export function splitOnUnquotedSemicolons(sql: string): string[] {
  const statements: string[] = [];
  let currentStatement = '';
  let inQuote = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];

    if (inQuote) {
      // Inside a quoted string: only look for closing quote or escaped quote
      if (char === "'" && i + 1 < sql.length && sql[i + 1] === "'") {
        // Escaped quote: ''
        currentStatement += "''";
        i++; // skip the next quote
      } else if (char === "'") {
        // Closing quote
        inQuote = false;
        currentStatement += char;
      } else {
        currentStatement += char;
      }
    } else {
      // Outside a quoted string: handle comments and special characters
      if (char === "'" ) {
        // Opening quote
        inQuote = true;
        currentStatement += char;
      } else if (char === '-' && i + 1 < sql.length && sql[i + 1] === '-') {
        // Line comment: skip until end of line
        i += 2; // skip the '--'
        while (i < sql.length && sql[i] !== '\n') {
          i++;
        }
        // i is now at '\n' or end of file; the for loop will increment i
      } else if (char === '/' && i + 1 < sql.length && sql[i + 1] === '*') {
        // Block comment: skip until */
        i += 2; // skip the '/*'
        while (i < sql.length - 1) {
          if (sql[i] === '*' && sql[i + 1] === '/') {
            i += 2; // skip the '*/'
            break;
          }
          i++;
        }
        i--; // back up one because the for loop will increment
      } else if (char === ';') {
        // Found an unquoted semicolon - end of statement
        if (currentStatement.trim()) {
          statements.push(currentStatement);
        }
        currentStatement = '';
      } else {
        currentStatement += char;
      }
    }
  }

  // Add the last statement if it's not empty
  if (currentStatement.trim()) {
    statements.push(currentStatement);
  }

  return statements;
}

/**
 * Extracts and unescapes the condition string from an UPDATE compliance_requirements statement.
 * Looks for: SET condition = '<condition>' ... WHERE cr.code = '<reqCode>'
 * Unescapes '' (SQL escaped single quote) to ' (single quote).
 * @param file - Path to SQL file
 * @param reqCode - The requirement code to find
 * @returns The condition string with '' unescaped to '
 * @throws If no matching statement is found
 */
export function conditionFromSql(file: string, reqCode: string): string {
  const sql = readFileSync(file, 'utf8');

  // Split into statements at unquoted semicolons (quote-aware)
  const statements = splitOnUnquotedSemicolons(sql);

  // Match: SET condition = '(anything)' ... code = 'reqCode'
  // The condition value can contain escaped single quotes ''
  // Within a single statement, we can use [\s\S]*? without worrying about semicolons
  // Allow optional whitespace around = signs per repo style (e.g. code='REQ-05')
  const re = /SET\s+condition\s*=\s*'((?:[^']|'')*)'[\s\S]*?code\s*=\s*'([^']+)'/;

  for (const statement of statements) {
    const m = statement.match(re);
    if (m && m[2] === reqCode) {
      // Unescape SQL escaped quotes: '' -> '
      return m[1].replace(/''/g, "'");
    }
  }

  throw new Error(`no SET condition for ${reqCode} in ${file}`);
}

/**
 * Extracts the marker text from a comment line and verifies it appears as a SQL literal.
 * Looks for: -- CONDITION <reqCode>: <text>
 * Then verifies that <text> appears as a SQL string literal (with '' escaping) later in file.
 * @param file - Path to SQL file
 * @param reqCode - The requirement code to find
 * @returns The marker text (trimmed)
 * @throws If marker is missing or marker text doesn't appear as a SQL literal
 */
export function insertedConditionFromSql(file: string, reqCode: string): string {
  const sql = readFileSync(file, 'utf8');

  // Find the marker line: -- CONDITION <reqCode>: <text>
  const markerRe = new RegExp(`^\\s*-- CONDITION ${reqCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: (.*)$`, 'm');
  const markerMatch = sql.match(markerRe);
  if (!markerMatch) {
    throw new Error(`no marker -- CONDITION ${reqCode} in ${file}`);
  }

  const markerText = markerMatch[1].trim();

  // Verify that markerText appears as a SQL string literal (with '' escaping) AFTER the marker
  // Search only in the portion of the file after the marker line (per B-2: "appears later")
  const markerEndPos = markerMatch.index! + markerMatch[0].length;
  const afterMarker = sql.slice(markerEndPos);

  // The marker text is unescaped; we need to find it as a SQL literal with '' for each '
  const escapedForSql = markerText.replace(/'/g, "''");
  // Look for it as a SQL string: 'escapedForSql'
  if (!afterMarker.includes(`'${escapedForSql}'`)) {
    throw new Error(`marker/INSERT mismatch for ${reqCode}`);
  }

  return markerText;
}

/**
 * The plain `SET visible_when = '<rule>'` an UPDATE writes on `symbol` (the statement that targets `visible_when IS NULL`;
 * the composed `'(' || f.visible_when || ') AND (…)'` form is skipped because it does not start with a quote).
 */
export function visibleWhenFromSql(file: string, symbol: string): string {
  const statements = splitOnUnquotedSemicolons(readFileSync(file, 'utf8'));
  const re = /SET\s+visible_when\s*=\s*'((?:[^']|'')*)'/;
  for (const st of statements) {
    if (!/^\s*UPDATE\s+fields/i.test(st) || !st.includes(`'${symbol}'`) || !/visible_when\s+IS\s+NULL/i.test(st)) continue;
    const m = st.match(re);
    if (m) return m[1].replace(/''/g, "'");
  }
  throw new Error(`no SET visible_when for ${symbol} in ${file}`);
}

/** The `visible_when` literal of a field the file INSERTs (the literal right before `NULL, ARRAY[` = enum_values, consumers). */
export function insertedFieldVisibleWhen(file: string, symbol: string): string {
  const statements = splitOnUnquotedSemicolons(readFileSync(file, 'utf8'));
  for (const st of statements) {
    if (!/^\s*INSERT\s+INTO\s+fields/i.test(st) || !st.includes(`'${symbol}'`)) continue;
    const m = st.match(/'((?:[^']|'')*)',\s*NULL,\s*ARRAY\[/);
    if (m) return m[1].replace(/''/g, "'");
  }
  throw new Error(`no INSERT of ${symbol} with a visible_when in ${file}`);
}
