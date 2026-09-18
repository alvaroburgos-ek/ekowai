# Plan 3 — DWA-M-205 (`m205`) — Task 11 report

- **Status:** DONE_WITH_CONCERNS (every concern is a sign-off block; nothing blocks Task 12)
- **Model provenance:** per the commit trailer (`Co-Authored-By: Claude Fable 5.1`, controller ruling); the subagent session ran on Opus 5 (`claude-opus-5[1m]`), effort as dispatched · **CLI:** claude 2.1.260 (no update taken — user declines updates) · **Date:** 2026-09-18
- **Branch:** `feat/guideline-to-tool`, worktree `C:\Users\Ekowai\_wt-g2t`, base `54151cd`
- **Nothing applied to prod.** No `apply-migration`, `drizzle-kit`, `vercel`, or DB write. Prod was read ONLY by `node scripts/regulation-tables/build-prior-snapshot.mjs DWA-M-205 m205` (read-only tx) and `node scripts/verification/prod-query.mjs --sql "<SELECT …>"` (the `standards` row incl. `version`, the 26 worksheet titles, the section codes / titles / field counts of nine worksheets, the 72 compliance rows with ids / severities / md5(condition) / conditions, the 24 equation rows with ids / formulas / md5 / input_symbols / status, the labels / units / `is_required` / `validation_rules` of the touched fields, the `information_schema` column lists of `equations` / `compliance_requirements` / `fields`). `.env.local` never printed.
- **SR-1 source:** every seeded value and every cue was read in this session from `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-205\DWA-M_205.md` (1360 lines; read end-to-end at L1–L1360). The quote spans were lifted mechanically by line range (a throwaway generator in the scratchpad, `JSON.stringify` per span — no `${ }` / backtick hazards) and every seeded cell is asserted inside its span at build time (`inSpan`). The inventory was used for pointers only (its Tab.-6 / Tab.-7 row pointers were off by one — Tab. 6 rows are L877–L880, Tab. 7 rows L1021–L1029 — caught by `inSpan` before any migration was emitted). The `.tex` / `.jpg` siblings were not opened; the PDF was not opened.

## 1. Counts table

| slug | tables | rows lifted | rows unreadable | registers | select_one | select_many | lookup_fill | field visible_when | section visible_when | equations new | equations staged | sign-off entries | tokens in | minutes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `m205` | 15 | 79 (79/79 verbatim) | 0 rows skipped; 1 cell seeded null (TABELLE1 Darmviren volume "10 1*)", U-1); 6 rating cells kept as the printed digit "0" (TABELLE8_*, U-2) + the "mJ/s" unit typo kept verbatim (U-3) → 4 tables `imported_unverified`, 11 `md_verified` | 6 (all `create`: `leitorganismen` -10, `bestrahlungsgerinne` -11, `membranmodule` -14, `ozongeneratoren` -17, `chlorungsmittel` -21, `proben_desinfektion` -24) | 3 (1 `create`: `bewirtschaftung` -05; 2 UPDATE `keep_prod` + visibility: `gewaessertyp`, `guetekategorie` -04) | 0 | 13 (all `create`: `log_reduktion_empfehlung` + 6 × `*_tab4` on -05, `uv_dosis_min` / `_max` on -10, `spez_energie_ozon_tab` on -17, `temperatur_ozonentfernung_min` / `_max` + `verbrennung_haltezeit_min` on -18) | 14 (12 active: 10 UPDATE + 2 created fills; 2 latent UPDATE on -05 until C-3) | 0 (every field-bearing B / D section of -10 … -23 holds a consumed producer — refused; C-1 / C-2) | 16 (-10 D1/D2, -11 D1…D3, -14 D1/D2, -17 D1…D5, -21 D1, -24 D1…D3) | 3 replacements (R-1 EQ-05, R-2 EQ-04, R-3 14 range rows) + 14 gate blocks (G-1 … G-14) | 45 (+5 observations) | ≈ 0.65 M (tool-marker delta 15.00 M → 14.35 M at report time) | ≈ 60 |

Field entries: 49 = 37 `create` + 12 UPDATE. Migration `20260917101110`: 37 `INSERT … WHERE NOT EXISTS`, 12 `UPDATE fields`, 0 `UPDATE worksheet_sections`; the rollback restores the 12 UPDATE rows to the captured NULLs and deletes only the 37 `Plan 3:` rows. Derived-output fields (`widget='derived'`): 16 — one per equation. No `enum_values` is written by any UPDATE (D-1: the two -04 selects carry `keep_prod`).

## 2. Raw test output

`pnpm test` (after all changes):
```
 Test Files  287 passed | 1 skipped (288)
      Tests  2684 passed | 1 expected fail | 1 skipped (2686)
   Start at  04:49:24
   Duration  45.09s (transform 12.27s, setup 47.71s, import 101.94s, tests 43.30s, environment 189.73s)
```
(2653 at `54151cd` + 31 from this task: seed-m205 13, field-configs-m205 7, equations-m205 9, register-m205-leitorganismen 2; the shared `regulation-tables-seed-index` / `generated-sql-freshness` / `emit-seed-sql` pins iterate the new slug.)

`pnpm -s typecheck` → first run: 1 error in `equations-m205.test.ts` (`table(code, keys, column)` — the fallback lookup takes two arguments and returns the row) → pin changed to `toMatchObject` on the row → exit 0 (`TYPECHECK exit=0`). `pnpm -s eslint <10 touched .ts/.tsx files>` → exit 0, no output.

Integration harness (embedded PG; no engine change on this task), run at baseline before any change AND after the commit set:
```
pnpm vitest run --project integration tests/harness/m205-verify.integration.test.ts
 Test Files  1 passed (1)
      Tests  76 passed (76)
   Start at  04:50:54
   Duration  6.49s (transform 619ms, setup 0ms, import 3.64s, tests 2.68s, environment 0ms)
```
The harness seeds prod's fields / equations / gates (`tests/harness/seed-m205.ts`); the new rows are not in it by construction — it proves the branch still drives every DWA-M-205 chain and gate both ways where drivable.

