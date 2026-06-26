# VSME → Prod / Vercel Cutover Runbook

> **Status: STAGED & VALIDATED — no prod write has happened.** The DB cutover is
> packaged in `scripts/vsme/prod-cutover/` (01-schema, 02-seed-vsme,
> 03-seed-emission-factors, 99-rollback + `apply-to-prod.ps1` + README), all
> generated via Postgres `format(%L)` and re-applied cleanly to local (idempotent,
> zero drift). Prod state was verified read-only (see below). Applying to prod is
> one command **on your go**; push/merge/deploy held for your go.
> Target prod Supabase: project `vadsmshzebefjreqcicl`. Target Vercel: project `ekowai-wizard-preview` (no auto-deploy on merge). Source: branch `feat/vsme-seeders` in worktree `_wt-vsme` (Plans 1–5 complete, 0 datapoint values).

> **Verified prod state (read-only, 2026-06-26):** already present → `fields.owner`,
> `fields.xbrl_element_id`, `emission_factors` table, `compliance_suggestions`,
> `projects.created_by` (**NOT-NULL backfill moot**), `project_parameters.citation_sources`.
> Missing → `co2_activity_lines` table; `emission_factors` read policy (table has RLS
> on, 0 policies); the VSME standard (prod has 73 standards, VSME absent).
> So the cutover reduces to: **1 policy + 1 table + seed VSME + 281 factors.**

## 0. Why VSME isn't on Vercel today
- `feat/vsme-seeders` has **no upstream** — never pushed.
- `origin/main` HEAD (`805686d`) is **138** work — contains zero VSME code.
- Vercel only deploys `main`, and only on a **manual** `vercel --prod` — neither happened.
- Prod Supabase has **no VSME standard** seeded — so even with code live, the picker would be empty (`isVsmeReport` = false).

Everything works locally (all six tabs + worksheet input + export verified). Making it appear on Vercel = the four steps in §3, after clearing the blockers in §2.

---

