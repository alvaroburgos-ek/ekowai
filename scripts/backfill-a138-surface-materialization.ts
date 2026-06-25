/**
 * One-time (idempotent) backfill script: materialise A_C / C_m / A_E_ba / A_E_nba
 * for all existing projects that have a DWA-A-138-1 / A138-07 surface_inventory row.
 *
 * Run ONCE at deploy (Runbook step 5) — NOT during Plan 3 implementation.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-a138-surface-materialization.ts [--dry-run]
 *   node scripts/backfill-a138-surface-materialization.js [--dry-run]
 *
 * Requires DATABASE_URL in .env.local (Transaction-Pooler connection string).
 *
 * Idempotent: UPSERTs on (project_id, field_id) with sourceType = 'derived'.
 */

import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import { planSurfaceBackfill } from '../src/lib/eval/backfill-surface-plan';

loadEnv({ path: '.env.local' });

// ---------------------------------------------------------------------------
// A138-07 equation ids (verbatim from the plan's Global Constraints)
// ---------------------------------------------------------------------------
const STANDARD_CODE = 'DWA-A-138-1';
const WORKSHEET_CODE = 'A138-07';

// The four derived field symbols for A138-07
const SYMBOL_AC = 'A_C';
const SYMBOL_CM = 'C_m';
const SYMBOL_BA = 'A_E_ba';
const SYMBOL_NBA = 'A_E_nba';
const SYMBOL_CARRIER = 'surface_inventory';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// ---------------------------------------------------------------------------
// DB connection (same pattern as scripts/smoke-plan4.ts)
// ---------------------------------------------------------------------------
const DB_URL = process.env.DATABASE_URL ?? '';
if (!DB_URL) {
  console.error('ERROR: DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const sql = postgres(DB_URL, { prepare: false });

async function main(): Promise<void> {
  console.log(`=== A138-07 surface-materialization backfill ===`);
  console.log(`Standard: ${STANDARD_CODE} / Worksheet: ${WORKSHEET_CODE}`);
  if (dryRun) console.log('[DRY-RUN] No writes will be performed.');
  console.log('');

  // -------------------------------------------------------------------------
  // 1. Resolve the worksheet template id for A138-07 within DWA-A-138-1
  // -------------------------------------------------------------------------
  const templateRows = await sql<{ id: string }[]>`
    SELECT wt.id
    FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = ${STANDARD_CODE}
      AND wt.code = ${WORKSHEET_CODE}
    LIMIT 1
  `;
  if (templateRows.length === 0) {
    console.error(`ERROR: worksheet template ${WORKSHEET_CODE} not found for standard ${STANDARD_CODE}.`);
    process.exit(1);
  }
  const worksheetTemplateId = templateRows[0].id;
  console.log(`Worksheet template id: ${worksheetTemplateId}`);

  // -------------------------------------------------------------------------
  // 2. Resolve field ids for surface_inventory + the four derived outputs
  // -------------------------------------------------------------------------
  const fieldSymbols = [SYMBOL_CARRIER, SYMBOL_AC, SYMBOL_CM, SYMBOL_BA, SYMBOL_NBA];
  const fieldRows = await sql<{ id: string; symbol: string }[]>`
    SELECT id, symbol
    FROM fields
    WHERE worksheet_template_id = ${worksheetTemplateId}
      AND symbol = ANY(${fieldSymbols})
      AND active = true
  `;

  const fieldIdBySymbol = new Map<string, string>(fieldRows.map((r) => [r.symbol, r.id]));

  const carrierId = fieldIdBySymbol.get(SYMBOL_CARRIER);
  const acFieldId = fieldIdBySymbol.get(SYMBOL_AC);
  const cmFieldId = fieldIdBySymbol.get(SYMBOL_CM);
  const baFieldId = fieldIdBySymbol.get(SYMBOL_BA);
  const nbaFieldId = fieldIdBySymbol.get(SYMBOL_NBA);

  if (!carrierId || !acFieldId || !cmFieldId || !baFieldId || !nbaFieldId) {
    console.error(`ERROR: could not resolve all required field ids.`);
    console.error(`  ${SYMBOL_CARRIER}: ${carrierId ?? 'MISSING'}`);
    console.error(`  ${SYMBOL_AC}: ${acFieldId ?? 'MISSING'}`);
    console.error(`  ${SYMBOL_CM}: ${cmFieldId ?? 'MISSING'}`);
    console.error(`  ${SYMBOL_BA}: ${baFieldId ?? 'MISSING'}`);
    console.error(`  ${SYMBOL_NBA}: ${nbaFieldId ?? 'MISSING'}`);
    process.exit(1);
  }

  console.log(`Field ids resolved:`);
  console.log(`  ${SYMBOL_CARRIER}: ${carrierId}`);
  console.log(`  ${SYMBOL_AC}:      ${acFieldId}`);
  console.log(`  ${SYMBOL_CM}:      ${cmFieldId}`);
  console.log(`  ${SYMBOL_BA}:  ${baFieldId}`);
  console.log(`  ${SYMBOL_NBA}: ${nbaFieldId}`);
  console.log('');

  // -------------------------------------------------------------------------
  // 3. Load all projects that have a surface_inventory project_parameters row
  // -------------------------------------------------------------------------
  const carrierParamRows = await sql<{ project_id: string; value_json: unknown; entered_by: string }[]>`
    SELECT project_id, value_json, entered_by
    FROM project_parameters
    WHERE field_id = ${carrierId}
  `;

  if (carrierParamRows.length === 0) {
    console.log('No projects found with a surface_inventory row — nothing to backfill.');
    return;
  }

  console.log(`Found ${carrierParamRows.length} project(s) with a surface_inventory row.`);
  console.log('');

  // -------------------------------------------------------------------------
  // 4. Plan the backfill (pure, no DB)
  // -------------------------------------------------------------------------
  // Build a map of projectId → entered_by so we can stamp each derived row
  // with a guaranteed-valid actor UUID (the same user who entered the carrier).
  const enteredByByProject = new Map<string, string>(
    carrierParamRows.map((row) => [row.project_id, row.entered_by]),
  );

  const planInput = carrierParamRows.map((row) => ({
    projectId: row.project_id,
    acFieldId: acFieldId!,
    cmFieldId: cmFieldId!,
    baFieldId: baFieldId!,
    nbaFieldId: nbaFieldId!,
    carrier: row.value_json,
  }));

  const planned = planSurfaceBackfill(planInput);

  // -------------------------------------------------------------------------
  // 5. Print per-project summary
  // -------------------------------------------------------------------------
  for (const inputRow of planInput) {
    const projectRows = planned.filter((r) => r.projectId === inputRow.projectId);
    const ac = projectRows.find((r) => r.fieldId === acFieldId)?.valueNumber;
    const cm = projectRows.find((r) => r.fieldId === cmFieldId)?.valueNumber;
    const ba = projectRows.find((r) => r.fieldId === baFieldId)?.valueNumber;
    const nba = projectRows.find((r) => r.fieldId === nbaFieldId)?.valueNumber;
    const enteredBy = enteredByByProject.get(inputRow.projectId) ?? '(unknown)';
    const status = ac == null ? 'SKIP (carrier empty/incomplete)' : `A_C=${ac?.toFixed(2)}, C_m=${cm?.toFixed(4)}, A_E_ba=${ba?.toFixed(2)}, A_E_nba=${nba?.toFixed(2)}`;
    console.log(`  [${inputRow.projectId}] ${status} | entered_by=${enteredBy}`);
  }
  console.log('');

  if (dryRun) {
    console.log('[DRY-RUN] Would upsert', planned.length, 'derived project_parameters rows.');
    console.log('[DRY-RUN] Exiting without writing.');
    return;
  }

  // -------------------------------------------------------------------------
  // 6. UPSERT derived project_parameters rows
  //    Idempotent: ON CONFLICT (project_id, field_id) DO UPDATE
  //    Writes valueNumber only (derived scalars); clears stale nulls on re-run.
  // -------------------------------------------------------------------------
  let upsertCount = 0;
  for (const row of planned) {
    // Stamp derived rows with the entered_by of that project's carrier row —
    // a guaranteed-valid auth.users UUID (entered_by is NOT NULL / no default).
    const enteredBy = enteredByByProject.get(row.projectId);
    if (!enteredBy) {
      console.warn(`  WARN: no entered_by found for project ${row.projectId} — skipping.`);
      continue;
    }
    // numeric column: pass null or the number as a string (postgres driver handles it)
    await sql`
      INSERT INTO project_parameters (project_id, field_id, value_number, source_type, entered_by)
      VALUES (
        ${row.projectId}::uuid,
        ${row.fieldId}::uuid,
        ${row.valueNumber},
        'derived',
        ${enteredBy}::uuid
      )
      ON CONFLICT (project_id, field_id)
      DO UPDATE SET
        value_number = EXCLUDED.value_number,
        source_type  = 'derived',
        entered_by   = EXCLUDED.entered_by
    `;
    upsertCount++;
  }

  console.log(`Upserted ${upsertCount} derived project_parameters rows.`);
  console.log('Backfill complete.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('BACKFILL FAILED:', err);
    process.exit(1);
  })
  .finally(() => sql.end());