**TDD evidence.** Runtime facts were established BEFORE the pins with a scratch script through the real `prepareRegisterRows` / `evaluateFormula` on the seeded TS tables (`scripts/_probe_m205.ts`, deleted): a `lookup_key` row fills the Tab.-1 G/I pairs; a `derived` `lookup('TABELLE2', gewaesserklasse, parameter_t2, …)` reads the INHERITED worksheet symbol in row scope and yields 1.000 / 95 for binnen_gut × e_coli; a hidden branch column is null and not required (rows complete with only their own branch filled); a null target (Strep. faecalis I-Wert "-") leaves `ok` null and `count_rows(reg, ok == 0)` `manual_required: Fehlende Eingabe für count_rows(): ok`; `count_rows` over an empty register is 0; `mean_rows(reg, log_red)` with a c_out = 0 row failed with `Unbekanntes Symbol "log_red"` → the equations now filter with the conditional aggregate (`mean_rows(…, log_red, c_out > 0)`), re-probed 3,5 / 2; `if(zuschaltbar == true, 2, 1)` on an unset boolean is decidable (1); `lookup('S4_3_3_2', 'luft', 'o2_pro_o3_kg')` (null) makes `o2_bedarf_kg_h` `manual_required: Operand ist keine Zahl: null`; the 500 × ct switch and `!=` conditions parse and compute. Seed builder: two RED runs on my own line offsets (Tab. 6 row 1 is L877 not L878; Tab. 7 rows L1021–L1029 — a cascading replace shifted every row once) caught by `inSpan` → GREEN; verifier **79/79** on its first run after that. Field-config test: one RED (`extractSymbols` takes a parsed node, not a string — silently empty) → 7/7; the emitter accepted all 49 entries on its first run (the rule set was planned against the capture). Equations test: one RED on the `table()` arity pin (typecheck) → 9/9. Render test: one RED on the badge testid (`derived-badge-ok` with the `value_labels` text, not `derived-ok`) → 2/2.

## 3. Transcript verification

`pnpm -s tsx scripts/regulation-tables/verify-regulation-tables.ts m205 "C:\Users\Ekowai\Desktop\Guidelines\DWA-M-205\DWA-M_205.md"` → **`79/79 quotes verbatim`**, exit 0. PASS list (table · rows · lines):

- TABELLE1 (5): gesamtcoliforme L301 · faekalcoliforme L302 · strep_faecalis L303 · salmonellen L304 · darmviren L305
- TABELLE2 (12): binnen_* × enterokokken L322 · binnen_* × e_coli L323 · kueste_* × enterokokken L331 · kueste_* × e_coli L332 (three rows per line)
- TABELLE3 (4): 1 L368–L372 · 2 L373–L376 · 3 L377–L389 · 4 L390–L399 (multi-line spans)
- TABELLE4 (2): niederdruck, mitteldruck — the printed body L530–L537 as the quote of both transposed rows
- S4_1_2_3 (2): mindestbestrahlung L488 · einzelfall_zehnerpotenz L490
- S3_3_LOGRED (4): unrestricted|arbeitsintensiv, unrestricted|hoch_mechanisiert, restricted|arbeitsintensiv, restricted|hoch_mechanisiert — L354
- TABELLE5 (3): straubing, rottenburg, ruhleben — header L818 + body L819–L827 (transposed)
- TABELLE6 (4): 1 L877 · 2 L878 · 3 / 4 L879–L880 (shared multirow span)
- TABELLE7 (9): 1 … 9 — L1021 … L1029
- TABELLE8_UV / _MEMBRAN / _OZON (9 each): wirkprinzip L1050 · praxiserprobung L1051 · e_coli_erreichbar L1052 · transformationsprodukte L1053 · arbeitssicherheit L1054 · energieeinsatz L1055 · kosten L1056 · vorbehandlung L1057 · zusatzeffekte L1058
- S4_3_3_2 (2): reiner_sauerstoff, luft — L899
- S4_4_2 (3): chlorgas L973 · natriumhypochlorit L973 · chlordioxid L984
- S4_3_3_4 (2): thermisch, katalytisch — L931

Status per table: `md_verified` — TABELLE2, TABELLE3, TABELLE4, S4_1_2_3, S3_3_LOGRED, TABELLE5, TABELLE6, TABELLE7, S4_3_3_2, S4_4_2, S4_3_3_4 (every printed row lifted, every cell legible). `imported_unverified` — TABELLE1 (U-1: L305 "Darmviren in 10 1*)" — OCR "l"/"1", `volume_ml` null), TABELLE8_UV / _MEMBRAN / _OZON (U-2: rating cells printed as the digit "0" at L1050 / L1054 / L1055 / L1058 kept verbatim; U-3: L1052 "400 mJ/s- 700 mJ/s").

## 4. Prior capture / emit commands (re-executable)

