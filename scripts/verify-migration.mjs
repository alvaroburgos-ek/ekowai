#!/usr/bin/env node
// Verify Slice 1 (0002_inbound_leads) is correctly applied.
// Sanity-checks: leads table + RLS + policies + 3 public views + standards count.

import dotenv from 'dotenv'
import postgres from 'postgres'

dotenv.config({ path: '.env.local' })

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 })

try {
  const leadsCols = await sql`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads'
    ORDER BY ordinal_position
  `
  console.log(`leads table: ${leadsCols.length} columns`)
  console.log('  ', leadsCols.map((c) => c.column_name).join(', '))

  const rls = await sql`
    SELECT relrowsecurity FROM pg_class WHERE relname = 'leads' AND relnamespace = 'public'::regnamespace
  `
  console.log(`leads RLS enabled: ${rls[0]?.relrowsecurity}`)

  const policies = await sql`
    SELECT policyname, cmd, roles::text FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leads'
    ORDER BY policyname
  `
  console.log(`leads policies: ${policies.length}`)
  for (const p of policies) console.log(`  - ${p.policyname} (${p.cmd}) for ${p.roles}`)

  const views = await sql`
    SELECT table_name FROM information_schema.views
    WHERE table_schema = 'public' AND table_name LIKE 'public_%'
    ORDER BY table_name
  `
  console.log(`public views: ${views.length}`)
  for (const v of views) console.log(`  - ${v.table_name}`)

  // Sanity counts from the views
  const stats = await sql`
    SELECT
      (SELECT count(*) FROM public_standards) AS standards,
      (SELECT count(*) FROM public_worksheet_templates) AS templates,
      (SELECT count(*) FROM public_worksheet_sections) AS sections
  `
  console.log('public view counts:', stats[0])

  // DWA-only count for the "14+" label
  const dwa = await sql`SELECT count(*) AS n FROM public_standards WHERE code LIKE 'DWA-%'`
  console.log(`DWA standards: ${dwa[0].n}`)

  const all = await sql`SELECT code FROM public_standards ORDER BY code`
  console.log('all codes:', all.map((s) => s.code).join(', '))

  console.log('\n✓ Verification complete')
} catch (err) {
  console.error('✗ Verification failed:', err.message)
  process.exit(1)
} finally {
  await sql.end()
}
