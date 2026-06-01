import { config as loadEnv } from 'dotenv';
import { parseWorkbook } from './_pass3c-parsers';
import { validateWorkbook } from './_pass3c-validate';
import { importWorkbook, type ImportCounts } from './_pass3c-db';

loadEnv({ path: '.env.local' });

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const forceExperimental = args.includes('--force-experimental');
const file = args.find((a) => !a.startsWith('--'));

if (!file) {
  console.error('Usage: pnpm tsx scripts/import-pass3c.ts <path-to-xlsx> [--dry-run] [--force-experimental]');
  process.exit(1);
}

if (!file.toLowerCase().includes('pass3c') && !forceExperimental) {
  console.error(
    `Refusing to import "${file}": filename does not contain "Pass3c".`,
  );
  console.error('Use --force-experimental if you really mean it (e.g. Pass3b3c FLL workbooks).');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL is not set in .env.local');
  process.exit(1);
}

async function main(): Promise<void> {
  console.log(`Reading ${file}...`);
  const parsed = await parseWorkbook(file!);
  console.log(
    `✓ Parsed: ${parsed.worksheets.length} worksheets / ${parsed.fields.length} fields / ${parsed.equations.length} equations / ${parsed.complianceRequirements.length} reqs`,
  );

  console.log('Validating...');
  const errors = validateWorkbook(parsed);
  if (errors.length > 0) {
    console.error(`✗ ${errors.length} validation error(s):`);
    for (const e of errors.slice(0, 50)) {
      console.error(`  [${e.sheet} row ${e.row}] ${e.message}`);
    }
    if (errors.length > 50) console.error(`  ... and ${errors.length - 50} more`);
    process.exit(1);
  }
  console.log(`✓ Validation passed (no errors)`);

  if (dryRun) {
    console.log('--dry-run: skipping DB write.');
    const counts: ImportCounts = {
      standards: 1,
      worksheetTemplates: parsed.worksheets.length,
      worksheetSections: parsed.sections.length,
      fields: parsed.fields.length,
      equations: parsed.equations.length,
      complianceRequirements: parsed.complianceRequirements.length,
      revertedFields: 0,
      revertedEquations: 0,
    };
    printCounts(counts, parsed.standard.standard_code);
    return;
  }

  console.log('→ BEGIN transaction');
  const counts = await importWorkbook(databaseUrl!, parsed);
  console.log('→ COMMIT');
  printCounts(counts, parsed.standard.standard_code);
  console.log('Verification: all rows marked imported_unverified (default).');
}

function printCounts(counts: ImportCounts, code: string): void {
  console.log(`\n=== Import summary: ${code} ===`);
  console.log(`  Standards:                ${counts.standards}`);
  console.log(`  Worksheet templates:      ${counts.worksheetTemplates}`);
  console.log(`  Worksheet sections:       ${counts.worksheetSections}`);
  console.log(`  Fields:                   ${counts.fields}`);
  console.log(`  Equations:                ${counts.equations}`);
  console.log(`  Compliance requirements:  ${counts.complianceRequirements}`);
  if (counts.revertedFields > 0 || counts.revertedEquations > 0) {
    console.log('');
    console.log(`  Re-import policy: content drifted on already-verified rows`);
    console.log(`    Fields reset to imported_unverified:    ${counts.revertedFields}`);
    console.log(`    Equations reset to imported_unverified: ${counts.revertedEquations}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
