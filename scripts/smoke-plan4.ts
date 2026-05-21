import postgres from 'postgres';

const DB_URL = process.env.DATABASE_URL ?? '';
if (!DB_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(DB_URL, { prepare: false });

async function main() {
  const projectId = '02f93026-fb20-4463-abd6-540befc049a9';

  const rows = await sql<{ id: string; code: string }[]>`
    SELECT wi.id, wt.code
    FROM worksheet_instances wi
    JOIN worksheet_templates wt ON wt.id = wi.worksheet_template_id
    WHERE wi.project_id = ${projectId} AND wi.status = 'draft'
    LIMIT 1
  `;

  const inst = rows[0];
  if (!inst) {
    console.log('No draft worksheets — try a different project');
    process.exit(1);
  }
  console.log('Testing transitions on', inst.code, '(', inst.id, ')');

  const users = await sql<{ id: string }[]>`
    SELECT id FROM auth.users WHERE email = 'leadership@ekowai.com' LIMIT 1
  `;
  const user = users[0];
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }
  console.log('Actor user id:', user.id);

  await sql.begin(async (tx) => {
    await tx`UPDATE worksheet_instances SET status = 'submitted_for_review' WHERE id = ${inst.id}`;
    await tx`
      INSERT INTO approval_events (worksheet_instance_id, event_type, from_status, to_status, actor_id, actor_role, comment)
      VALUES (${inst.id}, 'submit', 'draft', 'submitted_for_review', ${user.id}, 'engineer', 'Smoke test submit')
    `;
    await tx`
      INSERT INTO audit_log (actor_id, actor_role, project_id, table_name, record_id, action, changes)
      VALUES (${user.id}, 'engineer', ${projectId}, 'worksheet_instances', ${inst.id}, 'transition',
        ${JSON.stringify({ from: 'draft', to: 'submitted_for_review', eventType: 'submit', comment: 'Smoke test submit' })}::jsonb)
    `;
  });
  console.log('Transitioned to submitted_for_review');

  const [check] = await sql<{ status: string }[]>`
    SELECT status FROM worksheet_instances WHERE id = ${inst.id}
  `;
  console.log('Current status:', check.status);

  const events = await sql`
    SELECT event_type, from_status, to_status, comment
    FROM approval_events
    WHERE worksheet_instance_id = ${inst.id}
    ORDER BY occurred_at DESC
    LIMIT 5
  `;
  console.log('approval_events:', JSON.stringify(events, null, 2));

  // Reset to draft for clean re-runs
  await sql`UPDATE worksheet_instances SET status = 'draft' WHERE id = ${inst.id}`;
  console.log('Reset to draft for clean re-run');
}

main()
  .then(() => { console.log('SMOKE PASS'); })
  .catch((err) => { console.error('SMOKE FAIL', err); process.exit(1); })
  .finally(() => sql.end());
