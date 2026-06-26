# VSME → Prod cutover (STAGED — apply only on go)

Everything needed to put VSME on prod Supabase, staged and validated. **No prod
write has happened.** Applying is one command once you give the go.

## Verified prod state (read-only, 2026-06-26)
Already on prod → **not touched** by this cutover: `fields.owner`,
`fields.xbrl_element_id`, `emission_factors` table, `compliance_suggestions`,
`projects.created_by` (so the NOT-NULL backfill is **moot**),
`project_parameters.citation_sources`. Prod has 73 standards; VSME is absent.

Genuinely missing → what this cutover adds:
1. `emission_factors` **read policy** (table exists with RLS on but 0 policies → currently unreadable).
2. `co2_activity_lines` table + org-scoped RLS.
3. VSME standard library (1 standard, 41 worksheets, 41 sections, 143 fields, 2 compliance reqs).
4. 281 UBA emission factors.

The other 73 standards and all shared structure are untouched (additive only).

## Files (apply in this order)
| File | What | Idempotent |
|---|---|---|
| `01-schema.sql` | emission_factors policy + co2_activity_lines table/RLS | yes (`IF NOT EXISTS` / `DROP POLICY IF EXISTS`) |
| `02-seed-vsme.sql` | VSME standard library, generated from the verified local DB | yes (`ON CONFLICT (id) DO NOTHING`; fields land `imported_unverified`, no carried verification audit) |
| `03-seed-emission-factors.sql` | 281 UBA factors | yes (`ON CONFLICT (uba_id,source_version) DO NOTHING`) |
| `99-rollback.sql` | reverse everything this cutover added | safe only before any project adopts VSME |

All four were generated via Postgres `format(%L)` (its own escaping) and
**validated against local** — 01/02/03 re-applied cleanly with zero errors and
no row-count drift (idempotency proven).

## How to apply (on go)
```powershell
$env:SUPABASE_PAT = '<personal-access-token>'   # never commit / echo this
cd scripts/vsme/prod-cutover
./apply-to-prod.ps1            # 01 → 02 → 03, then prints a verify JSON
```
Posts each file to the Supabase Management API
(`POST /v1/projects/vadsmshzebefjreqcicl/database/query`) as role `postgres`
(bypasses RLS for the seed). Expected verify: `vsme_present=true, templates=41,
fields=143, emission_factors=281, co2_table=true, ef_policies=1`.

Rollback: `./apply-to-prod.ps1 -Rollback`.

## After the DB cutover (separate steps, separate go)
1. `git push -u origin feat/vsme-seeders` → Vercel **preview** URL (smoke-test).
2. Merge `feat/vsme-seeders` → `main` (commit as Alvaro).
3. `vercel --prod` from a clean `main`, then re-point the custom alias
   (`vercel alias set <deployment> <alias>`).
4. Post-deploy: log in, add VSME to a project, input a value + save, add a CO₂
   line + recompute, export xlsx/pdf. See the runbook §3 Step 5.

Full context: `docs/superpowers/plans/2026-06-26-vsme-prod-cutover-runbook.md`.
