# Plan 3 — DWA-A-138-1 (`a138`) — Task 1 report

- **Status:** DONE_WITH_CONCERNS (all concerns are recorded on the sign-off sheet; nothing blocks Task 2)
- **Model / effort:** Claude Opus 5 (`claude-opus-5[1m]`), effort as dispatched · **Date:** 2026-09-17
- **Branch:** `feat/guideline-to-tool`, worktree `C:\Users\Ekowai\_wt-g2t`, base `cb3ff4d`
- **Nothing applied to prod.** No `apply-migration`, `drizzle-kit`, `vercel`, or DB write. Prod was read ONLY by `node scripts/regulation-tables/build-prior-snapshot.mjs DWA-A-138-1 a138` (read-only tx) and `node scripts/verification/prod-query.mjs --sql "<SELECT …>"` (worksheet titles, section titles, equations, the four gate rows quoted in the STAGED file). `.env.local` never printed.
- **SR-1 source:** every seeded value and every cue was read in this session from `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-138-1\DWA-A_138-1_WD (5).md` (3076 lines); the inventory was used for line pointers only (its Gl. 10 pointer "L699" was wrong — Gl. (10) is L1501).

## 1. Counts table

| slug | tables | rows lifted | rows unreadable | registers | select_one | select_many | lookup_fill | field visible_when | section visible_when | equations new | equations staged | sign-off entries | tokens in | minutes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `a138` | 9 | 81 | 1 table (Tab. 10, image) + 1 cell (TAB14 MRE Freibord, seeded null) + 2 OCR cells (TAB5, seeded, U-5); 21 printed "(*)"/empty Tab. 6/7 rows deliberately not seeded (U-3, U-4) | 2 (both `create`) | 2 (both `create`) | 0 | 4 (3 `create` + 1 UPDATE) | 3 | 50 | 5 | 4 (+1 lookup_fill binding staged) | 33 | ≈ 0.55 M (tool-marker delta 15.00 M → 14.45 M at report time) | ≈ 75 |

`create` entries: 12 of 16 field entries (a138_tier, eta_afs63_required, eta_geloest_required, schutzkategorie, n_limit, schuettmaterial, kf_test_sites, soil_layers, k_f_sites_min, k_f_layer_min, feasibility_code, A_C_s_flood); UPDATE entries: belastungskategorie (lookup_fill, `keep_prod`), k_f_FS, A_S_FS, n_R_MRS (visible_when). Derived-output fields (`widget='derived'`): 5.

## 2. Raw test output

`pnpm test`:
```
 Test Files  244 passed | 1 skipped (245)
      Tests  2374 passed | 1 expected fail | 1 skipped (2376)
   Start at  16:08:18
   Duration  36.53s (transform 9.00s, setup 40.25s, import 78.88s, tests 32.21s, environment 157.35s)
```
(2347 at `cb3ff4d` → 2374 = +27: seed-a138 13 (was 6), seed-index 4 (was 3), emit-seed-sql +3, field-configs-a138 6, equations-a138 7, register-a138-kf-sites 3.)

`pnpm -s typecheck` → exit 0. `pnpm -s eslint <16 touched .ts/.tsx files>` → exit 0, no output.

`pnpm vitest run --project integration tests/harness/a138-verify.integration.test.ts` (embedded PG; run at baseline before any change AND after the commit set):
```
 Test Files  1 passed (1)
      Tests  38 passed (38)
   Start at  16:09:02
   Duration  5.59s (transform 441ms, setup 0ms, import 3.88s, tests 1.54s, environment 0ms)
```
The harness seeds prod's 46 equations / 35 gates, so the new equation rows are not in it by construction; it proves the branch's engine changes did not move any A138 gate or equation kind (29/29 block gates both ways, 46/46 equations driven).

TDD: seed tests written first → RED (`TAB9 … expected '…Rampen…' to contain '& 1 & 1,0 \\'` — the printed "1,0" formatter), fixed → GREEN 17/17; `lookup-fill.test.ts` and `lookup-fill-field.test.tsx` pinned the synthesised `Tab. 6:` / `Tab. 9:` quote prefixes and went RED when the lifted quotes landed → re-pinned on the printed row text. Field-config/equation tests: RED on two slips of mine (`PreparedRow.values` not `.cells`; Tab. 14 column order ≠ prod enum order) → GREEN 13/13. The kf-sites render test passed first run (3/3).