```
node scripts/regulation-tables/build-prior-snapshot.mjs DWA-M-205 m205
  → wrote src\lib\eval\field-configs\m205.prior.json: 237 field rows (108 orphan), 234 coded sections of 234, 24 equations;
    optional columns present: {"fields":{"widget":false,"ui_config":false,"lookup":false,"visible_when":false},"worksheet_sections":{"visible_when":false}}
pnpm -s tsx scripts/regulation-tables/emit-seed-sql.ts m205
  → wrote seed + rollback for m205 -> scripts/migrations/20260917101100_regulation_tables_seed_m205.sql scripts/rollback-20260917101100-regulation-tables-seed-m205.sql
pnpm -s tsx scripts/regulation-tables/emit-field-configs-sql.ts m205 20260917101110
  → wrote 49 field entries + 0 section entries for m205 -> scripts/migrations/20260917101110_field_configs_m205.sql scripts/rollback-20260917101110-field-configs-m205.sql
pnpm -s tsx scripts/regulation-tables/emit-equations-sql.ts m205 20260917101120
  → wrote 16 equations for m205 -> scripts/migrations/20260917101120_equations_m205.sql scripts/rollback-20260917101120-equations-m205.sql
```
All three migrations are byte-pinned against a fresh emit (`generated-sql-freshness.test.ts` auto-pins the seed via `SEED_BUILDERS`; `field-configs-m205.test.ts` / `equations-m205.test.ts` pin the other two against the committed `m205.prior.json`). The seed migration carries 79 row upserts (`ON CONFLICT (table_id, row_key)`) and 11 `verification_status` upgrades (`imported_unverified → md_verified`, never the reverse); its rollback deletes the fifteen tables (no earlier DWA-M-205 table seed exists — nothing superseded; the Pass-4 overlay and the `feat/m205-singlesource` migration touch other tables / symbols, X-1). The equations rollback deletes the 16 `Plan 3:` rows. Apply order (owner, after the schema migration incl. plan1-D-3-1): `20260917101100` → `20260917101110` → `20260917101120`; rollback in reverse. Every file touches `DWA-M-205` rows only. Scalar-only rows (`ozon_pro_doc_calc`, `ozonbedarf_kg_h`, `o2_bedarf_kg_h`, `ct_ziel`) are not server-materialised (amendment D — expected, noted once here and as I-1); the twelve register-fed rows materialise on save.

## 5. What was encoded

**Tables (15)** — `src/lib/eval/regulation-tables-seed-m205.ts`, builder `m205SeedTables()`, edition `'2013-03'` (title page L5 / L11 "März 2013", imprint L36 "Hennef 2013" = prod `standards.version` 'März 2013'):

