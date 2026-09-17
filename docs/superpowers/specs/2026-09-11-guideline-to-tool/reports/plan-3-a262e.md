# Plan 3 — DWA-A-262E (`a262e`) — Task 3 report

- **Status:** DONE_WITH_CONCERNS (every concern is a sign-off block; nothing blocks Task 4)
- **Model / effort:** Claude Opus 5 (`claude-opus-5[1m]`), effort as dispatched · **CLI:** claude 2.1.260 (no update taken — user declines updates) · **Date:** 2026-09-17
- **Branch:** `feat/guideline-to-tool`, worktree `C:\Users\Ekowai\_wt-g2t`, base `f2af4fa`
- **Nothing applied to prod.** No `apply-migration`, `drizzle-kit`, `vercel`, or DB write. Prod was read ONLY by `node scripts/regulation-tables/build-prior-snapshot.mjs DWA-A-262E a262e` (read-only tx) and `node scripts/verification/prod-query.mjs --sql "<SELECT …>"` (worksheet titles, section titles of three worksheets, the 18 equation rows, the 60 compliance rows, `standards.version`, units/descriptions of the candidate output fields, the five equation ids quoted in the STAGED file). `.env.local` never printed; confirmed gitignored (`git check-ignore .env.local`).
- **SR-1 source:** every seeded value and every cue was read in this session from `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-262E\DWA-A_262E (2).md` (English edition, 2217 lines, LaTeX tables); the inventory was used for pointers only. Its pointers were correct; the plan's premise that Table 21's aerated-gravel row is truncated was NOT (see §8).

## 1. Counts table

| slug | tables | rows lifted | rows unreadable | registers | select_one | select_many | lookup_fill | field visible_when | section visible_when | equations new | equations staged | sign-off entries | tokens in | minutes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `a262e` | 10 | 69 (69/69 verbatim) | 0 skipped; 2 tables kept `imported_unverified` for a suspect cell (TABLE_LIMITS U-2 Tab. 13 "≤ 4"; TABLE18_ORIFICE U-3 lava "≤ 25-<5**"); Table 19 not seeded (U-1, images) | 4 (all `create`) | 4 (all `create`) | 0 | 8 (7 `create` + 1 UPDATE `B_CSB_Grauwasser`) | 3 (UPDATE, A262-05) | 127 (16 worksheets) | 14 | 3 not emitted (F-2 unit, F-7, F-8) + 3 rulings (R-1 Gl. 6/8, R-2 Gl. 11, R-3 Gl. 13/14) + 10 gates (G-1…G-10) | 39 (+5 observations) | ≈ 0.58 M (tool-marker delta 15.00 M → 14.42 M at report time) | ≈ 60 |

Field entries: 28 = 24 `create` (entlastung_typ, ueberlaufbauwerke, Q_Dr_RUB_sum, Q_Dr_RU_sum, Q_krit_sum, B_CSB_tab1, B_BSB5_tab1, B_TKN_tab1, V_VB_min, ablaufproben, csb_last5_ok, bsb5_last5_ok, filterstufen, A_Fo_gesamt, filterstufen_area_fail, rieselrohre, L_Rieselr_sum, rieselrohr_max_len, grauwasser_quelle, hf_material, f_A_ANF_CSB_max, polishing_temp_band, q_F_T_polishing_max, t_Sicker_polishing_min) + 4 UPDATE (m_multiplier / q_R_Tr / Q_R_Tr visible_when; B_CSB_Grauwasser lookup_fill). Derived-output fields (`widget='derived'`): 9.

## 2. Raw test output

`pnpm test` (after all changes):
```
 Test Files  253 passed | 1 skipped (254)
      Tests  2447 passed | 1 expected fail | 1 skipped (2449)
   Start at  18:25:29
   Duration  46.53s (transform 11.56s, setup 49.70s, import 95.85s, tests 39.26s, environment 201.46s)
```
(2420 at `f2af4fa` → 2447 = +27: seed-a262e 10, field-configs-a262e 6, equations-a262e 8, register-a262e-filterstufen 3; the shared `regulation-tables-seed-index` / `generated-sql-freshness` pins iterate the new slug.)

`pnpm -s typecheck` → exit 0 (`TYPECHECK exit=0`). `pnpm -s eslint <10 touched .ts/.tsx files>` → exit 0, no output.

`pnpm vitest run --project integration tests/harness/a262e-verify.integration.test.ts` (embedded PG; run after the commit set — no engine change on this task):
```
 Test Files  1 passed (1)
      Tests  59 passed (59)
   Start at  18:26:21
   Duration  6.48s (transform 516ms, setup 0ms, import 4.04s, tests 2.25s, environment 0ms)
```
The harness seeds prod's 18 equations / 52 block gates; the new rows are not in it by construction — it proves the branch still enforces every A262E block gate both ways.