## 3. Transcript verification

`pnpm -s tsx scripts/regulation-tables/verify-regulation-tables.ts a138_p3 "C:\Users\Ekowai\Desktop\Guidelines\DWA-A-138-1\DWA-A_138-1_WD (5).md"` → **`81/81 quotes verbatim`**, exit 0. PASS list (table · rows):

- TAB9 (30): dach_schraeg_metall, dach_schraeg_ziegel, dach_flach_metall, dach_flach_abdichtung, dach_flach_kies, gruendach_extensiv_steil, gruendach_intensiv, gruendach_extensiv_10, gruendach_extensiv_unter10, beton, schwarzdecke_asphalt, pflaster_fugenverguss, gleis_feste_fahrbahn, rampe_zum_gebaeude, kunststoff_sportplatz, betonsteinpflaster_sand, pflaster_fuge_15, wassergebunden, kiesbelag_locker, verbundstein_sickerfuge, rasengitter_verkehr, rasengitter_ohne_verkehr, gleis_schotter_durchlaessig, gleis_schotter_schwach, sport_draen_kunststoff, sport_draen_tenne, sport_draen_rasen, park_flach, park_steil, wasserflaeche_eingestaut (L1253–L1306)
- TAB5 (19): D, VW1, V1, VW2, V2, V3, BG1, BF, BL, BG2, BG3, SD1, SD2, SV, SVW, SF, SL, SG, SA (L803–L863)
- TAB6 (4): tier2|thin, tier2|thick, tier3|thin, tier3|thick (L920, L924)
- TAB13 (2): mittel_feinsand, schluffig (L1709, L1710)
- TAB7 (3): tier1_none, tier2, tier3 (L985, L1002, L1006)
- TAB8 (8): gering|le800, gering|gt800, maessig|le800, maessig|gt800, stark|le800, stark|gt800, sehr_stark|le800, sehr_stark|gt800 (L1152–L1188)
- TAB11 (6): feldversuch_grossflaechig, feldversuch_kleine_testgrube, doppelzylinder_infiltrometer, open_end_test, labor_ungestoert, labor_gestoert_sieblinie (L1384–L1390)
- TAB14 (7): flaeche, mulde, MRE, MRS, rigole, schacht, becken (whole printed body L2252–L2260 as the quote of each transposed row)
- S6_4_2_QVS (2): kiessand, kies (L1869, L1870)

`… verify-regulation-tables.ts a138 …` (the FROZEN Plan-1 slug) → `0/55 quotes verbatim` — expected: that builder reproduces the Plan-1 file byte-for-byte and is what the Plan-3 rollback re-emits; it is no longer served by the runtime fallback (`liveSeedSlugs()` excludes superseded slugs).

Status per table: `md_verified` — TAB6, TAB7, TAB8, TAB11, TAB13, S6_4_2_QVS (every seeded row lifted, every cell legible). `imported_unverified` — TAB9 (a138-O-1: I-2 ruling on the (label, C_m, C_s) triple), TAB5 (a138-U-5: BK cells for D/VW1/V1 printed as the glyph "।", BG1 as "1"), TAB14 (a138-U-6: MRE Freibord cell printed empty). Value-parity pins hold: TAB9 values deep-equal `tab9.ts` (no a138-U-1 deviation), TAB5 `tier` = `flaechengruppeToTier`, TAB6 `max` = `tab6Limit` (30/50/15/30), TAB13 = `computeSoilEstimate`.

## 4. Prior capture / emit commands (re-executable)