| table | keys | values | policy (cue) | rows | status |
|---|---|---|---|---|---|
| TABELLE1 | `parameter` (gesamtcoliforme … darmviren — the register's `lookup_key` rows) | `g_wert`, `g_pct`, `i_wert`, `i_pct` (nullable — printed "-"), `volume_ml`, `volume_text`, `auf_anforderung` ("*)") | anhaltswert (§2.1 L232 authority sentence) | 5 | imported_unverified (U-1) |
| TABELLE2 | `gewaesserklasse` (prod combined tokens + `kueste_ausreichend`, E-1) × `parameter` (enterokokken / e_coli) | `limit_cfu_100ml`, `percentile_pct`, `methode` | anhaltswert (L232) | 12 | md_verified |
| TABELLE3 | `eignungsklasse` (prod '1'…'4') | `anwendung`, `einschraenkungen`, `nichtanwendung` (lifted lists), `fkstrep_text` / `e_coli_text` / `toc_text` (as printed), `fkstrep_max` / `e_coli_max` / `toc_max` (nullable — J-4), `fussnoten` | anhaltswert (footnote 4 L406 "Richtwert, der … so weit unterschritten werden sollte …") | 4 | md_verified |
| TABELLE4 | `strahlertyp` (prod niederdruck / mitteldruck) | 8 printed strings + 7 × `_min` / `_max` numeric pairs | anhaltswert (L533 "Typische Leistungsaufnahme" — L603 bidder guarantees) | 2 | md_verified |
| S4_1_2_3 | `zielband` (prod `uv_dosis_zielband`; no row for `tab2_ausgezeichnet`, E-2) | `dosis_min_j_m2`, `dosis_max_regel_j_m2`, `dosis_max_j_m2` | anhaltswert (L490 "kann … auch höher liegen") | 2 | md_verified |
| S3_3_LOGRED | `nutzung` (prod) × `bewirtschaftung` (created) | `empfehlung` (text), `log_min`, `log_max` | anhaltswert (L354 "wird … empfohlen") | 4 | md_verified |
| TABELLE5 | `anlage` (straubing / rottenburg / ruhleben) | `filtrationseinheit`, `typ`, `porengroesse_um`, `verfahrensart`, `membranflaeche_m2`, `permeat_m3_d`, `netto_flux`, `druck_min/max`, `energie_min/max`, `kosten_eur_m3` | anhaltswert (L784 pilot recommended) | 3 | md_verified |
| TABELLE6 | `nr` | `konzentration`, `konz_mg_l`, `kontaktzeit`, `kontaktzeit_min`, `parameter`, `ergebnis`, `log_stufen`, `quelle` | anhaltswert (L860 "Orientierungswerte") | 4 | md_verified |
| TABELLE7 | `nr` | `pes_konzentration`, `pes_min/max`, `kontaktzeit`, `kontaktzeit_min/max`, `parameter`, `ergebnis`, `log_stufen`, `quelle` | anhaltswert (L1006 pilot tests) | 9 | md_verified |
| TABELLE8_UV / _MEMBRAN / _OZON | `aspekt` (9) | `bewertung` (printed glyph verbatim), `text`, `wert_min`, `wert_max` | anhaltswert (L1038 "im Einzelfall … weitere Vor- und Nachteile") | 9 × 3 | imported_unverified (U-2 / U-3) |
| S4_3_3_2 | `einsatzgas` (prod luft / reiner_sauerstoff) | `spez_energie_kwh_kg` (10 / 16 — J-3), `aufschlag_pct`, `o2_pro_o3_kg`, `o3_anteil_min/max_pct`, `o3_pro_m3_o2_min/max_g` (Reinsauerstoff only) | anhaltswert (L899 "etwa" / "ca.") | 2 | md_verified |
| S4_4_2 | `chlormittel` (prod chlorgas / natriumhypochlorit / chlordioxid) | `dosis_min/max`, `dosis_unit`, `dosis_sandfiltriert_min/max`, `kontaktzeit_min/max`, `kontaktzeit_text`, `ph_min/max`, `restchlor_mg_l`, `loesung_g_l_min/max`, `explosiv_ab_vol_pct`, `log_stufen` | anhaltswert (L973) | 3 (J-2) | md_verified |
| S4_3_3_4 | `verbrennung_typ` (prod thermisch / katalytisch) | `temp_min_c`, `temp_max_c`, `haltezeit_min_s`, `restozon_max_mg_m3` | locked (L931 "muss … vermindert werden"; O-1) | 2 | md_verified |

**Registers / selections / lookup_fill / visibility** — `src/lib/eval/field-configs/m205.ts`:
- `leitorganismen` (M205-10 C, create json): discriminator `quelle` (t1 / t2 / t3 / behoerde) → per branch: Tab. 1 `lookup_key parameter_t1` + four `lookup_value`s (G/I with percentiles) + `wert_typ` (G or I — J-1); Tab. 2 `parameter_t2` + derived `limit_t2` / `pct_t2` / `methode_t2` from `lookup('TABELLE2', gewaesserklasse, parameter_t2, …)` (the inherited class, G-13); Tab. 3 `parameter_t3` + derived `limit_t3` / `text_t3` from the inherited `eignungsklasse_bewaesserung`; Behörde typed inputs; `limit` / `perzentil` by nested `if(quelle == …)`; `messwert`; badge `ok = if(messwert <= limit, 1, 0)`. Footer `leitorganismen_count`, `leitorganismen_verletzungen`; note L228 + L232 (+ F-1). No `override` block (O-2).
- `proben_desinfektion` (M205-24 C): `datum`, `organismus` (datalist of the printed organisms), `c_in`, `c_out`, derived `log_red = log10(c_in / c_out)`, optional `limit`, badge `ok`; footer `proben_count`, `log_reduktion_mean`, `log_reduktion_min`; note L224 + L640 (+ the c_out = 0 rule).
- `bestrahlungsgerinne` (M205-11 C): `label`, `q_m3_h`, `sensoren` (min 1), `zuschaltbar`, derived `sensoren_min = if(zuschaltbar == true, 2, 1)` (L590–L591), badge `sensoren_ok`; footer `gerinne_count`, `durchfluss_gerinne_sum`, `gerinne_sensor_verletzungen`.
- `membranmodule` (M205-14 C): `label`, `verfahren` (prod `membranverfahren` tokens), `porenweite_um`, `flaeche_m2`, `netto_flux`, `tmd`, derived `permeat_m3_h`; footer `membranflaeche_sum`, `permeat_design`.
- `ozongeneratoren` (M205-17 C): `label`, `kapazitaet_kg_h`, `spannung_kv`, `frequenz_hz`; footer `ozon_kapazitaet_sum`.
- `chlorungsmittel` (M205-21 C): discriminator `mittel` (prod `chlormittel_typ` tokens), `dosis`, derived `dosis_unit` / `dosis_min` / `dosis_max` / `kontaktzeit_text` from S4_4_2, badge `dosis_ok`, `kontaktzeit_ist`, `restchlor` (row-scope `visible_when mittel != 'chlordioxid'`); footer `chlordosis_verletzungen`.
- Selects: `bewirtschaftung` (M205-05 B, create; L354 arbeitsintensiv / hoch_mechanisiert, always visible — its value matters for restricted only, the unrestricted rows are duplicated); `gewaessertyp` / `guetekategorie` (M205-04, UPDATE `keep_prod`, `visible_when eg_badegewaesser_richtlinie == 'neu'`, L341).
- lookup_fill (all created): `log_reduktion_empfehlung` (text, role limit) ← S3_3_LOGRED by (`nutzung`, `bewirtschaftung`); six `*_tab4` text twins ← TABELLE4 by `strahlertyp` (R-4); `uv_dosis_min` / `uv_dosis_max` (number, role limit) ← S4_1_2_3 by `uv_dosis_zielband` on M205-10; `spez_energie_ozon_tab` (number, role value) ← S4_3_3_2 by `ozon_einsatzgas` on M205-17 (E-3); `temperatur_ozonentfernung_min` / `_max` (`visible_when katalytisch`) / `verbrennung_haltezeit_min` (`visible_when thermisch`) ← S4_3_3_4 by `verbrennung_typ` on M205-18 (I-2).
- Field `visible_when` on existing fields (12, all consumer-free and gate-free by capture): M205-04 `gesamtcoliforme` / `faekalcoliforme` / `strep_faecalis` ← `eg_badegewaesser_richtlinie == 'alt'` (L343), `gewaessertyp` / `guetekategorie` ← `== 'neu'` (L341); M205-05 `fkstrep` / `toc` ← `behandlungsziel == 'bewaesserung'` (L360 — `pending` until C-3); M205-18 `verbrennung_haltezeit_s` ← `verbrennung_typ == 'thermisch'` (L931); M205-21 `clo2_konzentration` ← `chlormittel_typ == 'chlordioxid'`, `chlor_kontaktzeit` / `chlor_ph` / `restchlor_betrieb` ← `!= 'chlordioxid'` (L973 / L982 / L984; J-5). Refused / withheld: every consumed process input (C-4), `wiederverkeimungsbeurteilung` (gate-bearing — G-6), `bromat_bildung` / `ozon_pro_doc` (consumed — G-7 / C-4). Section rules: none (C-1 / C-2).

**Equations (16 new)** — `src/lib/eval/equations/m205.ts`: `M205-10-D1 leitorganismen_verletzungen = count_rows(leitorganismen, ok == 0)` · `-D2 leitorganismen_count` · `M205-11-D1 durchfluss_gerinne_sum = sum_rows(bestrahlungsgerinne, q_m3_h)` · `-D2 gerinne_count` · `-D3 gerinne_sensor_verletzungen = count_rows(…, sensoren_ok == 0)` · `M205-14-D1 membranflaeche_sum = sum_rows(membranmodule, flaeche_m2)` · `-D2 permeat_design = sum_rows(membranmodule, flaeche_m2 * netto_flux / 1000)` · `M205-17-D1 ozon_pro_doc_calc = ozon_konz / doc` · `-D2 ozonbedarf_kg_h = ozon_konz * durchfluss_max / 1000` · `-D3 o2_bedarf_kg_h = ozonbedarf_kg_h * lookup('S4_3_3_2', ozon_einsatzgas, 'o2_pro_o3_kg')` · `-D4 ozon_kapazitaet_sum` · `-D5 ct_ziel = if(ct_wert_zielorganismus == 'cryptosporidien', ct_ecoli_basis * 500, ct_ecoli_basis)` · `M205-21-D1 chlordosis_verletzungen` · `M205-24-D1 log_reduktion_mean = mean_rows(proben_desinfektion, log_red, c_out > 0)` · `-D2 log_reduktion_min` · `-D3 proben_count`. No prod symbol is re-produced. **Pinned values** (unit test through `evaluateFormula` + `prepareRegisterRows` on the TS fallback tables): Tab.-1 Fäkalcoliforme G 100 (80) / I 2.000 (95) → ok 1 / 0 for 80 / 2500; Tab.-2 binnen_gut e_coli 1.000 (95) / enterokokken 400 (95) with the DIN EN ISO methods; Tab.-3 class 2 Fäkalstreptokokken ≤ 100; Behörde 100; violations 2 of 6; empty register 0; the Strep. faecalis "-" and class-1 "nicht nachweisbar" rows undecidable (J-4); samples 10⁷ → 100 = 5,0 and 10⁶ → 10⁴ = 2,0 → mean 3,5 / min 2 (c_out = 0 excluded); channels Σ 1600 m³/h, 3, one sensor violation; Tab.-5 Straubing 300 m² × 50 l/(m²·h) = 15 m³/h, Ruhleben 39,69 → Σ 930 m² / 54,69 m³/h; 10 mg/l ÷ 12,5 mg/l DOC = 0,8; 10 mg/l × 900 m³/h = 9 kg/h; O₂ 90 kg/h (Reinsauerstoff) / `manual_required` (Luft); Σ generators 10,5; ct 2 → 1000 (Cryptosporidien) / 2 (E. coli); Chlorgas 5 mg/l in range, ClO₂ 12 g/m³ and NaOCl 25 mg/l out → 2. The standard prints no further worked example to reproduce.

## 6. Inventory §5 top-wins walk

1. `behandlungsziel` + selectors → auto-fill the Leitorganismus target table and run one generic gate → **encoded, gate STAGED**: the `leitorganismen` register fills the target per row from Tab. 1 (row picker), Tab. 2 (the inherited `gewaesserklasse`) or Tab. 3 (the inherited `eignungsklasse_bewaesserung`), or takes the authority's value; `M205-10-D1` counts violations; the 14 contradictory gates are replaced by ONE gate in STAGED m205-G-1 (+ D-1 retires the seven Ablauf scalars). `behandlungsziel` itself reaches no worksheet (C-3); the per-row `quelle` carries the choice today.
2. `verfahren` as the process switch → **STAGED entirely** (m205-C-1 / C-2 / G-2): `verfahren` has no consumer and every field-bearing section of -10 … -23 holds a consumed producer — zero section rules emitted (m820_3 pattern); the STAGED file carries the consumer edit, the 28 section UPDATEs and the `IF verfahren == … THEN` gate guards.
3. `strahlertyp` → Tab.-4 lamp properties; `ozon_einsatzgas` → energy factor; `chlormittel_typ` → dose / contact / by-product block → **encoded**: six text fills (the printed ranges — R-4, SR-2), `spez_energie_ozon_tab` (10 / 16 kWh/kg, J-3; EQ-05 rewrite R-1), the `chlorungsmittel` register with the S4_4_2 ranges per agent + the four -21 twins switched on `chlormittel_typ`; the consumed chlorine inputs are C-4.
4. Collapse ≈ 95 duplicates / fix the four mis-titled worksheets → **Phase 6** (m205-X-2 lists the four titles and the brief-vs-capture count 82 → 72).
5. Register the real derivations → **encoded (+ F-1 / F-2 / F-3)**: `log_red` per sample with mean / min (F-1: the percentile rule is not printed), `ozon_pro_doc_calc`, `ozonbedarf_kg_h` / `o2_bedarf_kg_h`, `membranflaeche_sum` / `permeat_design`, `ct_ziel` (×500), `Σ Q` / counts; the KVR cost (F-3) and `verweildauer = V/Q` (F-2) are not printed; demoting the eight range-check "equations" is R-3 (STAGED, deactivation class).

## 7. Files changed

Modified: `src/lib/eval/regulation-tables-seed-index.ts` (`m205` line), `src/lib/eval/field-configs/index.ts`, `src/lib/eval/equations/index.ts` (m205 lines), `docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-3.md` (+45 blocks, +5 observations), `docs/superpowers/guideline-to-tool-playbook.md` ("Encoding traps (Plan 3 Task 11)" paragraph).
Created: `src/lib/eval/regulation-tables-seed-m205.ts` (76 KB incl. the 26 KB `Q` span block), `src/lib/eval/field-configs/m205.ts`, `src/lib/eval/field-configs/m205.prior.json` (captured), `src/lib/eval/equations/m205.ts`, `src/lib/eval/__tests__/regulation-tables-seed-m205.test.ts`, `src/lib/eval/__tests__/field-configs-m205.test.ts`, `src/lib/eval/__tests__/equations-m205.test.ts`, `src/components/worksheet/__tests__/register-m205-leitorganismen.test.tsx`, `scripts/verification/m205-STAGED-plan3-rulings.sql` (27 blocks, every line a comment), `scripts/migrations/20260917101100_regulation_tables_seed_m205.sql` + `scripts/rollback-20260917101100-regulation-tables-seed-m205.sql`, `scripts/migrations/20260917101110_field_configs_m205.sql` + `scripts/rollback-20260917101110-field-configs-m205.sql`, `scripts/migrations/20260917101120_equations_m205.sql` + `scripts/rollback-20260917101120-equations-m205.sql`, this report (+ the copy at `.superpowers/sdd/…/task-11-report.md`).
Untouched: every other standard's file; the M205 harness files; `feat/m205-singlesource` (X-1); `scripts/reasoning-map/` (churn from the unit run reverted with `git checkout --` before staging).

## 8. Discrepancies vs the brief (codebase / transcript / reality won)

1. **72 compliance rows, not 82** (capture); 23 same-worksheet duplicates (21 `-2` + 2 REQ), not "≈30" (G-4).
2. **TABELLE2 keyed on prod's combined `gewaesserklasse` × `parameter`** (2 keys), not the brief's `gewaessertyp` × `parameter` × `guetekategorie`: the two separate selects exist on M205-04 only and are consumer-free, while M205-10 (the register's home — it holds the Ablauf scalars and the 14 gates) inherits `gewaesserklasse` from M205-02. The printed "Küstengewässer ausreichend" cells have no prod token → seeded under `kueste_ausreichend` (E-1).
3. **Tab.-4 fills are six created TEXT twins** (R-4, SR-2) rather than re-binds of the existing numeric inputs with a `_min` column — a numeric fill would auto-pick a bound; the `_min` / `_max` pairs are seeded for the STAGED range gate (G-9).
4. **`spez_energie_ozon` not re-bound** (consumed on -07 / -19) → twin `spez_energie_ozon_tab` on M205-17 (E-3); `uv_dosis_min` / `_max` created on M205-10 (the single-source owner per `feat/m205-singlesource`, X-1), not -05.
5. **`temperatur_ozonentfernung_min` + `_max`** (two fills) instead of one: the catalytic row prints a window (60–80 °C), the thermal row a minimum (350 °C); the null cells are hidden by `visible_when` (I-2).
6. **Field `visible_when`: 14 (brief: 12)** — 12 on existing consumer-free / gate-free fields (the Tab.-1 / Tab.-2 fields of M205-04, the Tab.-3 fields of -05, `verbrennung_haltezeit_s`, four -21 twins) + 2 on created fills; the brief's `bromat_bildung` / `ozon_pro_doc` (consumed), `wiederverkeimungsbeurteilung` (gate-bearing — G-6) and the consumed chlorine inputs (C-4) are STAGED. **Section rules: 0 (brief: -10 … -23)** — refused (consumed producers in every B / D) and `verfahren` reaches no worksheet (C-1 / C-2).
7. **Equations 16 new (brief 8 + staged 8):** `-D2 verweildauer` not emitted (F-2: not printed); added `leitorganismen_count`, `gerinne_sensor_verletzungen` (the printed L590–L591 sensor rule), `proben_count`, `chlordosis_verletzungen`, `-17-D4` (Σ generators, the brief's D3) and `-17-D5` (ct × 500); the sample means filter `c_out > 0`; `permeat_design` is in m³/h (÷ 1000; the brief's l/h form would print 15.000 for Straubing).
8. **`leitorganismen` columns:** the Tab.-1 branch carries BOTH G and I with their percentiles and a `wert_typ` choice (J-1) instead of the brief's I-Wert only; `methode_t2`, `text_t3`, `organismus_behoerde`, `perzentil_behoerde`, `perzentil` added; no `override` block (O-2).
9. **`select_one` created: 1 (`bewirtschaftung`)** — the §3.3 restricted case prints two figures by husbandry; the unrestricted rows are duplicated per token (a262e trap 3) and the select stays visible for both (a hidden key would make the fill `keys_missing`).
10. **`membranmodule.verfahren` = prod `mikrofiltration` / `ultrafiltration`** (brief: mf / uf); `chlorungsmittel.mittel` = prod `chlorgas` / `natriumhypochlorit` / `chlordioxid` (the brief's `<clo2 token>` is `chlordioxid`; the -21 twin enum `chlormittel` prints cl2 / naocl / clo2 and is untouched, X-2).
11. **S3_3_LOGRED** (§3.3 log reduction by nutzung × bewirtschaftung) is a table the brief did not list; TABELLE8 split into three tables keyed `aspekt` as the brief proposed; `S4_1_2_3` carries `dosis_max_regel_j_m2` (600) beside `dosis_max_j_m2` (700) (R-5).
12. **Sign-off ids 45 (brief ≈ 14):** the brief's ids kept (G-1 … G-4, R-1 … R-3, F-1 … F-3, X-1, X-2); every further refused / withheld / read item got its own block (G-5 … G-14, R-4 / R-5, E-1 … E-3, C-1 … C-5, D-1, U-1 … U-3, J-1 … J-5, I-1 / I-2, O-1 / O-2).
13. **Inventory line pointers** for Tab. 6 / Tab. 7 were off by one (rows L877–L880 / L1021–L1029) — every line cited here was re-read.

## 9. Self-review

- Every `verbatim_quote` passes the verifier (79/79); every seeded cell is asserted inside its row's span at build time (`inSpan` — a slip throws before any migration is emitted, which is exactly how the two line-offset slips were caught); every cue in `field-configs/m205.ts`, `equations/m205.ts`, the STAGED file and the 45 sign-off blocks was read from the transcript in this session at the cited line (the sign-off citations L289 / L291 / L293 / L599 / L967 / L969 / L1038 were re-derived with `grep -n` after a first pass had them off by 2–8 lines; the seed comments' override_quote lines L784 / L860 / L1038 likewise).
- The emitter guards accepted all 49 entries first time because the rule set was planned against the capture (consumer lists per field, the equation chains, section codes) before emitting; the field-config test pins the refusals (M205-10 B / M205-21 B section rules), the consumer lists of every withheld field, the gate-bearing `wiederverkeimungsbeurteilung`, the `verfahren` / `behandlungsziel` consumer gaps and that every lookup_fill's keys are symbols on the fill's own worksheet.
- G-A3 pinned: every table key column equals the driving prod enum tokens (or the created select's options); the one exception (`kueste_ausreichend`) is pinned as such (E-1).
- The runtime facts were established through the real register contract before the pins; the render test drives the discriminator switch and the Behörde branch through `RegisterEditor` and `evaluateFormula`.
- Prod facts used in the STAGED file (14 + 9 gate ids + md5, 16 equation ids + md5, column lists, `standards.version`, VR strings, labels, `is_required`) come from the in-session read-only queries quoted in §0; no long cell was retyped (archive pattern).
- No `String.replace` with a replacement string on any repo file: the seed module was assembled from three scratchpad parts with `readFileSync` + concatenation; splices used `split/join` in script files (a `node -e` one-liner failed on shell quoting of an en dash and was replaced by a script file — nothing half-applied, the guard threw before writing); the generator scripts live in the scratchpad; `scripts/_probe_m205.ts` was deleted.
- `git checkout -- scripts/reasoning-map/` run before staging (the unit run churns five files there); `.env.local` never read; one commit; author `alvaro.burgos@ekowai.com` verified before committing.
- Reviewed the diff of every modified shared file: only the three registry lines, the sign-off section and the playbook paragraph.

## 10. Concerns (for the controller)

1. **Nothing replaces the 14 contradictory gates yet** — they keep blocking every M205-10 approval until m205-G-1 is ratified; the register is a visible twin beside them, and the seven Ablauf scalars stay required inputs (D-1).
2. **The process switch is 100 % STAGED** (C-1 / C-2 / G-2): `verfahren` reaches no worksheet, and every process worksheet section holds a consumed producer — the §5 win 2 is not delivered by data alone; the owner has to accept the consumer consequence per worksheet.
3. **A Tab.-1 row with a printed "-" or a Tab.-3 class-1 / class-4 row leaves `M205-10-D1` `manual_required`** (J-4) — honest, but an engineer who wants the count must switch such rows to `behoerde` or pick the G column; the footer reason names `ok`.
4. **`log_reduktion_empfehlung` needs `bewirtschaftung` set even for unrestricted use** (the select is always visible; a hidden key would be `keys_missing`) — a one-line "ohne Einfluss" label carries it.
5. **`spez_energie_ozon_tab` shows 16 kWh/kg for Luft** — the standard's arithmetic, not a printed figure (J-3); the label says "Rechenwert".
6. **Scalar-only outputs on M205-17** (`ozon_pro_doc_calc`, `ozonbedarf_kg_h`, `o2_bedarf_kg_h`, `ct_ziel`) are not server-materialised (I-1); the STAGED gates G-11 / G-12 on them would evaluate on the form only.
7. **Bundle growth:** ~26 KB of lifted spans (`Q`) ride in the client bundle via the seed fallback (Task-0 observation; Task 30 measures).
8. **Token/time:** ≈ 0.65 M tokens in, ≈ 60 min wall-clock — above Task 10 (0.57 M / 85 min) in tokens because of the 15-table breadth and the 45-block sheet; below in time because the register contract needed no worked-example arithmetic.

## 11. Residue (what the guideline demands that the worksheets still do not ask)

The percentile evaluation of a sample series against Tab. 1 / Tab. 2 (F-1); the Tab.-3 Anwendungsbereich / Fruchtart selector that would derive the Eignungsklasse (the classes' application lists are seeded as text, not as a picker); a PES target-organism / study picker over Tab. 7 (seeded, not exposed); Tab. 8 as a decision aid (`empfohlenes_verfahren` from `ziel_spurenstoffabbau` / `ziel_brauchwasser_oder_vollentkeimung` — the `zusatzeffekte` row is seeded); the UVT / AFS pre-filtration advice (L482 "Bei Transmissionswerten unter 55 % bis 50 %", L478 "< 20 mg/l, besser … < 5 mg/l" — CR-06 covers AFS ≤ 20 only); the UV-sensor cleaning / calibration intervals as gates (CR-27 exists); §4.1.3.4 bid contents as a checklist; §4.1.4.5 / §4.3.3.4 Arbeitsschutz lists; §4.3.4 "0,1 kWh bis 0,15 kWh je Kubikmeter" (L939) as a range check on `spez_energie_anlage_ozon` (the VR already carries it); §4.3.5 / §4.1.5 cost figures (F-3); §4.3.6 NDMA 5–15 ng/l; the ClO₂ solution strength 1–3 g/l and the chlorite processes (seeded in S4_4_2, no field); Anhang A (feasibility study steps). Each is on the sign-off sheet with its line or listed here.

---

# Fix round 1 (review verdict on `62f6c48`: NEEDS FIXES — two Important items + minors; SR-1 clean)

- **Commit:** see the reply (one commit on top of 62f6c48, Fable trailer; git checkout -- scripts/reasoning-map/ before staging; tree clean after). **Nothing applied to prod** — one additional read-only prod-query.mjs SELECT (the 17 pair scalars: labels / is_required / consumers / VR / unit) is quoted in the new STAGED blocks; the three migrations were regenerated by the Task 0 emitters only.
- **Date:** 2026-09-18 · CLI claude 2.1.260 (no update taken) · model provenance per the commit trailer; the subagent ran on Opus 5.

## IMPORTANT (controller rulings)

1. **Single-source pairs → one D-block each (+ STAGED archive-pattern SQL, nothing applied).** Ruling applied: the register row columns are the N-instance shape and stay; the prod scalars are the retirement candidates. (a) m205-D-2 M205-24 uv_sensor_anzahl_pro_bank (required) / gerinne_zuschaltbar ↔ bestrahlungsgerinne.banks/.sensoren/.zuschaltbar → RETIRE ON RATIFICATION (no footer reproduces a per-bank figure; both consumer- and gate-free). (b) m205-D-3 M205-17 ozongenerator_spannung/_frequenz ↔ ozongeneratoren.spannung_kv/.frequenz_hz → RETIRE ON RATIFICATION (Σ Ozonleistung is the only meaningful footer). (c) m205-D-4 M205-14 porenweite / netto_permeatfluss / transmembrandruck (all required, all consumed by M205-24; transmembrandruck → EQ-08 permeabilitaet d7668bb1-… → M205-24 — the chain is cited) → netto_permeatfluss DERIVED from the footer (permeat_design * 1000 / membranflaeche_sum, new M205-14-D3, consumers kept), porenweite RETIRE ON RATIFICATION, transmembrandruck STAYS until EQ-08 is re-pointed (owner ruling). (d) m205-D-5 M205-21 chlorine scalars ↔ chlorungsmittel → retire the six per-agent facts (clo2_dosis, freies_chlor, kontaktzeit_chlor, chlor_kontaktzeit, restchlor_betrieb, chlormittel) on ratification with a consumer edit of the register to M205-25; keep chlormittel_typ, pH, Gewässer-Restchlor, entchlorungsstufe, clo2_konzentration (facts the register does not carry) — C-4 / G-2 point at it. **M205-17-D3** now reads o2_bedarf_kg_h = ozonbedarf_kg_h * ozon_pro_o2 (the existing M205-17 input, VR eq 10 = L899 "etwa 10 kg Sauerstoff"); the S4_3_3_2 o2_pro_o3_kg column stays for the STAGED fill proposal m205-E-4; test re-pinned (9 × 10 = 90; missing input → manual_required naming ozon_pro_o2); 20260917101120 re-emitted (formula + input_symbols + description).
2. **chlorungsmittel.dosis_ok honours the sand-filtered ClO₂ range.** New enum column sandfiltriert (ja / nein, required, visible_when mittel == 'chlordioxid'; cue L984 "bei sandfiltriertem Abwasser mit geringer Restverschmutzung nur $1 \mathrm{~g} / \mathrm{m}^{3}$ bis $5 \mathrm{~g} / \mathrm{m}^{3}$" quoted in the column comment), derived dosis_min_eff / dosis_max_eff = nested if(mittel == 'chlordioxid', if(sandfiltriert == 'ja', lookup(…dosis_sandfiltriert_…), dosis_min), dosis_min) (the nested if never reads the hidden null cell of a Chlorgas / Hypochlorit row — probed before pinning), dosis_ok = if(dosis >= dosis_min_eff AND dosis <= dosis_max_eff, 1, 0). Re-pinned: 3 g/m³ sand-filtered ⇒ ok, 3 g/m³ not sand-filtered ⇒ violation, a ClO₂ row without the answer is incomplete and does not count; 20260917101110 re-emitted; G-14 (sheet + STAGED) carries the note.

## MINOR

3. **bestrahlungsgerinne.banks** — L590 prints the rule per Bestrahlungsbank ("Je Bestrahlungsbank ist mindestens ein UV-Sensor zur Messung der Bestrahlungsstärke mit unterer Alarmgrenze zur kontinuierlichen Überwachung des Betriebes" / L591 "anzuordnen. …"): new required column banks (≥ 1), sensoren_min = max(banks, if(zuschaltbar == true, 2, 1)) (L591 for the switched case); re-pinned (3 banks / 2 sensors ⇒ violation; switched 1 bank / 1 sensor ⇒ violation; a row without banks is incomplete); register note + field descriptions updated.
4. **Field-rule count:** 14 emitted = **12 active** (M205-04 ×5, M205-18 ×1 UPDATE + 2 created fills, M205-21 ×4) **+ 2 latent** (fkstrep / toc on M205-05, pending until m205-C-3) — §1 table corrected.
5. **Citations:** imprint is L37 (seed header + seed test comment); the HOCl sentence is L969 (seed S4_4_2 comment); the sheet's J-2 already cited L969.
6. **ct_ziel** label "(Cryptosporidien: ca. 500 × E. coli)" and description keep the printed "um ca. das Fünfhundertfache" (L868); ct_ecoli_basis description likewise.
7. **TABELLE4 override_quote = L603 alone** (the bidder states and guarantees the lamp figures); the L533 row head dropped; seed migration re-emitted (one line); verifier **79/79**.

## Counts after the fix round

Field entries unchanged at 49 (37 create + 12 UPDATE); registers 6; lookup_fills 13; field rules 14 (12 active + 2 latent); equations 16 (M205-17-D3 re-bound); sign-off blocks **50** (+D-2 … D-5, +E-4); STAGED file 32 blocks, 0 non-comment lines. Migrations: 20260917101100 (TABELLE4 policy line), 20260917101110 (the two register ui_config JSONs + descriptions), 20260917101120 (D3 formula / inputs / description).

## Raw output

```
pnpm -s tsx scripts/regulation-tables/emit-seed-sql.ts m205 · emit-field-configs-sql.ts m205 20260917101110 · emit-equations-sql.ts m205 20260917101120
  → seed + rollback regenerated · 49 field entries + 0 section entries · 16 equations
pnpm -s tsx scripts/regulation-tables/verify-regulation-tables.ts m205 "<transcript>"
 79/79 quotes verbatim in C:\Users\Ekowai\Desktop\Guidelines\DWA-M-205\DWA-M_205.md
pnpm vitest run --project unit <seed-m205, field-configs-m205, equations-m205, register-m205-leitorganismen, generated-sql-freshness>
 Test Files  5 passed (5)
      Tests  36 passed (36)
pnpm test
 Test Files  287 passed | 1 skipped (288)
      Tests  2684 passed | 1 expected fail | 1 skipped (2686)
   Start at  05:22:13 · Duration  44.11s
pnpm -s typecheck → exit 0 · pnpm -s eslint <6 touched .ts files> → exit 0, no output
```
(2684 unchanged: the fix round replaced pins, net 0.) **The integration harness was not re-run:** this fix round changed emitted DATA only (two register ui_configs, one equation formula bound to an existing input, one table policy quote, labels / notes / sheet text) — no engine, harness seed, or prod-shaped row the DWA-M-205 harness reads; the 76/76 run recorded above stands.

## §8 / §10 additions

- §8.14 **Single-source pairs (fix round 1):** the six registers introduce per-instance columns for facts prod collects once; per the controller ruling nothing is retired now — D-2 … D-5 name the resolution per pair (derive netto_permeatfluss from the footer; retire the rest on ratification; transmembrandruck waits on EQ-08).
- §8.15 **M205-17-D3 reads the existing ozon_pro_o2** (one registered source per fact), not the S4_3_3_2 lookup; the fill of that input is E-4.
- §10.9 **Concern:** four D-blocks plus C-4 / G-2 / D-1 mean the chlorine and membrane worksheets carry twins until the owner rules; the register footers compute today, the scalars still gate M205-24 / -25 inheritance.