**TDD evidence.** Seed test written first → RED (`Failed to resolve import "../regulation-tables-seed-a262e"`, "Test Files 1 failed, no tests"); builder written; the `SEED_BUILDERS` line first missed (a `python3` patch attempt found no python on the box → 3 tests RED: `expected undefined to be 4` on the TABLE_LIMITS lookup; registered via Edit) → 10/10 GREEN; verifier 69/69 on the first run (quote spans were extracted mechanically from the transcript by line range, never retyped). Field-config test: RED on my miscount (30/26 vs the actual 28/24 entries) and on the missing migration file; emitter accepted all 28 + 127 on the first run; 6/6 GREEN. Equations test: RED on my wrong assumption that a hidden row cell is nulled by `prepareRegisterRows` (it is kept; the contract nulls it on the next editor write — `register-rows.ts` read) → pins re-targeted, 8/8 GREEN; every computed pin (23 m² Σ, 1 undersized, 100/70/40 l/s, 4-of-5 counts, 45/18 m, 16, 320, 2, 240, 4.8) held on the first run. Render test: RED on the `footerStates` fixture shape (`{label, unit, state}`) → 3/3 GREEN. The whole-suite run then caught one drift: the field-config migration had been emitted BEFORE a sign-off-id edit in a description string → re-emitted, pin green.

## 3. Transcript verification

`pnpm -s tsx scripts/regulation-tables/verify-regulation-tables.ts a262e "C:\Users\Ekowai\Desktop\Guidelines\DWA-A-262E\DWA-A_262E (2).md"` → **`69/69 quotes verbatim`**, exit 0. PASS list (table · rows · span):

- TABLE1_CSB (5), TABLE1_BSB5 (5), TABLE1_TKN (5): the printed parameter row of Tab. 1 (L618 / L617 / L620) as the quote of each pretreatment row
- TABLE2_CSB (2): L678
- S4_2_VORBEHANDLUNG (5): L700, L705, L709, L721, L777 (one sentence each)
- TABLE_LIMITS (26): the printed table body per row — Tab. 3 L749–L755 (4 rows), Tab. 4 L804–L805, Tab. 5 L819–L821, Tab. 6 L836–L840, Tab. 7 L856–L857, Tab. 8 L873–L879, Tab. 9 L899–L916 (one contiguous span over the two printed parts), Tab. 10 L936–L942, Tab. 11 L968–L973, Tab. 12 L994–L997, Tab. 13 L1017–L1020, Tab. 14 L1046–L1053 (two rows each)
- TABLE15 (2): L1134–L1141 · TABLE16 (2): L1158–L1160 · TABLE18_ORIFICE (7): L1244
- TABLE21 (10): L1450, L1451, L1452–L1470, L1471, L1472, L1473, L1474–L1492, L1493, L1494, L1495

Status per table: `md_verified` — TABLE1_CSB, TABLE1_BSB5, TABLE1_TKN, TABLE2_CSB, S4_2_VORBEHANDLUNG, TABLE15, TABLE16, TABLE21 (every seeded row lifted, every cell legible; deliberately unseeded printed cells are E-2 / J-2 items, the a138 TAB6/TAB7 precedent). `imported_unverified` — TABLE_LIMITS (U-2: Tab. 13 prints "≤ 4" for t_Sicker,min,aM where every other table prints "≥"), TABLE18_ORIFICE (U-3: lava cell "≤ 25-<5**").

## 4. Prior capture / emit commands (re-executable)

```
node scripts/regulation-tables/build-prior-snapshot.mjs DWA-A-262E a262e
  → wrote src\lib\eval\field-configs\a262e.prior.json: 215 field rows (19 orphan), 297 coded sections of 297;
    optional columns present: {"fields":{"widget":false,"ui_config":false,"lookup":false,"visible_when":false},"worksheet_sections":{"visible_when":false}}
pnpm -s tsx scripts/regulation-tables/emit-seed-sql.ts a262e
  → wrote seed + rollback for a262e -> scripts/migrations/20260917100300_regulation_tables_seed_a262e.sql scripts/rollback-20260917100300-regulation-tables-seed-a262e.sql
pnpm -s tsx scripts/regulation-tables/emit-field-configs-sql.ts a262e 20260917100310
  → wrote 28 field entries + 127 section entries for a262e -> scripts/migrations/20260917100310_field_configs_a262e.sql scripts/rollback-20260917100310-field-configs-a262e.sql
pnpm -s tsx scripts/regulation-tables/emit-equations-sql.ts a262e 20260917100320
  → wrote 14 equations for a262e -> scripts/migrations/20260917100320_equations_a262e.sql scripts/rollback-20260917100320-equations-a262e.sql
```
All three migrations are byte-pinned against a fresh emit (`generated-sql-freshness.test.ts` auto-pins the seed via `SEED_BUILDERS`; `field-configs-a262e.test.ts` / `equations-a262e.test.ts` pin the other two against the committed `a262e.prior.json`). The seed migration carries 69 row upserts (`ON CONFLICT (table_id, row_key)`) and 8 `verification_status` upgrades (`imported_unverified → md_verified`, never the reverse); its rollback deletes the ten tables (no earlier DWA-A-262E seed to re-emit). The field-config rollback restores the four UPDATE rows to the captured NULLs and deletes only the 24 `Plan 3:` rows; the equations rollback deletes the 14 `Plan 3:` rows. Apply order (owner, after the schema migration): `20260917100300` → `20260917100310` → `20260917100320`; rollback in reverse. Every file touches `DWA-A-262E` rows only.