```
node scripts/regulation-tables/build-prior-snapshot.mjs DWA-A-138-1 a138
  → wrote src\lib\eval\field-configs\a138.prior.json: 262 field rows (132 orphan), 252 coded sections of 252;
    optional columns present: {"fields":{"widget":false,"ui_config":false,"lookup":false,"visible_when":false},"worksheet_sections":{"visible_when":false}}
pnpm -s tsx scripts/regulation-tables/emit-seed-sql.ts a138        → Plan-1 files rewritten byte-identical (git diff empty)
pnpm -s tsx scripts/regulation-tables/emit-seed-sql.ts a138_p3     → scripts/migrations/20260917100100_regulation_tables_seed_a138_p3.sql + scripts/rollback-20260917100100-regulation-tables-seed-a138-p3.sql
pnpm -s tsx scripts/regulation-tables/emit-field-configs-sql.ts a138 20260917100110
  → wrote 16 field entries + 50 section entries for a138 -> scripts/migrations/20260917100110_field_configs_a138.sql scripts/rollback-20260917100110-field-configs-a138.sql
pnpm -s tsx scripts/regulation-tables/emit-equations-sql.ts a138 20260917100120
  → wrote 5 equations for a138 -> scripts/migrations/20260917100120_equations_a138.sql scripts/rollback-20260917100120-equations-a138.sql
```
All three migrations are byte-pinned against a fresh emit (`generated-sql-freshness.test.ts` auto-pins the seed via `SEED_BUILDERS`; `field-configs-a138.test.ts` / `equations-a138.test.ts` pin the other two against the committed `a138.prior.json`). The seed migration carries 81 row upserts and 6 `verification_status` upgrades (`imported_unverified → md_verified`, never the reverse, never touching `engineer_verified`); its rollback reverts those, prunes rows the Plan-1 set lacks, deletes the five new tables and re-emits the Plan-1 upserts verbatim (the brief's "rollback re-emits the Plan-1 rows").

## 5. What was encoded

**Tables (9)** — `src/lib/eval/regulation-tables-seed-a138.ts`, builder `a138SeedTables()`:

| table | keys | values | policy (cue) | rows | status |
|---|---|---|---|---|---|
| TAB9 (upgrade) | surface_type | cm, cs, kind, group (unchanged) | anhaltswert (L1218 Gl. 2 legend + L1222) | 30, quotes lifted per printed row | imported_unverified (O-1) |
| TAB5 (upgrade) | flaechengruppe | tier (unchanged) + **bk** (`BK_I/BK_II/BK_III` = prod enum) | locked, L791 in override_quote (P-1) | 19 | imported_unverified (U-5) |
| TAB6 (upgrade) | tier, bbz_band | max + **n_m_max** [1/a]; labels "≥ 20 cm" / "≥ 30 cm" (L915) | locked (L936) | 4 (U-3) | md_verified |
| TAB7 (new) | tier | eta_afs63_min, eta_geloest_min [%] | locked (L1019 Cu/Zn note) | 3 (U-4) | md_verified |
| TAB8 (new) | schutzkategorie, ac_band | n_max [1/a], t_n_min [a] (nullable), ueberflutung_n [1/a] | locked (L1191 footnote (a) → J-1; caption → P-2) | 8 | md_verified |
| TAB11 (new) | method | f_methode | locked (Gl. 6 L1361) | 6 | md_verified |
| TAB13 (upgrade) | bodenart | factor | locked (L1702) | 2; clause corrected to §6.3.2 (L1676) | md_verified |
| TAB14 (new) | facility_type (= prod `facility_type_selected` tokens) | kf_min, bbz_min_cm, einstau_min_cm, einstau_max_cm, freibord_min_cm, boeschung_max, entleerung_max_h (all nullable) | anhaltswert ("i. d. R." L2257/L2259) | 7 (U-6) | imported_unverified |
| S6_4_2_QVS (new) | schuettmaterial | q_vs [l/(s·m)] | messwert (L1866) | 2 | md_verified |

Not seeded: Tab. 10 (image, L1373 → U-2; `f_ort` keeps the SR-2 range sentence L1369 as cue), Tab. A.1 (suitability matrix → X-1).

**Selections / registers / lookup_fills** — `src/lib/eval/field-configs/a138.ts`: `belastungskategorie` → lookup_fill TAB5·bk (`keep_prod`); `a138_tier` (create, text) → lookup_fill TAB5·tier; `eta_afs63_required` / `eta_geloest_required` (create, number %) → lookup_fill TAB7 role limit keyed on `a138_tier`; `schutzkategorie` (create, enum, 4 lifted labels) → select_one; `schuettmaterial` (create, enum, 2 lifted labels) → select_one; `kf_test_sites` (create json, A138-05 C, placement section) → register with the brief's six columns (TAB11 lookup_key/lookup_value pair, footer `k_f_sites_min`, note L1354); `soil_layers` (create json) → register (label, top_m, bottom_m, bodenart with the Tab. 13 `label_de` datalist read from the seeded table, k_f, is_bbz; footer `k_f_layer_min`, note L1039). Five `derived` output fields created (n_limit, k_f_sites_min, k_f_layer_min, feasibility_code, A_C_s_flood).

**Conditionals**: field `visible_when` on A138-21 `k_f_FS`, `A_S_FS` (`shaft_type == 'typ_B'`, L2085/L2155/L2162 — `A_S_FS` is an addition to the brief's list, same cue) and A138-20 `n_R_MRS` (`facility_type_selected IN {'MRE', 'MRS'}`, L919); section `visible_when` `facility_type_selected == '<token>'` on 50 sections of A138-16…22 (flaeche/mulde/rigole/MRE/MRS/schacht/becken per Tab. 14 column L2252). Refused by the consumed-producer guard and STAGED: `schacht_filter_thickness` (C-1), `Q_Dr`/`V_MUE`/`Q_MUE`/A138-19 `n_R` (C-2), 13 producer sections (C-3). `erf_k_f_FS` and A138-19/-20 `n_M_Bemessung` are not fields in prod.

**Equations (5 new)** — `src/lib/eval/equations/a138.ts`: `A138-02-D1 feasibility_code` (Tab. 3 columns over the seven criteria with prod tokens; `kf_initial_estimate` is A138-02's k_f), `A138-05-D1 k_f_sites_min = min_rows(kf_test_sites, k_f_measured)`, `A138-05-D3 k_f_layer_min = min_rows(soil_layers, k_f)`, `A138-08-D1 n_limit = lookup('TAB8', schutzkategorie, if(A_C <= 800, 'le800', 'gt800'), 'n_max')`, `A138-26-D1 A_C_s_flood = sum_rows(surface_inventory, if(kind == 'paved', area_m2 * c_s, 0))`. Staged (not emitted): `A138-05-D2` (D-2), Gl. 10 rewrite (R-1), `k_f ← k_f_sites_min` (R-2), Gl. 24 fallback (E-4); `n_M_overflow_limit` lookup_fill binding (E-3); `A138-06-D1` dropped per amendment A (2b binding, D-2b-3).

## 6. Inventory §5 top-wins walk

1. Collapse the ~40 duplicates → **deferred** (a138-X-4): inheritance plan written per quantity; needs the owner's producer list; no equation duplicates a producer.
2. `belastungskategorie` from `flaechengruppe` + Tab. 6/7 limits → **partially**: BK, tier and the two required η filled automatically (encoded); `ac_as_ratio_limit` is the 2b binding (gated D-2b-3); `n_M_overflow_limit` staged (E-3, needs `bbz_band`); the "(*) behördlich" state = TAB5 `authority` tier ⇒ "keine Zeile" badge.
3. Re-key `permeability_test_method` + fill `f_methode` + repeatable k_f sites with min → **partially**: TAB11 seeded, `kf_test_sites` register + `k_f_sites_min` encoded; the 6-value enum + `f_methode` fill staged (E-1, D-1 overwrite); the count and the density rule staged (D-2, F-1); feeding `k_f` staged (R-2).
4. Schutzkategorie selector → `n` (Tab. 8) → **encoded** (`schutzkategorie`, TAB8, `n_limit`), computing once `A_C` is consumed on A138-08 (C-4) and the engine passes enum inputs (I-1); the gate `n <= n_limit` staged (G-4); `T_n_Ue` not touched.
5. Derive feasibility from the seven Tab. 3 criteria → **encoded as code** (`feasibility_code` 1/2/3), computing once I-1 lands; the enum derivation / REQ-02 re-point staged (D-1).

## 7. Files changed

Modified: `src/lib/eval/regulation-tables-seed-a138.ts` (Plan-1 builders frozen as `*Plan1`, nine live builders), `src/lib/eval/regulation-tables-seed-index.ts` (`supersedes`, `liveSeedSlugs`, `a138_p3` entry), `scripts/regulation-tables/emit-seed-sql.ts` (`supersedes` rollback, status upgrade, `emitSeedSqlFor`), `src/lib/eval/field-configs/index.ts`, `src/lib/eval/equations/index.ts` (a138 lines), tests `src/lib/eval/__tests__/regulation-tables-seed-a138.test.ts` (rewritten), `regulation-tables-seed-index.test.ts`, `lookup-fill.test.ts`, `scripts/__tests__/emit-seed-sql.test.ts`, `generated-sql-freshness.test.ts`, `src/components/worksheet/__tests__/lookup-fill-field.test.tsx` (quote-prefix pins re-targeted to the printed rows), `docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-3.md` (+33 blocks).
Created: `src/lib/eval/field-configs/a138.ts`, `src/lib/eval/field-configs/a138.prior.json` (captured), `src/lib/eval/equations/a138.ts`, `src/lib/eval/__tests__/field-configs-a138.test.ts`, `src/lib/eval/__tests__/equations-a138.test.ts`, `src/components/worksheet/__tests__/register-a138-kf-sites.test.tsx`, `scripts/verification/a138-STAGED-plan3-rulings.sql`, `scripts/migrations/20260917100100_regulation_tables_seed_a138_p3.sql` + `scripts/rollback-20260917100100-regulation-tables-seed-a138-p3.sql`, `scripts/migrations/20260917100110_field_configs_a138.sql` + `scripts/rollback-20260917100110-field-configs-a138.sql`, `scripts/migrations/20260917100120_equations_a138.sql` + `scripts/rollback-20260917100120-equations-a138.sql`, this report.
Untouched: `scripts/migrations/20260911110000_regulation_tables_seed_a138.sql` and its rollback (byte-identical after re-emit).

Apply order (owner, after the schema migration): `20260917100100` seed → `20260917100110` field configs → `20260917100120` equations; rollback in reverse. The seed file supersedes the Plan-1 seed via `ON CONFLICT DO UPDATE` and may be applied with or without it. The A138 seed migrations and this task's field/equation files touch only `DWA-A-138-1` rows.

## 8. Discrepancies vs the brief (codebase / reality won)

1. **Seed file name** `…_regulation_tables_seed_a138_p3.sql` (not `…_a138.sql`): `seedFilesFor` derives the name from `slugFile`, which the Task-0 pin requires to equal the slug key; the Plan-1 file keeps its name because `a138` keeps its Plan-1 stamp. `SEED_BUILDERS.a138` now points at the FROZEN `a138Plan1SeedTables` (its two Task-0 pins updated), `a138_p3` (`supersedes: 'a138'`) is the live set; `allSeedTables()` serves live slugs only. `emitSeedSql` gained the `supersedes` option (the brief's "rollback re-emits the Plan-1 rows" is not expressible without it) and the guarded status-upgrade statement (the header upsert deliberately leaves `verification_status` alone, so a Plan-3 `md_verified` would never reach a prod row seeded by Plan 1).
2. `belastungskategorie` prod tokens are `BK_I/BK_II/BK_III`, not `I/II/III` (E-2) — TAB5 `bk` uses prod's.
3. Amendment A: `A138-06-D1` not encoded; `A138-06-D2` is STAGED as a lookup_fill (E-3), not emitted — binding it now would leave the engineer without an input while `bbz_band` is missing.
4. `q_VS` lookup_fill not emitted (E-4): `q_VS` is the Gl. 24 output (engine-owned) — a second producer; `schuettmaterial` created; no `datenquelle` field exists (S-1).
5. `A138-05-D2` not emitted (D-2): the output is an existing consumed manual number; an equation would take ownership and count 0 on an empty register.
6. `f_methode` lookup_fill not emitted (E-1, D-1) — as the brief foresaw.
7. Field `visible_when`: 3 instead of 6 (consumed-producer guard, C-1/C-2); `A_S_FS` added (same §6.7.2 cue). Section `visible_when`: 50 of 63 (C-3) — the facility worksheets are only PARTIALLY hidden for non-selected types.
8. TAB5 stays `imported_unverified` (U-5), not `md_verified` as the brief's table says; TAB14 likewise (U-6).
9. Tab. 6 BG1 "n_M max. 2/a" is not representable under the `tier` key (U-3); Tab. 7 has 3 value rows (brief estimated 8).
10. Equations: 5 new (brief: 7) — see 3 and 5; the brief's Gl. 10 pointer (L699) is L1501.
11. Sign-off letters P/J/S/O follow the brief's ids although the skeleton's class list lacks P/J/S; 33 blocks (brief ≈ 14) because every refused/deferred item got its own block.
12. TAB13 `clause_reference` corrected (`§6.3.2, Tab. 13`; Plan-1 said "Anhang A"); TAB13 `schluffig` label lifted to the printed "schluffiger Sand, sandiger Schluff, Schluff" (the enum token stays `schluffig`).

## 9. Self-review

- Every `verbatim_quote` passes the verifier (81/81); every cue in `field-configs/a138.ts` / `equations/a138.ts` / the sign-off blocks was read from the transcript in this session at the cited line (the L2000ff pointer I first wrote for Gl. 30–33 in the STAGED file was corrected to L1974/L2058 after checking).
- Incident during the seed edit: a `String.replace` with a `$'` replacement pattern duplicated the tail of `regulation-tables-seed-a138.ts`; I rebuilt line 318 (TAB14 body) directly from transcript lines 2252–2260 and the remaining tail from the intact copy; the result is verified by the verifier, the 13 seed tests, typecheck and eslint (no residue of the duplication — 364 lines, exports listed once).
- The emitter guards did their job: the section list in `a138.ts` was derived from the capture (producers per section) BEFORE emitting, so the emitter accepted 50/50 sections on the first run; `validateEntry` accepted `belastungskategorie` (`keep_prod`, prior enum non-null) and the 12 creates against captured section codes.
- `git checkout -- scripts/reasoning-map/` run before staging (the unit run churns five files there); `.env.local` confirmed gitignored; one commit; author `alvaro.burgos@ekowai.com`.
- Reviewed the unified diff of every modified file; the only non-A138 change is the generic `supersedes` mechanism in the seed emitter/index and the three re-targeted quote pins.

## 10. Concerns (for the controller)

1. **Engine gap a138-I-1 (highest):** `evaluateFormula` and its three callers pass numeric inputs only, so any formula keyed on a select (`feasibility_code`, `n_limit` here; the same class in every later standard) reports `manual_required — Fehlende Eingaben` on the worksheet. Emitted as DATA anyway (correct, visible, never a wrong number; pinned). Proposed fix is a small Plan-2a amendment (widen `EvalInputValue.value`, pass enum/text values in `use-equation-engine.ts`, `evaluate-for-report.ts`, `materialize-derived.ts`); I did not change the engine inside a DATA task.
2. **Partial hiding of A138-16…22** until the 13 consumer edits (C-3) are ratified — headings/empty sections hide, the producer sections stay.
3. **`n_limit` cannot compute on A138-08** until `A_C` is consumed there (C-4) — the engine names the missing input.
4. **TAB5/TAB14 not `md_verified`** because of OCR/span cells (U-5, U-6) — a 5-minute PDF look by the owner flips both.
5. **Bundle growth:** the seed builders now carry ~25 KB of lifted LaTeX quotes in the client bundle (Task-0 observation; Task 30 measures).
6. **Token measurement:** ≈ 0.55 M tokens in / 9 tables · 16 field entries · 50 section rules · 5 equations · 33 sign-off blocks out, ≈ 75 min wall-clock — the first Plan-3 data point for the playbook's "Token budget note".

## 11. Residue (what the guideline demands that the worksheets still do not ask)

Tab. 10 criteria for `f_ort` (image); Tab. 3 column-4 facts for k_f (Anschluss/Ableitung möglich) and the Trinkwasserschutz risk judgment; the test-site density inputs (Sohlenfläche, Anlagenlänge, Heterogenität); BG1's Mulden-Rigolen `n_M max. 2/a`; Tab. 14's "ca. 1·10⁻⁵" BBZ k_f (a "ca." figure, not seeded as a limit); the Flächengruppe-per-surface strictest rule (L944); N facility instances; the Gl. 37/40 Typ-B switch; Tab. A.1 method suitability. Each is on the sign-off sheet with its line.
