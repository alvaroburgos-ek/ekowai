# Mulde Pilot — Task-11 Acceptance Brief (Task 6)

> **For your review before the browser run.** Protocol: predictions FIRST, discriminating values, nudge-to-dirty on every save, DB decides (not the screen). Project: **PLT-HS-01 Pilot** (`02f93026-…`), prod Supabase `vadsmshzebefjreqcicl`. This is the hard gate before fan-out (Tasks 8–13): any defect class it surfaces is fixed in the shared pattern first.

## Current PLT-HS-01 state (grounded 2026-07-18, read-only)
Currently **flaeche** / method=direct, A_S_m=45. Mulde inputs already present: `h_M=0.30` (A138-17). Inherited scalars: `A_C=4836.43` (A138-07), `A_VA=45` (A138-10), `k_i=7.98e-8` (A138-11), `f_Z=1.2` (A138-08), `r_D_n=5.8` (A138-13, D=1440 governing). `q_S_AC=0.00742` (A138-13, for A_S_m=45). A138-23 recommendation fields exist (empty). The pilot **reconfigures to Mulde**.

## Step 0 — Preview deploy (needs your auth confirm; then I run it, or you `! …`)
The branch `feat/138-phase-4-facility-sizing` (HEAD `7e10a1e`) must run against prod DB. Preview-deploy (target=preview → prod Supabase), exactly as the E1 bring-up did:
```
cp -r /c/Users/Ekowai/projects/ekowai-wizard/.vercel /c/Users/Ekowai/_wt-138-p4/.vercel   # link prj_3UlbRvatPrYOoRTm9adrSjI8jVhB
cd /c/Users/Ekowai/_wt-138-p4 && vercel pull --yes --environment=preview
vercel deploy            # NOT --prod → preview build; capture the build ID + URL
```
**Standing rules (defect-register P2/P3):** test ONLY on the returned URL after a **hard reload**; **close all other PLT-HS-01 tabs** (one-tab rule — a stale tab autosaves and clobbers). Vercel skew routes stale bundles to the old deployment → false failures.

> **DEPLOYED 2026-07-18 (preview, target≠prod — prod aliases UNTOUCHED):**
> - Build ID **`cbcqmcpcs`** · deployment `dpl_Ah3LWiKZFy2tc4cYmABhHjgR5v7i` · READY · from branch tip `450f432` (code-identical to f0264bf; the intervening commit is docs-only).
> - **URL:** `https://ekowai-wizard-preview-cbcqmcpcs-hannesosters-projects.vercel.app`
> - Preview → **prod Supabase** `vadsmshzebefjreqcicl` (PLT-HS-01 lives here). Hard-reload this exact URL, one tab, before trusting the screen.

## Predictions (write-before-browser — DB is the arbiter)
Discriminating design value **h_M = 0.30** (vs the discriminator h_M = 0.25 → A_S_m = 1126.08, a distinct path).

| # | Symbol / field | Worksheet | Predicted | Basis |
|---|---|---|---|---|
| P1 | `A_S_m` | A138-12 | **943.43** (derived) | Gl.16 Dauerstufen sweep, h_M=0.30, D=1440 (B2-established) — the #22 unblock proof |
| P2 | `V_M` | A138-17 | **≈ 283.0 m³** (derived, Gl.14 primary) | at the governing design point V_M = A_S_m·h_M = 943.43·0.30 = 283.03; DB decides exact |
| P3 | `facility_type_dimensioned` | A138-23 | **"mulde"** (derived) | aggregator from facility_type_selected |
| P4 | `facility_specific_volume_m3` | A138-23 | **≈ 283.0** (derived) | facilitySummaryInputs(mulde).volumeSymbol = V_M |
| P5 | `facility_footprint_m2` | A138-23 | **943.43** (derived) | footprintSymbol = A_S_m |
| P6 | `facility_meets_qsac` | A138-23 | **false** | q_S,AC = (k_i·A_S,m·1000)/A_C·10⁴ ≈ 0.16 l/(s·ha) ≪ 2 (PLT-HS-01 is a low-k_i stress fixture) |
| P7 | `facility_specific_dimensioning_complete` | A138-23 | **true** | V_M and A_S_m both present |
| P8 | `recommended_phase_4_gate` | A138-23 | **FAIL** (derived, read-only) | predicate: `!meetsQsac` → FAIL. Honest outcome; proves the FAIL path + measured-value reason |
| P9 | `phase_4_recommendation_reasons` | A138-23 | contains **"q_S,AC = 0.xx l/(s·ha) < 2 … (REQ-15)"** | M1 measured-value reason (exact q_S,AC per whether the save refires the basin recompute — DB decides 0.01 vs 0.16) |
| P10 | `phase_4_gate_result` | A138-23 | **unchanged / engineer-entered** | aggregator must NOT write it (ratified) |

