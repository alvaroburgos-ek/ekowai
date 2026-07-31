/**
 * Build step (run ONCE, offline, read-only) that assembles the embedded
 * FLL-GAR-2023 snapshot module consumed by seed-fll-gar.ts.
 *
 * It reads the raw per-table JSON dumps in ./_fll-snapshot-raw/ (produced from
 * prod `vadsmshzebefjreqcicl` via the Management API, SELECT-only) and emits a
 * single self-contained TS data module `fll-gar-snapshot.ts`. No prod access is
 * needed at test time — the seeder replays this static snapshot into the
 * disposable embedded Postgres.
 *
 * Re-run: node tests/harness/_build-fll-snapshot.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const raw = join(here, '_fll-snapshot-raw');

const load = (name) => {
  // PowerShell Out-File -Encoding utf8 prepends a BOM; strip it.
  const txt = readFileSync(join(raw, `${name}.json`), 'utf8').replace(/^﻿/, '');
  return JSON.parse(txt);
};

const standard = load('standard');
const templates = load('templates');
const sections = load('sections');
const fields = load('fields');
const equations = load('equations');
const compliance = load('compliance');

// Sanity: single-object standard, arrays elsewhere.
if (Array.isArray(standard)) throw new Error('standard should be a single object');
for (const [n, a] of Object.entries({ templates, sections, fields, equations, compliance })) {
  if (!Array.isArray(a)) throw new Error(`${n} should be an array`);
}

const snapshot = { standard, templates, sections, fields, equations, compliance };

const header = `/**
 * EMBEDDED FLL-GAR-2023 SNAPSHOT — generated, do not hand-edit.
 *
 * Source: prod \`vadsmshzebefjreqcicl\`, standard id
 * b252ce89-6efc-4081-9684-8560b72651ed, dumped read-only via the Management API
 * and assembled by _build-fll-snapshot.mjs. Captures the FULL guideline tree:
 *   standard, ${templates.length} worksheet_templates, ${sections.length} sections,
 *   ${fields.length} fields (with enum_values / validation_rules / default_value),
 *   ${equations.length} equations, ${compliance.length} compliance_requirements.
 *
 * Only columns that exist in the app's Drizzle schema (src/lib/db/schema.ts) are
 * carried — the embedded harness applies THAT schema, which lacks the prod-only
 * audit_* / requires_attestation columns. Regenerate with:
 *   node tests/harness/_build-fll-snapshot.mjs
 */
/* eslint-disable */
// prettier-ignore
export const FLL_GAR_SNAPSHOT = ${JSON.stringify(snapshot)} as const;

export type FllGarSnapshot = typeof FLL_GAR_SNAPSHOT;
`;

writeFileSync(join(here, 'fll-gar-snapshot.ts'), header);
console.log(
  `wrote fll-gar-snapshot.ts: templates=${templates.length} sections=${sections.length} ` +
  `fields=${fields.length} equations=${equations.length} compliance=${compliance.length}`,
);
