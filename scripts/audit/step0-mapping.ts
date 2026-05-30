import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

loadEnv({ path: '.env.local.bak.1779905676' });

const STANDARD = 'DWA-A-138-1';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    const standard = await sql<{ id: string; code: string; title_de: string | null }[]>`
      SELECT id, code, title_de FROM standards WHERE code = ${STANDARD} LIMIT 1
    `;
    if (standard.length === 0) {
      console.log(`Standard ${STANDARD} not found.`);
      return;
    }
    const stdId = standard[0].id;
    console.log(`Standard: ${standard[0].code} — ${standard[0].title_de ?? ''}`);
    console.log(`Standard id: ${stdId}`);
    console.log();

    const worksheets = await sql<
      {
        id: string;
        code: string;
        title_de: string | null;
        order_index: number | null;
      }[]
    >`
      SELECT id, code, title_de, order_index
      FROM worksheet_templates
      WHERE standard_id = ${stdId}
      ORDER BY order_index NULLS LAST, code
    `;

    console.log(`Worksheets: ${worksheets.length}`);
    console.log();

    for (const ws of worksheets) {
      const [fieldRefs, eqRefs, reqRefs, fieldCount, eqCount, reqCount] =
        await Promise.all([
          sql<{ regulation_reference: string | null; n: number }[]>`
            SELECT regulation_reference, COUNT(*)::int AS n
            FROM fields
            WHERE worksheet_template_id = ${ws.id}
            GROUP BY regulation_reference
            ORDER BY n DESC
          `,
          sql<{ regulation_reference: string | null; n: number }[]>`
            SELECT regulation_reference, COUNT(*)::int AS n
            FROM equations
            WHERE worksheet_template_id = ${ws.id}
            GROUP BY regulation_reference
            ORDER BY n DESC
          `,
          sql<{ regulation_reference: string | null; n: number }[]>`
            SELECT regulation_reference, COUNT(*)::int AS n
            FROM compliance_requirements
            WHERE worksheet_template_id = ${ws.id}
            GROUP BY regulation_reference
            ORDER BY n DESC
          `,
          sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM fields WHERE worksheet_template_id = ${ws.id}`,
          sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM equations WHERE worksheet_template_id = ${ws.id}`,
          sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM compliance_requirements WHERE worksheet_template_id = ${ws.id}`,
        ]);

      const allRefs = new Set<string>();
      for (const r of [...fieldRefs, ...eqRefs, ...reqRefs]) {
        if (r.regulation_reference) allRefs.add(r.regulation_reference);
      }
      const refsSorted = [...allRefs].sort();

      console.log(
        `## ${ws.code} (order ${ws.order_index ?? '-'}) — ${ws.title_de ?? ''}`,
      );
      console.log(
        `  rows: fields=${fieldCount[0].n}  equations=${eqCount[0].n}  reqs=${reqCount[0].n}`,
      );
      console.log(`  §-refs (${refsSorted.length}):`);
      for (const r of refsSorted) console.log(`    - ${r}`);
      const nullFields = fieldRefs.find((r) => r.regulation_reference === null);
      const nullEqs = eqRefs.find((r) => r.regulation_reference === null);
      const nullReqs = reqRefs.find((r) => r.regulation_reference === null);
      if (nullFields || nullEqs || nullReqs) {
        console.log(
          `  ⚠ NULL refs: fields=${nullFields?.n ?? 0}, equations=${nullEqs?.n ?? 0}, reqs=${nullReqs?.n ?? 0}`,
        );
      }
      console.log();
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