## 5. What was encoded

**Tables (10)** — `src/lib/eval/regulation-tables-seed-a262e.ts`, builder `a262eSeedTables()`, edition `'2017-11'` (title page L7 "November 2017" = prod `standards.version`):

| table | keys | values | policy (cue) | rows | status |
|---|---|---|---|---|---|
| TABLE1_CSB / _BSB5 / _TKN | pretreatment (= prod `pretreatment_selected` tokens; rotting_tank unmapped E-2) | load_g_pd [g/(P·d)], note ("(>12 °C)" on the TKN raw-filter cell) | messwert (L573 "… given in Table 1 must be used") | 5 each | md_verified |
| TABLE2_CSB | source (median / average, L676) | load_g_pd | anhaltswert (L670 "informative") | 2 | md_verified |
| S4_2_VORBEHANDLUNG | pretreatment | v_min_l_p, v_min_l, hrt_min_h, a_spez_min_m2_p, note (nullable) | locked (L700 "must be at least") | 5 (300/3000 · 200 · 1.5 m²/P · 75 + 2 h · 1200) | md_verified |
| TABLE_LIMITS | filter_type × system_size × sewer (tr / m) | 25 nullable columns (area_ref, a_spez_min, a_min_m2, a_spez_1/2_min, f_a_f_csb_max, …_betrieb_max, f_a_f01_csb_max, q_f_t_max, q_f_betrieb_max, q_beschickung_min, h_beschickung_min/max/min_tight, t_sicker_min/max, f_v_csb_max, f_a_anf_csb_max, l_hf_min, l_rieselr_min_m_p, l_rieselr_each_max, b_rieselr_min, b_fgr_min, a_awf_spez_min, q_awf_max) | locked (L742 — L1147, P-1) | 26 = (7 small + 6 municipal) × {tr, m} | imported_unverified (U-2) |
| TABLE15 | temp_band (lt12 / ge12) | f_a_f_csb_max 20, betrieb 27, q_f_t_max 80/120, t_sicker_min 6/3, q_beschickung_min 6, h_beschickung_min 20 | locked + L1147 footnote (P-1) | 2 | md_verified |
| TABLE16 | material (coarse_sand / gravel) | f_a_anf_csb_max 40/200, f_a_fu_csb_max 16 | locked (L1151) | 2 | md_verified |
| TABLE18_ORIFICE | filter_type × stage_role | orifice_area_max, orifice_area_better, orifice_printed | locked (L1189) | 7 | imported_unverified (U-3) |
| TABLE21 | filter_type × material (printed designation) | section, sieve_mm, symbol_din, designation, fines_printed, fines_max_pct, u_printed, u_max, d10_printed, d10_min, d10_max, k_fa_optimal, k_fa_calc | anhaltswert (L1426 — L1423) | 10 (all printed rows) | md_verified |

Not seeded: Table 19 (images, U-1), the Tab. 17/18 summary-only cells (J-2), Table 20 (soil types — no consumer), Tables 22–24 (maintenance — outside the brief).

