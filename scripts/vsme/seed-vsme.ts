/**
 * seed-vsme.ts
 *
 * Orchestrates seeding the VSME standard + UBA emission factors into the
 * LOCAL Supabase database.
 *
 * Safety guard: throws if DATABASE_URL does not contain 127.0.0.1 or localhost
 * to prevent accidental production seeding.
 *
 * Usage (CLI):
 *   pnpm tsx scripts/vsme/seed-vsme.ts [--dry-run]
 *
 * Programmatic:
 *   import { seedVsme } from './seed-vsme';
 *   await seedVsme({ dryRun: false });
 */

import { config as loadEnv } from 'dotenv';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildVsmeWorkbook } from './build-workbook';
import { parseWorkbook } from '../_pass3c-parsers';
import { validateWorkbook } from '../_pass3c-validate';
import { importWorkbook } from '../_pass3c-db';
import { parseUbaFactors, importFactors } from './import-uba-factors';
import { TAXONOMY_DIR } from './_setup';

// Load .env.local if DATABASE_URL is not already in env
if (!process.env.DATABASE_URL) {
  loadEnv({ path: path.resolve(process.cwd(), '.env.local') });
}

const UBA_PATH =
  'C:/Users/Ekowai/Desktop/environmental-reporting service/01_Referenz/uba_liste_ef_für_thg_bilanzierung_v2.1.xlsx';

export type SeedResult = {
  fieldCount: number;
  factorCount: number;
  dryRun: boolean;
};

export async function seedVsme(opts: { dryRun: boolean }): Promise<SeedResult> {
  // ── Safety guard: refuse non-local DATABASE_URL ────────────────────────────
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set — cannot seed.');
  }
  // Accept 127.0.0.1, localhost, or private 172.16–172.31 subnets (WSL2 NAT addresses).
  if (!/127\.0\.0\.1|localhost|172\.(1[6-9]|2\d|3[01])\./.test(url)) {
    throw new Error(
      `SAFETY: DATABASE_URL does not point to a local address — refusing to seed. ` +
        `(Allowed: 127.0.0.1, localhost, WSL2 172.16–172.31 subnet.) ` +
        `Current value starts with: ${url.slice(0, 40)}...`,
    );
  }

  // ── Build the VSME workbook (async: writes XBRL taxonomy → .xlsx buffer) ──
  console.log('[seed-vsme] Building VSME workbook from taxonomy...');
  const buf = await buildVsmeWorkbook(TAXONOMY_DIR);

  // Write to a temp file so parseWorkbook (which takes a path) can read it.
  const tmp = path.join(os.tmpdir(), 'VSME_Pass3c_seed.xlsx');
  fs.writeFileSync(tmp, buf);
  console.log(`[seed-vsme] Workbook written to ${tmp} (${buf.length} bytes)`);

  // ── Parse ─────────────────────────────────────────────────────────────────
  console.log('[seed-vsme] Parsing workbook...');
  const parsed = await parseWorkbook(tmp);
  console.log(
    `[seed-vsme] Parsed: ${parsed.worksheets.length} worksheets / ` +
      `${parsed.sections.length} sections / ` +
      `${parsed.fields.length} fields / ` +
      `${parsed.complianceRequirements.length} CRs`,
  );

  // ── Validate ──────────────────────────────────────────────────────────────
  console.log('[seed-vsme] Validating...');
  const errors = validateWorkbook(parsed);
  if (errors.length > 0) {
    const sample = errors.slice(0, 50).map((e) => `  [${e.sheet} row ${e.row}] ${e.message}`);
    console.error('[seed-vsme] Validation errors:\n' + sample.join('\n'));
    if (errors.length > 50) console.error(`  ... and ${errors.length - 50} more`);
    throw new Error(`[seed-vsme] Workbook invalid: ${errors.length} validation error(s)`);
  }
  console.log('[seed-vsme] Validation passed.');

  if (opts.dryRun) {
    console.log(`[seed-vsme] dry-run: workbook valid. fields=${parsed.fields.length}`);
    // Clean up temp file
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    return { fieldCount: parsed.fields.length, factorCount: 0, dryRun: true };
  }

  // ── Import workbook ───────────────────────────────────────────────────────
  console.log('[seed-vsme] Importing workbook into local DB...');
  const counts = await importWorkbook(url, parsed);
  console.log(
    `[seed-vsme] Workbook imported: ${counts.fields} fields, ` +
      `${counts.worksheetTemplates} worksheets, ${counts.complianceRequirements} CRs`,
  );

  // ── Parse + import UBA emission factors ───────────────────────────────────
  console.log('[seed-vsme] Parsing UBA factors from:', UBA_PATH);
  const factors = parseUbaFactors(UBA_PATH, 'v2.1', 2024);
  console.log(`[seed-vsme] Parsed ${factors.length} UBA factor rows.`);

  const factorCount = await importFactors(url, factors);
  console.log(`[seed-vsme] Imported ${factorCount} UBA factors.`);

  // Clean up temp file
  try { fs.unlinkSync(tmp); } catch { /* ignore */ }

  console.log(
    `[seed-vsme] Done. VSME fields: ${counts.fields}, UBA factors: ${factorCount}`,
  );

  return { fieldCount: counts.fields, factorCount, dryRun: false };
}

// ── CLI entry point ───────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]).endsWith('seed-vsme.ts')) {
  const dryRun = process.argv.includes('--dry-run');
  seedVsme({ dryRun }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
