# Wave-0 triage — DWA-A-125 (Rohrvortrieb und verwandte Verfahren)

- **Standard id:** `1c56c9d4-5a43-4715-8446-73e5b89f290f` (prod `vadsmshzebefjreqcicl`, read-only)
- **Source doc:** DWA-A 125, Dezember 2008 (korrigierte Fassung September 2020, 3. Auflage;
  weitgehend identisch DVGW GW 304). PDF `Guidelines\DWA DIN Scribd\DWA-A-125\DWA-A-125.pdf`.
- **pdfStatus = SCANNED (image-only).** `pdftotext -layout` → 78 bytes (no text layer). Pages render
  via `pdftoppm` + OCR via `tesseract -l deu`, but body-page OCR is noisy (equations/tables
  illegible). Per SR-3 + PDF pipeline: no node VA; value/CR nodes cap **VC**, section shells **EV**,
  not-in-library-dependent nodes **NR**.
- **Page offset (derived from THIS pdf's footer, not inherited):** front matter phys p.4→printed 2,
  p.5→3, p.6→4; body phys p.24→22, p.25→23, p.28→26 ⇒ **printed = physical − 2** (double-confirmed).
- **Map:** `Obsidian\...\reasoning-maps\DWA-A-125\` (`_index.md` + 49 node files).

## Node accounting (49 typed nodes + index)
| type | count |
|---|---|
| section | 7 (A125-01..07) |
| equation | 2 (E1 Δa §5.2.3.2; E2 R_min §7.1.6) |
| table | 5 (Tab.1/3/5/9/10) |
| compliance_requirement | 16 (CR-001..016) |
| document (in_library:false) | 8 |
| decision-point | 11 |

**Provenance:** VA 0 · VC 28 · NR 14 · EV 7.
**data_class:** standard_fixed 3 (CR-002/006/011) · standard_range ~12 (Tab-driven CRs/DPs) ·
derived 4 (E1, E2, CR-012, section-05) · engineer_input rest · normative-as-input-reference 0.

## Findings by class
1. **dead / vacuous gate** — **CR-016** `ueberschnitt IS NOT NULL` on a *required* field → cannot fire.
   Misses the §7.2.5 "Regelfall ≤20 mm" range AND the "muss begründet werden" justification (no field).
   Also field guard is `ueberschnitt >= 20` (a floor) vs the standard's "bis 20 mm" ceiling → likely a
   direction bug. → [[dp-125-cr016-deadgate]], [[dp-125-ueberschnitt-range]].
2. **dead / enum-always-true gate** — **CR-014** tests membership in the field's own enum domain →
   always satisfied (never blocks). Real requirement (valid external qualification) unencodable
   without RAL-GZ 961 / DVGW GW 301/302 (not in library) → also NR.
3. **greedy / mis-scoped gate** — **CR-015** `sondergelaende IS NOT NULL AND sondergelaende_genehmigung
   IS NOT NULL`: `sondergelaende` is required (never null → dead sub-condition) and can be `keines`, yet
   the gate demands an approval; and it keys a **block** gate to an **optional** field. →
   [[dp-125-cr015-sondergelaende-scope]].
4. **non-enforcing gate (F-4 var-vs-var)** — **CR-008** only checks the Tab.10 tolerance fields are
   `>0`; never compares them to the measured deviation `abweichung_hoehe_seite` (A125-06). Position
   accuracy is effectively unenforced. → [[dp-125-cr008-nonenforcing]].
5. **phantom-field gate** — **CR-002** `delta_a <= rechtwinkligkeit_zul`, where `rechtwinkligkeit_zul`
   is a hand-entered "Tab.2 value" (both sides typed by the engineer). Same latent shape in the Tab.3
   (`geradheitsabweichung_zul`), Tab.4 (`aussendurchmesser_toleranz`), Tab.5 (`max_abwinklung`)
   "…_zul" fields (those have NO CR at all → collected-but-unenforced limits). → [[dp-125-tab2-phantom]].
6. **#22 hand-enterable-derived** — `delta_a` is produced by **E1** yet is ALSO an editable A125-02
   field. Plus the Tab.2/3/4/5 "…_zul" lookups and the Tab.9 verdict `mlm_vortriebslaenge_zul` are
   table-derived values encoded as hand-entry.
7. **verdict-as-producer** — **CR-007** keys on `mlm_vortriebslaenge_zul == true`, a hand-entered
   conformity verdict; the Tab.9 grid is unencoded.
8. **partial-enforcement** — **CR-006** enforces only the 50 m spacing, not the depth/Tab.8 data
   completeness in its own quoted text.
9. **missing-doc dependency (NR)** — see below.

## Below-VA list (every value/CR/eq node — VA=0)
Root cause = **scanned source (no legible verbatim read)**. All 28 VC nodes + all 14 NR nodes are
below VA. VC value/CR nodes carry the encoding's `source_quote` (convenience extraction = VC class per
SR-3), page *located* via footer offset but not eye-legible. Promote to VA only after a text-layer
re-source or a proof-read OCR pass (ruling: [[dp-125-scanned-va-ceiling]]).

## Dead gates (count = 2 hard, +2 soft)
- **CR-016** — hard dead (null-check on required field).
- **CR-014** — hard dead (enum membership in own domain).
- (soft) **CR-015** first conjunct always true; **CR-008** never enforces its intended comparison
  (non-enforcing rather than strictly dead).

## Missing-doc dependencies (all in_library:false → dependents NR)
Checked `standards` — ZERO of the referenced externals are in the library.
- **ATV-A 161 / DVGW GW 312** — statical basis, §7.2.4 → **CR-009 NR** (+ A125-05 statical chain,
  CR-012 ceiling). The load-bearing C-class.
- **DIN EN 14457** — shear-load proof, §5.3.3.3 → CR-003 NR.
- **DIN 4020** + **DIN 18319** — Baugrunderkundung/Klassifizierung, §7.1.3 → CR-006 NR.
- **RAL-GZ 961** + **DVGW GW 301/302** — contractor qualification, §7.1.15 → CR-014 NR.
- **DIN EN 12889** — parent EN (structure alignment); global ref → dependents VC.
- **DIN EN 681-1** — outer-seal elastomer (single-option enum), §5.3.8 → VC/NR.
- **DIN EN 1610** — Dichtheit ref, §5.3.3.1 → CR-004 VC.

## Tier: **fix-first**
Structurally complete + mostly reachable, but a cluster of gate defects (CR-016 dead, CR-014 dead,
CR-015 mis-scoped, CR-008 non-enforcing, CR-002 phantom-field, several #22) must be fixed before a
harness run. Not acquisition-blocked overall (only the A125-05 statical sub-chain is gated on ATV-A
161/GW 312). No node reaches VA until the scanned source is replaced by a text-layer render or
proof-read — so a VA-harness pass is also blocked on re-sourcing, but the actionable near-term work is
the gate fixes → **fix-first**.