**Registers / selections / lookup_fills / visibility** — `src/lib/eval/field-configs/a262e.ts`:
- `filterstufen` (A262-10 B, create json, placement section): the brief's columns — label, stage_role (primary/main/polishing), filter_type (9 prod tokens, `discriminator`), system_size, sewer (prod tokens), `sewer_key` badge (`if(sewer == 'combined_sewer', 'm', 'tr')`), cells, area_m2, seven `// G-1` three-key `lookup('TABLE_LIMITS', filter_type, system_size, sewer_key, …)` derived columns (a_spez_min, a_abs_min_m2, f_a_f_csb_max, q_f_t_max, q_beschickung_min, h_beschickung_min, t_sicker_min), `a_min_m2 = a_spez_min * EZ` (worksheet scope, G-13 closed), `area_ok` badge, inputs f_a_f_csb / q_f_t / q_beschickung / h_beschickung, and the discriminator-driven inputs t_sicker_h (municipal), l_rieselr_m (trench), a_awf_m2 (lava AND combined); footer `A_Fo_gesamt`, `filterstufen_area_fail`; note L793.
- `ueberlaufbauwerke` (A262-06 B): label, type (rueb/rue, discriminator), q_dr, q_krit (`type == 'rue'`); footer the three Σ. `entlastung_typ` (A262-06 B, create enum) select_one — the Gl. 6/8 driver (R-1).
- `ablaufproben` (A262-08 C): date (required), csb (required), bsb5, nh4_n, temperature_c; footer `csb_last5_ok`, `bsb5_last5_ok`; note on entry order.
- `rieselrohre` (A262-15 C): label, length_m (required), width_m; footer `L_Rieselr_sum`, `rieselrohr_max_len`.
- lookup_fills: `B_CSB_tab1` / `B_BSB5_tab1` / `B_TKN_tab1` (A262-07 D, role value, TABLE1_*) and `V_VB_min` (A262-07 C, role limit, S4_2_VORBEHANDLUNG) keyed on `pretreatment_selected`; `B_CSB_Grauwasser` (A262-26, UPDATE, role value, TABLE2_CSB keyed on the created `grauwasser_quelle`); `f_A_ANF_CSB_max` (A262-27, role limit, TABLE16 keyed on the created `hf_material`); `q_F_T_polishing_max` / `t_Sicker_polishing_min` (A262-27, role limit, TABLE15 keyed on the created `polishing_temp_band`).
- Field `visible_when`: A262-05 `m_multiplier`, `q_R_Tr`, `Q_R_Tr` ← `sewer_system_type == 'separate_sewer'` (L579). Section `visible_when` (127): A262-05 (6 sections) ← separate; A262-06 (7) ← combined; A262-11…-16 (9/8/9/8/8/8) ← `system_size_category == 'small_wwts' AND filter_type == '<type>'`; A262-19…-23 (7/8/9/9/8) ← `municipal_wwtp AND filter_type == '<type>'`; A262-25 (6) ← seasonal; A262-26 (9) ← greywater_only; A262-28 (8) ← enhanced_NP. Refused by the producer guard and STAGED: 17 producer sections (C-1), the whole A262-29 lining block (C-4).

**Equations (14 new)** — `src/lib/eval/equations/a262e.ts`: `A262-10-D1 A_Fo_gesamt = sum_rows(filterstufen, if(stage_role == 'main', area_m2, 0))` · `A262-10-D2 filterstufen_area_fail = count_rows(filterstufen, stage_role == 'main' AND area_ok == 0)` · `A262-06-D1/D2/D3` Σ Q_Dr,RÜB / Σ Q_Dr,RÜ / Σ Q_krit by `type` · `A262-08-D1 csb_last5_ok = count_rows(last_rows(ablaufproben, 5), csb <= 150)` · `A262-08-D2` (bsb5 ≤ 40) · `A262-15-D1 L_Rieselr_sum = sum_rows(rieselrohre, length_m)` · `A262-15-D2 rieselrohr_max_len = max_rows(…)` · `A262-11-D1 A_Fo_min_VFS_KA = EZ * A_Fo_spez_VFS_KA` · `A262-26-D1 Q_GW_taeglich = EW_Grauwasser * Q_Grauwasser` · `A262-26-D2 A_Fo_spez_GW = 0.5 * A_Fo_spez` · `A262-21-D1 A_F_CSB_VFG_KomKA = B_CSB_KomKA * 1000 / f_A_F_CSB_VFG_KomKA` · `A262-24-D1 B_CSB_KomKA = EZ * B_CSB / 1000`. None outputs a symbol the 18 prod equations produce (pinned). The last five output EXISTING consumer-free manual fields whose prod description prints the rule (F-1, F-3…F-6); three of them wait for consumer edits (C-6). Pinned values (unit test through `evaluateFormula` + `prepareRegisterRows` on the TS fallback tables): Σ main areas 23 m² (raw primary and HF polishing rows excluded), 1 undersized main stage (Tab. 12 M: 3 m² < 1 · 4), 100 / 70 / 40 l/s, 4 and 4 of the last five samples (a missing BSB5 ⇒ undecidable, never a silent count), 45 / 18 m, 16, 320, 2, 240, 4.8; missing EZ ⇒ D2 `manual_required`, D1 still 23.

## 6. Inventory §5 top-wins walk