### P1 derivation (checkable) — Gl.16, §6.3.2
`A_S,m = (A_C · 10⁻⁷ · r_D(n)) / ( h_M / (D · 60 · f_Z) + k_i )` at the governing duration **D = 1440 min**, r_D(1440) = **5.8** l/(s·ha).
- Numerator = `A_C · 10⁻⁷ · r_D_n` = 4836.43 · 1e-7 · 5.8 = **2.8051294e-3**
- Denominator = `h_M/(D·60·f_Z) + k_i` = 0.30/(1440·60·1.2) + 7.98e-8 = 0.30/103680 + 7.98e-8 = 2.89352e-6 + 7.98e-8 = **2.97332e-6**
- **A_S,m = 2.8051294e-3 / 2.97332e-6 = 943.43 m²** ✓ (matches the B2 sweep governing value)

Discriminator check (h_M=0.25): denominator = 0.25/103680 + 7.98e-8 = 2.41127e-6 + 7.98e-8 = 2.49107e-6 → A_S,m = 2.8051294e-3/2.49107e-6 = **1126.08 m²** ✓ (shallower mulde ⇒ more area — a sensible, distinct path).

**Note on the FAIL verdict:** PLT-HS-01's tiny k_i makes q_S,AC ≪ 2, so the honest recommendation is FAIL — which is exactly the right proof that the predicate + measured-value reason work. Optional **discriminating verdict-flips** (prove PASS/CONDITIONAL end-to-end) as a second pass — **RIDER (binding): each flip is TEMPORARY, restored, and DB-verified restored before pilot close**: (a) temporarily set `facility_meets_qsac=true` → expect **PASS** (no Tab.14 flags, t_E absent); (b) then set `t_E=92` → expect **CONDITIONAL** + reason "t_E = 92 h > 84 h (Tab.14, §6.3.2)"; restore both, then re-query to confirm they are back (facility_meets_qsac cleared/false, t_E cleared) before proceeding to the baseline restore.

## Input sequence (nudge-to-dirty on EVERY save)
1. **A138-15** → `facility_type_selected` flaeche → **mulde**. Save. (This is a real change → dirties.)
2. **A138-12** → `a_s_m_determination_method` direct → **geometry**. Save. → this ONLY sets the method. **CORRECTION (pilot Finding C, code-verified):** the A138-12 owner save does NOT run the Gl.16 sweep — for method=geometry the owner path (isAsmSave, worksheet.ts:859-861/1000-1004) PASSES THROUGH the currently-persisted A_S_m (45), and the sweep-bearing producer branch is suppressed (asm already in ownerFiredIds, :528). So A_S_m stays 45 here — EXPECTED, not a bug. The sweep fires at step 3.
3. **A138-17** → confirm `h_M=0.30`; **nudge** it (0.30→0.31→save→0.30→save). **This is the sweep's real trigger** — an A138-17 save fires the PRODUCER path (worksheet.ts:1434+, Mulde Gl.16 sweep :1523/1644) because h_M ∈ ASM_INPUT_SYMBOLS and ownerTrigger(asm)=false on A138-17 → producer runs → A_S_m materialises to A138-12. Verify V_M computes on-screen (the #22 unblock) — but DB decides.
4. The A138-23 summary aggregator fires on the facility_type change (input symbol) → populates P3–P9. If A138-23 shows stale, open A138-23 and re-save (nudge) to force the summary producer.
5. (Optional discriminating pass) the two verdict-flips above, each nudge-saved + restored.

Every save: one tab, hard reload, confirm the build-hash/alias before trusting the screen.