## 1. Hard preconditions
- [ ] **PITR / backup confirmed on prod** (you confirmed once already on 2026-06-25 — reconfirm it's still current immediately before §3).
- [ ] **Decisions in §4 made** (auth hardening, GHG remap, official-template deferral re-flag).

VSME is independent of any other workstream: its tables (`emission_factors`, `co2_activity_lines`) and columns are additive and isolated. The only cross-branch detail is a duplicate migration **version number** — a rename, see §2-A.

---

## 2. Blockers to resolve BEFORE any prod step

### A. 🟠 Duplicate migration version number (rename before merge)
`main` already has a migration stamped `20260625170000`, and the VSME branch independently used the same stamp for `20260625170000_co2_activity_lines.sql`. Two files with the same version in one `supabase/migrations/` tree = ambiguous ordering / one silently treated as already-applied. **Fix:** rename the VSME file to a free version (e.g. `20260626120000_co2_activity_lines.sql`) on `feat/vsme-seeders` before merge. Content-identical — only the filename/version changes. (This is plain merge hygiene, not a dependency on the other workstream.)

### B. 🔴 `created_by NOT NULL` on populated prod (will fail as written)
`20260625180000_reconcile_citation_sources_created_by.sql` runs:
```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by uuid NOT NULL REFERENCES profiles(id);
```
On a **populated** prod `projects` table this **errors** — `ADD COLUMN ... NOT NULL` with no default can't fill existing rows. (`citation_sources` is fine — it has `DEFAULT '[]'`.)
**Prod-safe replacement** (run instead of the raw migration, only if prod lacks the column):
```sql
-- 1. add nullable
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);
-- 2. backfill existing rows to a real profile (decide the owner: e.g. each
--    project's org owner, or a single platform account). EXAMPLE — org owner:
UPDATE projects p SET created_by = (
  SELECT om.user_id FROM org_members om
  WHERE om.org_id = p.org_id ORDER BY om.joined_at LIMIT 1
) WHERE p.created_by IS NULL;
-- 3. enforce once no nulls remain
ALTER TABLE projects ALTER COLUMN created_by SET NOT NULL;
```
First **verify** whether prod already has `projects.created_by` (the local prod-mirror did). If it's already present + populated, this whole block is a no-op — confirm before running.

### C. 🟠 Pre-prod auth hardening (code, flagged in Plan-4 final review)
- `setFieldOwner` (owner badge) has **no auth check** and writes `fields.owner` **globally** (template-level, all orgs). Acceptable locally; on multi-tenant prod it lets any signed-in user reclassify owners platform-wide. **Decide:** add an allowlist/role gate before prod, or accept the risk for a single-tenant launch.
- `co2-lines` actions authenticate the user but don't scope to **org membership** of the target project. Add the same `projects ⋈ org_members` guard the other VSME queries use, before prod.

### D. 🟠 Plan-2 GHG-fields C03→B03 remap (deferred)
`recomputeB3Co2` writes its 3 output symbols into worksheet `VSME-C03.000`; spec intent is the B-module. Decide whether to remap before prod or ship as-is (cosmetic placement, not a calc error).

### E. 🟢 Releasable `main` (normal hygiene, not a dependency)
`vercel --prod` ships **all of `main`**, not just VSME — so merge VSME into a `main` that is itself in a releasable state (tests green, no half-finished work mid-merge). This is standard release hygiene that applies to any feature; it is not a VSME-specific coupling.

---

## 3. Cutover steps (each is a separate go/no-go)

### Step 1 — Prod schema migrations (additive)
Apply, in order, to prod `vadsmshzebefjreqcicl` (after §2-A renumber, §2-B substitution):
1. `…152000_vsme_fields_columns.sql` — `fields.owner` + `fields.xbrl_element_id`. *(May already be on prod from the earlier Plan-1 additive apply — `IF NOT EXISTS`, idempotent; verify.)*
2. `…160000_vsme_emission_factors.sql` — `emission_factors` table.
3. `…161000_vsme_emission_factors_rls.sql` — its RLS policy.
4. `…(renumbered)_co2_activity_lines.sql` — table + org-scoped RLS (mirrors `project_parameters`).
5. `…180000_reconcile…` — **use the §2-B prod-safe version**, not the raw file.

**How to apply** (two paths, pick per what you have):
- **DATABASE_URL path:** prod Transaction-Pooler string in `.env.local`, `prepare:false`. Apply each file via `psql`/a one-off runner.
- **MCP path (no DB password):** POST each `.sql` to `https://api.supabase.com/v1/projects/vadsmshzebefjreqcicl/database/query` with the PAT (same mechanism as the Pass3c MCP push in CLAUDE.md).

**Verify:** `\d co2_activity_lines`, `\d emission_factors`, RLS policies present, `fields` has `owner`/`xbrl_element_id`, `projects.created_by` NOT NULL.

### Step 2 — Prod data seed (VSME standard + emission factors)
⚠️ `scripts/vsme/seed-vsme.ts` **hard-refuses** any non-local `DATABASE_URL` (throws unless `127.0.0.1`/`localhost`). That guard is deliberate. To seed prod, **do not** weaken the guard in place; instead either:
- (preferred) generate the workbook + factor rows locally (`buildVsmeWorkbook`, `import-uba-factors` parse step), then push the resulting UPSERTs to prod via the **MCP/Management-API** path (file→API, same as Pass3c), or
- add an explicit, reviewed `seed-vsme-prod.ts` entry that takes the prod URL via an unmistakable flag and is used once.

Seeds: 1 standard `VSME`, its worksheet_templates/sections/fields (owner + xbrl carried), enum_values, equations, compliance_requirements, **281 UBA emission_factors**. All UPSERT/idempotent; `verification_status` never overwritten (fields land `imported_unverified`).

**Verify (prod COUNTs vs local):** standards=1(VSME), templates=41, fields≈(local count), emission_factors=281.

### Step 3 — Merge code to main
After the §2-A rename:
- `git push -u origin feat/vsme-seeders` (gets a **Vercel preview URL** — good smoke-test before prod).
- Open PR → merge to `main` (or fast-forward per your convention). Commit as **Alvaro `<alvaro.burgos@ekowai.com>`**.

### Step 4 — Vercel prod deploy + alias
Per your deploy setup (no auto-deploy on merge):
- From a clean checkout of `main`: `vercel --prod` (project `ekowai-wizard-preview`).
- **Re-point your custom alias:** `vercel alias set <new-deployment-url> <your -hannesoster- alias>` — required after **every** prod deploy or your bookmark serves the old build.
- Ensure prod env has **NO** `DEV_AUTOLOGIN_EMAIL` / `BYPASS_AUTH` (env.ts hard-throws if `DEV_AUTOLOGIN_EMAIL` is set with `VERCEL_ENV=production` — good, but confirm they're absent).

### Step 5 — Post-deploy verification on prod
- [ ] Log in (real magic-link, not dev-login).
- [ ] Create a project, add the **VSME** standard → six tabs appear (Worklist + Emissions present).
- [ ] Open a VSME worksheet, **input one value, save, reload** → persists.
- [ ] Emissions: add one CO₂ line, recompute → totals persist (C1).
- [ ] Export `?format=xlsx` and `?format=pdf` → both download.
- [ ] Owner badge + worklist render; RLS: a second org cannot see the project.

---

## 4. Decisions
1. ✅ **Auth hardening (§2-C):** owner stays **global**; **ship as-is** for now (single-tenant launch). `setFieldOwner` global + co2-lines org-scoping = accepted risk, revisit before multi-tenant.
2. ✅ **GHG remap (§2-D):** **ship as-is** (output stays on `VSME-C03.000`). Cosmetic placement, revisit later.
3. ⬜ **`created_by` backfill (§2-B):** which owner to backfill existing prod projects to — per-project org owner (example given) or one platform account? (Only matters if prod lacks the column.)
4. ⬜ **Seed path (§2):** MCP/Management-API push (preferred, no guard change) vs. a one-off reviewed `seed-vsme-prod.ts`?

## 5. Rollback (per step)
- **Schema:** each new object is additive — `DROP TABLE co2_activity_lines; DROP TABLE emission_factors;` and `ALTER TABLE fields DROP COLUMN owner, DROP COLUMN xbrl_element_id;` reverse it. `created_by`/`citation_sources` adds are kept (harmless) or dropped if they were net-new. Author the exact reverse SQL **before** Step 1, like the 138 track did.
- **Data:** VSME standard removal = delete the `standards` row where `code='VSME'` (cascades to templates/fields/etc.); emission_factors truncate. Only safe while no project references VSME — do it before any prod project adopts it.
- **Code/deploy:** Vercel **instant rollback** to the prior production deployment, then re-point the alias to it. Revert the merge commit on `main` if needed.

---

### Appendix — artifact inventory
- Migrations: `supabase/migrations/20260625{152000,160000,161000,170000,180000}_*.sql` (170000 to be renumbered).
- Seeders: `scripts/vsme/{seed-vsme,build-workbook,import-uba-factors,taxonomy,modules,enums}.ts`.
- App code: six-tab branch (`project-tabs.tsx`), `(overview)/vsme/{worklist,emissions}`, `src/lib/{co2,export,actions}/*`, export route `api/projects/[id]/vsme/export`.
- Held-prod items mirror the SDD ledger (`.superpowers/sdd/progress.md`): co2_activity_lines migration, reconcile-drift migration, emission_factors RLS, GHG C03→B03 remap, setFieldOwner/co2-lines auth.