1. One repeatable "Filterstufe" row with Tab. 3–16 limits and A_min = EZ·A_spez → **partially**: the register is built (four keys, seven table-driven limits, `a_min_m2`, per-row badges, Σ / count outputs) and the 13 worksheets stay (the collapse is Phase 6, a262e-E-1 token map); `a_min_m2` computes once EZ reaches A262-10 (C-2).
2. `pretreatment_selected` → Tab. 1 loads with `datenquelle_abwasser` override + the §4.2 volume floors → **encoded**: `B_*_tab1` (messwert policy, override reason via the audit log) and `V_VB_min` on A262-07; the A262-09 re-point (E-3/C-3) and the volume gate (G-1) are STAGED.
3. Inherit EZ / w_s_d / Q_S_d_aM / Q_T_d_aM and register the seven described-but-missing equations → **partially**: 5 of the 7 registered (A262-11-D1, -26-D1, -26-D2, -21-D1, -24-D1), 2 STAGED (aufenthaltszeit F-2 unit; V_F F-7; A_F_VFKS_total F-8 — the brief's "seven" counted differently), inheritance = X-1 + C-6 STAGED.
4. Sewer-type gating (A262-05 vs -06, Tr vs M column, overflow filter only for combined) → **encoded**: section rules on -05/-06, three field rules, the `sewer_key` mapping on every limits lookup, `a_awf_m2` visible only for lava AND combined; the producer sections are C-1.
5. Lining block on A262-29 (1.5 vs 1.0 mm, 1 vs 2 layers, bentonite ≥ 60 cm) → **STAGED entirely** (C-4: every field is consumed by A262-31; G-3 / G-4 gates).

## 7. Files changed

Modified: `src/lib/eval/regulation-tables-seed-index.ts` (`a262e` line), `src/lib/eval/field-configs/index.ts`, `src/lib/eval/equations/index.ts` (a262e lines), `docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-3.md` (+39 blocks, +5 observations), `docs/superpowers/guideline-to-tool-playbook.md` ("Encoding traps" paragraph).
Created: `src/lib/eval/regulation-tables-seed-a262e.ts`, `src/lib/eval/field-configs/a262e.ts`, `src/lib/eval/field-configs/a262e.prior.json` (captured), `src/lib/eval/equations/a262e.ts`, `src/lib/eval/__tests__/regulation-tables-seed-a262e.test.ts`, `src/lib/eval/__tests__/field-configs-a262e.test.ts`, `src/lib/eval/__tests__/equations-a262e.test.ts`, `src/components/worksheet/__tests__/register-a262e-filterstufen.test.tsx`, `scripts/verification/a262e-STAGED-plan3-rulings.sql`, `scripts/migrations/20260917100300_regulation_tables_seed_a262e.sql` + `scripts/rollback-20260917100300-regulation-tables-seed-a262e.sql`, `scripts/migrations/20260917100310_field_configs_a262e.sql` + `scripts/rollback-20260917100310-field-configs-a262e.sql`, `scripts/migrations/20260917100320_equations_a262e.sql` + `scripts/rollback-20260917100320-equations-a262e.sql`, this report (+ the copy at `.superpowers/sdd/…/task-3-report.md`).
Untouched: every a138 / din1989_1 file; the Plan-1/2 migrations; `scripts/reasoning-map/` (churn from the unit run reverted with `git checkout --` before staging).

## 8. Discrepancies vs the brief (codebase / transcript / reality won)

1. **Table 21 is complete** — the brief (and the plan) expected the aerated-gravel row truncated; in this transcript all ten rows print (L1450–L1495) and all are seeded. The brief's `a262e-U-1` id therefore went to Table 19 (images), `U-2` to Tab. 13 "≤ 4", `U-3` to the Tab. 18 lava cell.
2. **Tab. 1 fills created on A262-07, not bound on A262-09** (E-3 / C-3): `pretreatment_selected` is not consumed by A262-09 and the lookup_fill widget removes the input while keys are missing (code read) — binding the existing numbers would have regressed the worksheet.
3. **TABLE_LIMITS sewer key has no `any` token**: every (type, size) is seeded for both `tr` and `m` (identical cells where the table prints no split) so the register's seven lookups pass one mapped key; a missing row is a recoverable `lookup()` failure with no fallback chaining (J-1).
4. **Tab. 18 orifice row is its own table** (`TABLE18_ORIFICE`, keyed by stage_role too — the sand column prints twice) so every row quote stays one span (amendment E); the summary-only Tab. 17/18 cells and their two contradictions with the detail tables are J-2, not seeded.
5. **Municipal filter-type worksheets keyed on `filter_type`** (A262-10), not `filter_type_KomKA` (no consumers in prod) — token map E-1; `system_size_category` is in the same AND but not yet consumed there (C-2) — hides on a wrong type today, on size after the edit.
6. **Section rules: 127 of 144** (17 producer sections refused → C-1); **field rules: 3** (the brief's five lining rules are all on consumed producers → C-4).
7. **Equations 14 new** (brief: 9 + aggregates): three Σ over `ueberlaufbauwerke` instead of two (RÜB and RÜ are different Gl. 6/8 sums), a BSB5 twin of the 4-of-5 count, `rieselrohr_max_len`; `aufenthaltszeit` NOT emitted (prod `Q_Tr_h_max` unit "l/s; m3/h" — F-2), `V_F` / `A_F_VFKS_total` NOT emitted (no area fields — F-7/F-8); `B_CSB_KomKA` lives on A262-24, not A262-09.
8. **Two extra created selects** (`grauwasser_quelle`, `polishing_temp_band`) and three extra lookup_fills (Tab. 2 CSB, Tab. 15 q/t) so TABLE2_CSB and TABLE15 have consumers; `entlastung_typ` created as the R-1 driver.
9. **60 prod gates, not 71** (I-1); every REQ code named in the brief exists.
10. **Edition** printed (`'2017-11'`) → no numbered edition block.

## 9. Self-review

- Every `verbatim_quote` passes the verifier (69/69); the quote spans were extracted from the transcript by line range with `awk` (mechanical lift) and the `${ }` / `` ` `` specials were grepped for first (none in the spans). Every cue in `field-configs/a262e.ts`, `equations/a262e.ts`, the STAGED file and the 39 sign-off blocks was read from the transcript in this session at the cited line; prod facts (equation ids, gate texts, enum tokens, section codes, units, descriptions) come from the in-session capture/queries quoted in §4 and the STAGED header.
- The emitter guards accepted the module first time because the section list and the three field rules were derived from the capture's `consumer_worksheets` BEFORE emitting (the test pins that no section rule targets a producer section and that A262-29's fields are consumed).
- G-A3 key-string equality pinned: TABLE_LIMITS / TABLE18_ORIFICE / TABLE21 `filter_type` keys ⊆ prod `filter_type` tokens; register enum columns = the prod token lists; TABLE1_* / S4_2 keys ⊆ prod `pretreatment_selected`; the created selects' values = their tables' keys; the `sewer_key` badge maps `combined_sewer → 'm'`, else `'tr'`.
- One assumption corrected by a RED test: a row-scope `visible_when` does NOT null the stored cell in `prepareRegisterRows` (completeness only) — the Σ formulas branch on the discriminator, so a stale hidden `q_krit` never enters Σ Q_krit (pinned, playbook trap 2).
- The `String.replace` `$'` trap was avoided by never patching the seed file with `replace` (files written whole; small edits via the Edit tool / `node` string replacement of non-`$` text).
- `git checkout -- scripts/reasoning-map/` run before staging (the unit run churns five files there); `.env.local` confirmed gitignored; one commit; author `alvaro.burgos@ekowai.com` verified before committing.
- Reviewed the unified diff of every modified file; the only non-A262E changes are the three registry lines, the sign-off section and the playbook paragraph.

## 10. Concerns (for the controller)

1. **Five text-only equations take over existing manual fields** (F-1, F-3…F-6): REQ-41 (`A_Fo_min_VFS_KA >= 16`) and REQ-02c (`Q_GW_taeglich >= 75`) now read computed values on the hook/report paths — the numbers are the printed rules, but the owner should see the class change (manual → computed); three of the five are inert until C-6.
2. **`a_min_m2` / `filterstufen_area_fail` are null / undecidable in prod** until EZ is consumed on A262-10 (C-2) — the register shows the table limits and Σ main areas today, not the EZ check.
3. **The A262-29 lining block is entirely STAGED** (C-4) — every field is a producer for A262-31; §5 win 5 is a ruling, not an encoding.
4. **TABLE_LIMITS stays `imported_unverified`** for one suspect printed cell (Tab. 13 "≤ 4", U-2) — a 1-minute PDF look flips 26 rows.
5. **Tab. 17 / Tab. 18 contradict the detail tables twice** (coarse sand ≥ 0.8 vs ≥ 1; B_Rieselr ≥ 1 vs ≥ 0.5) and add three cells the detail tables lack (J-2) — errata material for DWA, not an encoding choice.
6. **`last_rows` is entry order** (no `sort_by` in the register contract) — the 4-of-5 rule depends on the engineer entering samples chronologically (note in the register; interface gap worth a `sort_by` column key later).
7. **Bundle growth:** TABLE_LIMITS carries 26 × ~800-byte LaTeX spans (~25 KB) in the client bundle via the seed fallback (Task-0 observation; Task 30 measures).
8. **Token/time:** ≈ 0.58 M tokens in, ≈ 60 min wall-clock — above Task 2 (0.45 M / 45 min), below Task 1 (0.55 M / 75 min) for a standard 3.6× the field count; the emitter guards and the mechanical quote lift paid off, the capture-driven section planning cost the most reading.

## 11. Residue (what the guideline demands that the worksheets still do not ask)

Sub-section counts (≥ 3 cells raw filter L760, ≥ 2 better 4 VF sand L951, ≥ 2 coarse sand L1002, 2 lava L1058) — the register's `cells` column is free; f_A,F,CSB,Betrieb / q_F,T,Betrieb from the cells in operation (L761 "≤ 300 g/(m²·d) … ≤ 750 l/(m²·d)"); the resting periods (7 d / 3 d); the per-orifice area check (TABLE18_ORIFICE has no consumer); Table 20 soil types; Tables 22–24 (self-inspection / maintenance tasks — A262-32 free texts); the tightly-spaced distribution network condition (§5.5.2.3) behind `h_beschickung_min_tight`; the k_fB ≈ k_fA / 10 assumption (L1167); the Gl. 5 lump-sum vs Gl. 3+4 choice (m ≥ 1, L603); Table 19 combinations; the 15 %-recirculation restart advice (L1111). Each is a text rule without a home field or a bare reference and stays outside this encoding (content-boundary rule) or on the sign-off sheet.

---

# Fix round 1 (review verdict on `2bc4035`: NEEDS FIXES — two emitted visibility rules hid TRANSITIVE producers)

- **Commits:** two (see the reply): (1) shared tooling — the transitive producer guard + the equations capture; (2) the a262e data fixes plus the a138 / din1989_1 withdrawals the new guard forced. Fable trailer on both; `git checkout -- scripts/reasoning-map/` before staging; tree clean after.
- **Nothing applied to prod.** The three priors were RE-CAPTURED read-only (`build-prior-snapshot.mjs`, extended); the migrations were regenerated by the Task 0 emitters only.

## IMPORTANT 3 (root cause, done first) — the producer guard is now TRANSITIVE

- `scripts/regulation-tables/build-prior-snapshot.mjs`: third capture query `equations` (`w.code, e.id, e.equation_number, e.output_symbol, e.input_symbols` per standard); `foldSnapshot(fieldRows, sectionRows, meta, equationRows = [])` writes `prior.equations = { "<ws> <equation_number>": { id, output_symbol, input_symbols } }` and `_meta.equation_rows`; duplicate keys refused; the CLI summary names the count.
- `scripts/regulation-tables/emit-field-configs-sql.ts`: `PRIOR_SQL.equations`; `PriorEquationRow` / `PriorSnapshot.equations?` (`src/lib/eval/field-configs/types.ts`); `assertPriorSnapshot` validates the map (key shape, object rows, non-empty `output_symbol`, string-array `input_symbols`, string/null `id`); new exported `producerChain(prior, worksheet, symbol)` — BFS from the hidden symbol over the same-worksheet equations (stored `input_symbols` plus `rewriteRules[id].remap` values), the first consumed output ends the chain; the field guard and the section guard (every field in the section tree) call it; messages: `A262-06 m_T_aM: visible_when on a symbol consumed by another worksheet — hides m_T_aM → Gl.10 Q_F_d_aM → Gl.9 Q_T_d_aM (consumed by A262-07, A262-09, A262-27, A262-28) (…)` / `section A262-06 B: … containing a symbol consumed by another worksheet: <chain>; <chain> (…)`; `create` entries are exempt (a new field has no consumers); a legacy prior without `equations` degrades to the direct rule and the CLI prints `warning: <slug>.prior.json carries no "equations" map — the producer guard is direct-only; re-capture …` on stderr.
- Tests (`scripts/__tests__/emit-field-configs-sql-transitive.test.ts`, 9 cases): direct producer (message unchanged for the pinned regexes), one-hop (`f_S_QM → Gl.6 Q_M`), two-hop (`m_T_aM → Gl.10 Q_F_d_aM → Gl.9 Q_T_d_aM (consumed by …)` when the hop is not consumed itself; the first consumed output ends the chain otherwise), chain broken by a consumer-free output (NOT refused) and a symbol feeding nothing (NOT refused), the section variant, cycle safety + other-worksheet equations ignored, the A138-07 `remap` case (`surface_inventory → Gl.2 A_C`), the legacy prior (direct-only), and the `assertPriorSnapshot` shapes. `build-prior-snapshot.test.mjs`: the equations query, the fold (`_meta.equation_rows`, key shape, null `input_symbols` → `[]`, duplicate refusal) and the round-trip through the emitter producing the two-hop message. The 27 pre-existing emitter tests are untouched and green.
- Playbook: paragraph "The emitter's producer guard is TRANSITIVE" above the `visible_when` section.

Re-capture (read-only; connection string never printed):
```
node scripts/regulation-tables/build-prior-snapshot.mjs DWA-A-138-1 a138   → 262 field rows (132 orphan), 252 coded sections of 252, 46 equations
node scripts/regulation-tables/build-prior-snapshot.mjs DIN-1989-1 din1989_1 → 60 field rows (0 orphan), 36 coded sections of 36, 4 equations
node scripts/regulation-tables/build-prior-snapshot.mjs DWA-A-262E a262e   → 215 field rows (19 orphan), 297 coded sections of 297, 18 equations
```
The diff of each prior is additive (`captured_at`, `_meta.equation_rows`, the `equations` map) — no field/section row changed.

Re-emit against the transitive guard — what it refused, per standard (a throwaway listing script walked every rule through `producerChain`; each item is now on the sign-off sheet + the standard's STAGED file, and its module drops the rule):

| standard | refused rule | chain | moved to |
|---|---|---|---|
| a138 | field `A138-21 k_f_FS ← shaft_type == 'typ_B'` | `k_f_FS → Gl.40 h_S (consumed by A138-23, A138-24)` | `a138-C-6` (+ STAGED block); `field-configs/a138.ts` entry removed (L2085/L2155 cues kept); 16 → 15 field entries |
| a138 | section `A138-20 B ← facility_type_selected == 'MRS'` | `Q_Dr_max / Q_Dr_min → Gl.33 Q_Dr (consumed by A138-23, A138-24, A138-26, A138-13)` | `a138-C-7`; `FACILITY_WORKSHEETS` A138-20 drops `'B'`; 50 → 49 section rules; `20260917100110` + rollback re-emitted; `field-configs-a138.test.ts` pins updated |
| din1989_1 | section `DIN-1989-1-04 B ← bemessungsverfahren != 'verkuerzt'` | `A_A → Gl.1 E_R (consumed by …)`, `P_d / n → Gl.2 BW_a`, `A_Bew / BS_a → Gl.3 BW_a` (every section-B input) | `din1989_1-C-3`; `SECTION_VISIBILITY = []`; `20260917100210` + rollback re-emitted (21 field entries, 0 section rules); `field-configs-din1989-1.test.ts` pins updated (the section-B test now asserts the chain) |
| a262e | section `A262-06 B` (CRITICAL 1) | `m_T_aM → Gl.10 Q_F_d_aM (consumed by A262-09)` [→ Gl.9]; `f_S_QM → Gl.6 Q_M`; `Q_Dr_RU / Q_krit → Gl.8 Q_M` | `a262e-C-1` amended (19 sections; "split Gl. 9/10 off A262-06 first") |
| a262e | section `A262-28 B` (found by the new guard) | `eta_VF / RV → Gl.16 eta_DN (consumed by A262-33)` | `a262e-C-1` amended |
| a262e | fields `A262-05 q_R_Tr`, `Q_R_Tr` (IMPORTANT 2) | `q_R_Tr → Gl.4 Q_R_Tr → Gl.1 Q_Tr_h_max (consumed by A262-07, A262-09)` | `a262e-C-7` (judgment: heading L579 vs prod wiring; options a/b/c); `m_multiplier` keeps its rule (Gl. 5 outputs no field — pinned) |

a262e after the fix: 26 field entries (24 create, **2** UPDATE: `m_multiplier`, `B_CSB_Grauwasser`), **125** section rules (A262-06 → A, C, J, K, L, M; A262-28 → A, C, D, J, K, L, M), `20260917100310` + rollback re-emitted; `field-configs-a262e.test.ts` now also walks every emitted section rule through `producerChain` (must be null) and pins the three withdrawn chains, `m_multiplier` null and the 18 captured equations. Counts-table deltas: field visible_when 3 → 1, section visible_when 127 → 125, sign-off entries 39 → 42 (+ C-7, P-2, J-4; C-1 amended), plus a138 +2 (C-6, C-7) and din1989_1 +1 (C-3).

## MINOR
- (4) `A262-21-D1` clause pointer → `§4.3.3.4 (definitional: f_A,F,CSB per Tab. 10 L937 / Tab. 18 L1228)`, description notes that Tab. 12 prints no f_A,F,CSB row; `20260917100320` re-emitted (rollback byte-identical).
- (5) `a262e-P-2`: the "≥ 4*" relaxation — §5.5.2.3 read in-session: L1725 "The loaded filter area per opening should not exceed 5 m²." / L1726 "If the loaded filter area per opening is ≤ 1 m² per hole, the specific area required for municipal wastewater treatment plants (not for small wastewater treatment systems) can be reduced by 0.5 m²/P …" — not seeded (TABLE_LIMITS locked); proposed `a_spez_min_tight = 3.5` column + boolean driver, owner ratifies.
- (6) `a262e-F-2` STAGED block now carries `UPDATE fields f SET unit = 'l/s' … WHERE … f.symbol = 'Q_Tr_h_max' AND f.unit = 'l/s; m3/h'` (+ rollback) ahead of the equation.
- (7) `a262e-J-4`: TABLE21 `u_max = 5` is the printed STRICT "< 5" (L1413 Gl. 18; REQ-16 `U < 5`) — any consumer compares with `<`.
- (8) `V_VB_min` description (field-configs) + `a262e-J-4`: blank for `settling_pond` (its §4.2.4 rule is the area 1.5 m²/P, column `a_spez_min_m2_p`; no fill created).

## Raw output (commit 2 state)

```
pnpm vitest run --project unit scripts/__tests__/emit-field-configs-sql-transitive.test.ts scripts/regulation-tables/__tests__/build-prior-snapshot.test.mjs scripts/__tests__/emit-field-configs-sql-guards.test.ts scripts/__tests__/emit-field-configs-sql.test.ts
 Tests  37 passed (37)
pnpm test
 Test Files  254 passed | 1 skipped (255)
      Tests  2457 passed | 1 expected fail | 1 skipped (2459)
   Start at  18:54:38 · Duration  43.43s
pnpm -s typecheck → exit 0 · pnpm -s eslint <11 touched .ts files> → exit 0 (one no-unused-vars warning in a138.ts fixed before the run)
verify-regulation-tables.ts a262e → 69/69 · din1989_1 → 42/42 · a138_p3 → 81/81
pnpm vitest run --project integration tests/harness/a262e-verify.integration.test.ts → 59 passed (59)
```
(2447 → 2457 = +9 transitive cases + 1 capture case.) Freshness pins: all three field-config migrations and the a262e equations migration are byte-pinned against the re-captured priors (green inside the full run).