## DB-verify queries (run after each step — DB decides)
**After steps 1–3 (the #22 + sweep chain):**
```sql
select wt.code ws, f.symbol, pp.value_number, pp.value_enum, pp.source_type, pp.is_stale, pp.entered_at
from project_parameters pp
join fields f on f.id=pp.field_id
join worksheet_templates wt on wt.id=f.worksheet_template_id
join projects p on p.id=pp.project_id
where p.name ilike 'PLT-HS-01%'
  and f.symbol in ('facility_type_selected','a_s_m_determination_method','h_M','A_S_m','V_M')
order by wt.code, f.symbol;
-- EXPECT: facility_type_selected=mulde (entered, fresh ts); method=geometry;
--         A_S_m=943.43 (derived, is_stale=false, FRESH ts) ← #22 unblock;
--         V_M ≈ 283.0 (derived, fresh ts).
```
**After step 4 (the summary aggregator):**
```sql
select f.symbol, pp.value_number, pp.value_enum, pp.value_text, pp.source_type, pp.is_stale, pp.entered_at
from project_parameters pp
join fields f on f.id=pp.field_id
join worksheet_templates wt on wt.id=f.worksheet_template_id
join projects p on p.id=pp.project_id
where p.name ilike 'PLT-HS-01%' and wt.code='A138-23'
  and f.symbol in ('facility_type_dimensioned','facility_specific_volume_m3','facility_footprint_m2',
                   'facility_meets_qsac','facility_specific_dimensioning_complete','facility_design_completion_date',
                   'recommended_phase_4_gate','phase_4_recommendation_reasons','phase_4_gate_result')
order by f.symbol;
-- EXPECT P3–P9 as tabled; recommended_phase_4_gate=FAIL (derived); reasons contains the q_S,AC measured value;
--        phase_4_gate_result NULL/engineer-entered (NOT written by the aggregator).
```

## Baseline restore (MANDATORY before pilot close) — PLT-HS-01 is the regression reference
PLT-HS-01's **A138-12/13 baseline is the project's regression reference** ([[plt-hs-01-regression-baseline]]): `A_S_m=45` / `a_s_m_determination_method=direct` / `ac_as_ratio=107.47622(→107.48)` / `ac_as_ratio_check=fail` / `ac_as_ratio_limit=50`; A138-13 `V_VA=293.169549312`. The pilot reconfigures away from it, so the pilot ENDS with **one of**:

**(A) DB-verified restore to the reference** — reverse the pilot sequence:
1. A138-12 → `a_s_m_determination_method` geometry → **direct**. Save (nudge). → A_S_m recomputes to 45; Tab.6 re-fires → ac_as_ratio 107.48 / check fail / limit 50.
2. A138-15 → `facility_type_selected` mulde → **flaeche**. Save.
3. A138-13 → **basin re-fire** (defect #17: V_VA only recomputes when its own inputs change) — nudge a basin input (e.g. f_A 1→0.9→save→1→save) to drive V_VA back to **293.169549312** (proven round-trip in the 138 regression, 2026-07-15).
4. DB-verify (query below) all five reference values return, `is_stale=false`, FRESH timestamps:
```sql
select f.symbol, pp.value_number, pp.value_enum, pp.source_type, pp.is_stale, pp.entered_at
from project_parameters pp join fields f on f.id=pp.field_id
join worksheet_templates wt on wt.id=f.worksheet_template_id
join projects p on p.id=pp.project_id
where p.name ilike 'PLT-HS-01%'
  and f.symbol in ('A_S_m','a_s_m_determination_method','ac_as_ratio','ac_as_ratio_check','ac_as_ratio_limit','V_VA')
order by wt.code, f.symbol;
-- EXPECT: A_S_m=45, method=direct, ac_as_ratio=107.47622…, check=fail, limit=50, V_VA=293.169549312 — all fresh.
```

**(B) Explicit new-baseline proposal for your sign-off** — the **A138-23 recommendation fields did not exist pre-pilot**, so a perfect restore is impossible for them. Post-restore-to-flaeche the aggregator recomputes A138-23 for flaeche (footprint=A_S, no volume; the flaeche REQ-31 fail-safe → recommendation ≤ CONDITIONAL + "REQ-31 … noch nicht ausgewertet" reason). This is a NEW additive state on A138-23. I will present the exact post-restore A138-23 values and propose them as the **updated regression baseline** (reference + the new Phase-4 summary/recommendation columns) for your explicit sign-off — I will NOT silently redefine the baseline.

The pilot does not close until either (A) is DB-verified OR (B) is signed off by you.

## Sign-off (pilot GATE)
PASS the pilot when, DB-verified with fresh timestamps: **A_S_m=943.43 materialised on A138-12 AND V_M computed on A138-17** (the #22 chain, live), the six support fields populated correctly, `recommended_phase_4_gate`+reasons persisted as `derived` (and `phase_4_gate_result` untouched). Enumerate any defect class surfaced → fix in the shared pattern before fan-out. Then close-out (Task 7) + your GO to fan out (Tasks 8–13).
