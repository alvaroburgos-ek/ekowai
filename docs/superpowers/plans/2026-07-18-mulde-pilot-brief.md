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
**Standing rules (defect-register P2/P3):** test ONLY on the returned alias URL after a **hard reload**; **close all other PLT-HS-01 tabs** (one-tab rule — a stale tab autosaves and clobbers). Vercel skew routes stale bundles to the old deployment → false failures. → **build ID + URL: [fill after deploy]**.

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

**Note on the FAIL verdict:** PLT-HS-01's tiny k_i makes q_S,AC ≪ 2, so the honest recommendation is FAIL — which is exactly the right proof that the predicate + measured-value reason work. Optional **discriminating verdict-flips** (prove PASS/CONDITIONAL end-to-end) as a second pass: (a) temporarily set `facility_meets_qsac=true` → expect **PASS** (no Tab.14 flags, t_E absent); (b) then set `t_E=92` → expect **CONDITIONAL** + reason "t_E = 92 h > 84 h (Tab.14, §6.3.2)"; restore after.

## Input sequence (nudge-to-dirty on EVERY save)
1. **A138-15** → `facility_type_selected` flaeche → **mulde**. Save. (This is a real change → dirties.)
2. **A138-12** → `a_s_m_determination_method` direct → **geometry**. Save. → triggers the `asm` geometry sweep → materialises A_S_m@A138-12.
3. **A138-17** → confirm `h_M=0.30`; **nudge** it (0.30→0.31→save→0.30→save) to force the producer-fire if step 2 didn't already. Verify V_M computes on-screen (the #22 unblock) — but DB decides.
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

## Sign-off (pilot GATE)
PASS the pilot when, DB-verified with fresh timestamps: **A_S_m=943.43 materialised on A138-12 AND V_M computed on A138-17** (the #22 chain, live), the six support fields populated correctly, `recommended_phase_4_gate`+reasons persisted as `derived` (and `phase_4_gate_result` untouched). Enumerate any defect class surfaced → fix in the shared pattern before fan-out. Then close-out (Task 7) + your GO to fan out (Tasks 8–13).
