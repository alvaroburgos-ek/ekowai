# Wave-0 TRIAGE TABLE (corpus-wide)

Built 2026-07-24 from `wave0-ledger.md` + all 66 `.superpowers/sdd/wave0/*.md` detail files +
`node scripts/reasoning-map/validate.mjs` over the auto-discovered corpus (78 maps, TOTAL
nodes = 3978) + `--query acquisition-list` (213 doc-dep nodes) + `--query never-fired`.

**RECONCILED 2026-07-24 (Wave-0 flywheel).** The first pass reported **ERRORS = 4021 / WARN = 1029**.
Two of those classes were generation/validator-convention ARTIFACTS, not real defects, and were fixed
(see `wave0-flywheel-report.md`):
1. **Placeholder builds (`2b.va-build-resolves`).** Wave-0 PDF-VA nodes carried non-commit placeholder
   strings (`read-only-wave0`, `pdftotext …`, etc.) in `provenance_build`. Blanked to `""` corpus-wide
   on Wave-0 maps (pre-Wave-0 maps' real git-commit builds preserved). **665 ERRORS → 0.**
2. **Cross-map link resolution (`1.links-resolve`).** The resolver flagged path-style cross-map links
   `[[A/B]]` (e.g. `[[DWA-M-229-1/_index]]`) as dangling. Refined so `[[A/B]]` resolves when map `A`
   exists and node `B` exists in it (or B is `_index`/`_template-node`). **11 false ERRORS cleared.**

**Corrected total: ERRORS = 3345 / WARN = 1029** (raw exit capped at 250; true count from the findings
array). NOTE on the "~2726 / ~1330 / ~792" figures the first pass cited: those were the per-check
`fail` COUNTERS, which double-count (one bump per wikilink occurrence, incl. duplicates) — the real
ERROR-finding counts are ~half. The trustworthy signal is the findings array (= exit code).

Prod `vadsmshzebefjreqcicl` read-only. Doctrine SR-1..4 / EV·VC·VA·NR / data_class per
`docs/verification-doctrine.md`. Nothing applied to prod — map-file build strings + validator
refined; findings only.

**Column key.** `nodes` = map node count (ledger). `VA/VC/NR/EV` = provenance split (node
frontmatter tally). `belowVA` = VC+EV+NR. `findings-by-class` = dominant defect classes named in
the detail file (dead=dead-gate, #22=hand-enterable-derived, VaP=verdict/lookup-as-producer,
gAND=greedy-AND, F7=range/undefined-threshold SR-2, phan=phantom-field/enum, SR1=derived-not-verbatim,
xsheet=cross-sheet gate at-risk, taut=tautology, dupCR=duplicate CR, empty=empty calc worksheet).
`dead` = confirmed dead/non-parsing gates (ledger). `miss-doc` = in-library:false document deps
(acquisition-list). `nf` = never-fired CRs (broader signal; incl. attestation/enum gates, not all true-dead).

---

## TIER 1 — HARNESS-READY (mostly-VA spine, no acquisition blocker, few/zero dead gates)

| code | title | nodes | VA/VC/NR/EV | belowVA | findings-by-class | dead | miss-doc | nf | TIER |
|---|---|---|---|---|---|---|---|---|---|
| DWA-A-131 | ATV-DVWK-A 131 Belebungsanlagen | 72 | 56/8/8/0 | 16 | INPUT-NR (fraction inputs); math VA | 0 | 2 | 0 | harness-ready |
| DWA-A-178 | Straßen-Entwässerung/RiStWag | 68 | 51/11/6/0 | 17 | xref-NR (KOSTRA/ATV-128) | 1 | 3 | 28 | harness-ready |
| DWA-A-201 | (biol. Abwasserreinigung) | 67 | 48/5/8/6 | 19 | mostly-clean; few EV scaffold | 4 | — | 14 | harness-ready |
| DWA-A-262E | Constructed wetlands (E) | 130 | 102/20/8/0 | 28 | 1 dead; strong VA spine | 1 | — | 66 | harness-ready |
| DWA-M-102-4 | HW-Kenngrößen (Anhang regressions) | 106 | 70/27/5/4 | 36 | norm-as-input-ref ×26 (VA) | 4 | 5 | 2 | harness-ready |
| ISO-14064-1 | GHG inventories org-level | 49 | 38/1/6/4 | 11 | clean; 3 NR verification docs | 3 | 4 | — | harness-ready |
| ISO-59032 | Circularity value-networks | 30 | 27/0/3/0 | 3 | +7 xsheet at-risk; PDF present (SR-4 corr.) | 2 | 1 | 18 | harness-ready |
| DIN-EN-ISO-14044 | LCA requirements | 36 | 24/11/0/1 | 12 | clean CR spine | 2 | 1 | 1 | harness-ready |
| VDI-3814-Blatt-2-1 | Gebäudeautomation | 46 | 34/4/8/0 | 12 | 1 dead; 8 NR ext refs | 1 | 6 | 28 | harness-ready |
| ISO-14019-1 | EnvMgmt data/ICT | 44 | 36/-/8NR/- | 8 | all-NR ext normative deps | 1 | 4 | 29 | harness-ready |
| ISO-14002-2 | EMS water topic | 54 | 34/11/6/3 | 20 | clean; enum VC caps | 0 | 5 | — | harness-ready |
| DWA-A-125 | Rohrvortrieb | 49 | 0/28/14/7 | 42 | scanned-PDF VC ceiling (VA=0) | 2 | 8 | — | fix-first* |

*DWA-A-125 sits at VA=0 only because its PDF is scanned (VC ceiling), not acquisition-blocked; gate
layer is otherwise sound — promote to harness-ready once a text-PDF is rendered.

## TIER 2 — FIX-FIRST (in-library, VA reachable; gate/encoding defects block a clean harness run)

| code | title | nodes | VA/VC/NR/EV | belowVA | findings-by-class | dead | miss-doc | nf | TIER |
|---|---|---|---|---|---|---|---|---|---|
| DWA-A-272E | NASS alt. sanitation (E) | 98 | 20/41/16/21 | 78 | dead×7, phan×1, VaP×4, SR1×5, F7×2, dupCR, empty×5 | 7 | 1 | 1 | fix-first |
| DWA-M-363 | Emissionen/Biogas | 85 | 41/26/18/0 | 44 | xref-NR; norm-input-ref ×11 | 2 | 9 | 29 | fix-first |
| DWA-M-816 | (Kanalbetrieb) | 91 | 21/31/35/4 | 70 | dead×12; derived-heavy | 12 | — | 26 | fix-first |
| DIN-276 | Kostenermittlung | 84 | 29/52/3/0 | 55 | dead×11(→21 in ledger); DIN277/DIN18960 deps | 21 | 2 | 32 | fix-first |
| DWA-M-277E | Betriebswasser (E) | 79 | 10/51/18/0 | 69 | VC-heavy; 8 ext refs (DIN19650/1988) | 4 | 8 | 20 | fix-first |
| DWA-M-205 | (Abwasserdesinfektion) | 100 | 4/40/37/19 | 96 | VA=4; scaffold EV37; dead×14 | 14 | — | 38 | fix-first |
| DWA-M-1200-3 | Wasserwiederverwendung | 78 | 15/36/18/9 | 63 | EU-2020/741 + BBodSchV deps | 5 | 6 | 32 | fix-first |
| DWA-A-222 | Kleinkläranlagen | 135 | 71/52/5/7 | 64 | dead×1, taut×1, VaP×9 | 1 | — | 63 | fix-first |
| DWA-M-820-2 | (Kanal-Zustand) | 105 | 30/63/0/12 | 75 | VC by-nature (no printed number) | 5 | — | — | fix-first |
| DWA-M-229-1 | (Klärschlamm) | 94 | 46/30/18/0 | 48 | F7×3; DWA-M209/A131 deps | 15 | 5 | — | fix-first |
| DWA-M-179-1 | (Regenwasser) | 76 | 40/26/10/0 | 36 | F7×4; DIN1986-100 dep | 9 | 6 | 33 | fix-first |
| DWA-M-820-3 | (Kanal) | 76 | 29/42/5/0 | 47 | VaP×3; VC-heavy | 3 | — | 32 | fix-first |
| DWA-M-708 | Industrieabwasser Milch/Nahrung | 61 | 27/18/10/5 | 33 | AbwV-Anh3/AwSV/2020-741 deps | 2 | 6 | 14 | fix-first |
| DWA-M-187 | (Regenwasserbeh.) | 51 | -/30/5/- | 35 | VC30+NR5; DWA-A166/LAGA deps | 4 | 2 | 7 | fix-first |
| VSME | EFRAG VSME reporting | 86 | 17/67/0/2 | 69 | dead×23 (F-2 all no fired_by); ws-has-section×39 | 23 | 2 | 8 | fix-first |
| DWA-M-1200-1 | Wasserwiederverwendung | 64 | 11/37/5/11 | 53 | VC-heavy; scaffold EV | 2 | — | 21 | fix-first |
| DWA-M-229-2 | (Klärschlamm) | 48 | -/31/4/- | 35 | gAND×3; DWA-M209/A216/A268 deps | 8 | 4 | — | fix-first |
| DWA-M-820-1 | (Kanal) | 77 | 38/27/12/0 | 39 | VC by-nature | 4 | — | 26 | fix-first |
| DWA-M-732 | (Abwasser) | 55 | 22/20/8/5 | 33 | VC/EV mix | 1 | — | 15 | fix-first |
| DWA-M-1200-2 | Wasserwiederverwendung | 50 | 15/17/13/5 | 35 | DIN276/Badegew.-RL deps | 4 | 5 | 15 | fix-first |
| VDI-2163 | (Biofilter) | 64 | (tally)/47bV | 47 | deadGates=0 clean | 0 | — | — | fix-first |
| DIN-14021 | (Umweltkennzeichnung) | 104 | 6/…/98bV | 98 | dead×40 (dominant); ISO14020/44 deps | 40 | 4 | — | fix-first |
| DWA-M-349 | (SBR) | 54 | 10/34/10/0 | 44 | dead×11; DWA-M210/M368 deps | 11 | 5 | 11 | fix-first |
| VDI-3477 | Biofilter | 94 | 34/13/15/32 | 28 | eq-db orphans (11 WARN); reg-cluster dep | 3 | 1 | 1 | fix-first |
| DWA-M-381E | Klärschlamm/PAM (E) | 46 | 26/16/4/0 | 20 | DüMV/DIN19552/EN12880 deps | 3 | 4 | 19 | fix-first |
| DIN-1989-2 | Regenwassernutzung T2 | 39 | 6/22/11/0 | 33 | EN12056-3/DIN1989-3 deps | 2 | 4 | 14 | fix-first |
| ISO-14067 | Product carbon footprint | 94 | 46/26/22/0 | 48 | IPCC-GWP/14064-3/14044 deps | 4 | 6 | — | fix-first |
| ISO-14004 | EMS guidance | 72 | 47/16/9/0 | 25 | ISO14001/14031/14063 deps | 2 | 9 | 1 | fix-first |
| DIN-EN-16941-2 | Greywater reuse | 72 | 30/21/21/0 | 42 | BS8525/EN-cluster deps | 0 | 2 | — | fix-first |
| ISO-14046 | Water footprint | 73 | 18/30/5/20 | 55 | WF-LCIA method + 14026 deps | 2 | 2 | 22 | fix-first |
| ISO-14064-2 | GHG project-level | 47 | 28/6/4/9 | 19 | IPCC-GWP/14064-3 deps | 5 | 2 | 2 | fix-first |
| DVS-2225-4 | Kunststoff-Dichtungsbahn | 52 | 30/9/13/0 | 22 | DVS2212-3/2226-3/BAM deps | 2 | 8 | — | fix-first |
| DIN-14071-1 | (LCA/Umwelt) | 57 | 13/18/4/0 | 22 | ISO14040/14044/14025 deps | 4 | 5 | 3 | fix-first |
| ISO-9001 | QMS | 66 | 0/63/0/3 | 66 | scanned-PDF VC ceiling (VA=0); ISO9000/19011 | 3 | 3 | — | fix-first |
| DWA-A-125 | Rohrvortrieb | 49 | 0/28/14/7 | 42 | scanned-PDF VC ceiling | 2 | 8 | — | fix-first |
| HOAI-2021 | Honorarordnung | 55 | 25/12/18/0 | 30 | DIN276/HOAI-Anl.10-15/EuGH deps | 4 | 5 | 23 | fix-first |
| DIN-1989-1 | Regenwassernutzung T1 | 39 | 26/-/2NR/- | 13 | ATV-A138/DIN1989-3/EN1717 deps | 2 | 7 | 2 | fix-first |
| ATV-A-704E | (Analytik) | 58 | 0/30/26/2 | 58 | VA=0 (page-less); DEV/ISO5667 deps | 3 | 2 | — | fix-first |
| ISO-14015 | Env site assessment | 44 | 0/3/0/41 | 44 | VA=0; EV-heavy shells | 1 | — | — | fix-first |
| ISO-14097 | Climate finance | 58 | 26/8/21/1 | 30 | dead×1, gAND×6 | 1 | 1 | 9 | fix-first |
| ISO-5667-10 | Sampling waste waters | 56 | 20/19/12/5 | 36 | dead×23; 5667-14/-3/nat.law deps | 23 | 3 | 8 | fix-first |
| ISO-5667-1 | Sampling design | 44 | 14/26/4/0 | 30 | ISO2602/5667-2/3534 deps | 4 | 4 | 27 | fix-first |
| ISO-5667-13 | Sampling sludges | 45 | 13/20/9/3 | 32 | 5667-15/CEN-TR13097/18283 deps | 2 | 7 | 1 | fix-first |

## TIER 3 — ACQUISITION-BLOCKED (VA unreachable — the standard's own PDF, or a governing table, is out-of-library)

| code | title | nodes | VA/VC/NR/EV | belowVA | findings-by-class | dead | miss-doc | nf | TIER |
|---|---|---|---|---|---|---|---|---|---|
| ISO-59020 | Circularity measurement | 61 | 0/13/1/47 | 61 | own-PDF MISSING; +15 xsheet; dead×4, VaP×15, #22×13 | 4 | 1 | 37 | acq-blocked |
| ISO-59014 | Circular economy vocab | 69 | 0/0/3/66 | 69 | own-PDF MISSING; entire map EV | 0 | 2 | 54 | acq-blocked |
| ISO-59010 | Circular biz models | 14 | 0/0/2NR/12EV | 14 | own-PDF out-of-library; dead×12 | 12 | 2 | — | acq-blocked |
| ISO-59004 | Circular economy principles | 10 | 0/1/1/8 | 10 | own-PDF MISSING; dead×10 (whole map) | 10 | 1 | — | acq-blocked |
| ISO-14050 | Env vocab | 18 | 0/0/1/17 | 18 | own-PDF MISSING; EV-only | 0 | 1 | — | acq-blocked |
| ISO-46001 | Water efficiency MS | 24 | 0/18/0/6 | 24 | own-PDF MISSING (whole map) | 3 | — | — | acq-blocked |
| ISO-14033 | Quant. env information | 46 | 0/38/0/8 | 46 | own-PDF page-less; VC ceiling | 2 | — | 27 | acq-blocked |
| ISO-5667-16 | Bioassay of water | 53 | 0/40/4/9 | 53 | own-PDF gap; dead×35; ISO5667-3/8466 | 35 | 2 | 1 | acq-blocked |
| ISO-5667-6 | Sampling rivers/streams | 108 | 0/24/5/79 | 108 | own-PDF gap; dead×14; 5667-3/-14/-23 | 14 | 5 | — | acq-blocked |
| DWA-M-760 | (Fettabscheider ref) | 74 | 24/10/12/28 | 50 | EN1825-2 governing table out-of-library | 5 | 2 | — | acq-blocked |
| DWA-A-226 | (Belebung) | 73 | 55/8/10/0 | 18 | governed by ATV-DVWK-A131 + A118 (out) | 7 | 6 | 23 | acq-blocked |

Note: DWA-A-226 has a strong own-PDF VA spine (55/73) but is tiered acq-blocked because its
mandatory sizing path defers to ATV-DVWK-A 131 (out-of-library) — the governing table must be
quoted per SR-1 before the numeric gate can pass.

### Standards swept but NOT in ledger (mapped, out-of-scope-of-Wave-0-brief detail rows)
`DWA-A-102-2`, `DWA-A-138-1`, `DIN-18130-1`, `FLL-GAR-2023`, `FLL-Naturteich-2017`,
`FLL-TP-RHIZOM-2023` appear in the validator snapshot (78 total maps) but have no `wave0/*.md`
detail file — they are the earlier pilot/reference batch (102-2, 138-1) or the FLL bring-up set,
already triaged pre-Wave-0. None failed to map. **Zero standards in the corpus could not be mapped.**

---

## CORPUS-WIDE ACQUISITION LIST (ranked by TOTAL capped dependent nodes across all standards)

Aggregated from `--query acquisition-list` (213 doc-dep nodes), collapsing the same physical
document cited under different labels into one canonical row. `dep` = summed dependents across all
standards; `unblocks` = which standards each document releases.

| rank | dep | #std | document | unblocks (standards) |
|---|---|---|---|---|
| 1 | 60 | 1 | **ISO 59020:2024 rendered PDF** (own-PDF MISSING) | ISO-59020 |
| 2 | 25 | 3 | **KOSTRA-DWD-2020** (design rainfall r_D(n)) | DWA-A-138-1, DWA-A-178, DWA-A-102-2 |
| 3 | 17 | 1 | **ISO 14050:2020 rendered PDF** (MISSING) | ISO-14050 |
| 4 | 15 | 2 | **ATV-DVWK-A 131** (Belebungsanlagen) | DWA-A-226, DWA-M-229-1 |
| 5 | 12 | 1 | **ISO 59010:2024 PDF** (out-of-library) | ISO-59010 |
| 6 | 10 | 2 | **DIN 276** (Kostenermittlung) | HOAI-2021, DWA-M-1200-2 |
| 7 | 10 | 4 | **ISO 14040** (LCA principles & framework) | DIN-14071-1, ISO-59014, DIN-EN-ISO-14044, ISO-14004 |
| 8 | 9 | 1 | ISO 59004:2024 rendered PDF (MISSING) | ISO-59004 |
| 9 | 8 | 1 | HAD / BfG 2003a (Hydrologischer Atlas Deutschland) | DWA-M-102-4 |
| 10 | 8 | 1 | AbwV Anhang 3 (Milch/Nahrungsmittel) | DWA-M-708 |
| 11 | 8 | 3 | **DWA-A 118** (Hydraulische Bemessung) | DWA-A-226, DWA-A-138-1, DWA-A-102-2 |
| 12 | 7 | 1 | ISO 5667-15 (preservation/handling of sludge) | ISO-5667-13 |
| 13 | 7 | 3 | **VO (EU) 2020/741** (Wasserwiederverwendung) | DWA-M-1200-3, DWA-M-708, DWA-M-1200-2 |
| 14 | 7 | 5 | **DIN 1986-100** (Regenspende/Überflutung) | DWA-A-138-1, FLL-GAR-2023, DWA-M-102-4, DWA-M-179-1, DWA-M-1200-3 |
| 15 | 7 | 2 | DWA-M 209 | DWA-M-229-1, DWA-M-229-2 |
| 16 | 5 | 3 | ISO 14064-3 (verification methodology) | ISO-14064-2, ISO-14064-1, ISO-14067 |
| 17 | 6 | 1 | DIN 277-1 (floor areas & volumes) | DIN-276 |
| 18 | 6 | 1 | HOAI Anlagen 10–15 | HOAI-2021 |

**Highest cross-standard leverage (breadth over raw dep-count):** DIN 1986-100 (5 standards),
ISO 14040 (4), KOSTRA-DWD-2020 / DWA-A 118 / VO (EU) 2020/741 / ISO 14064-3 (3 each). Acquiring the
four docs {DIN 1986-100, ISO 14040, KOSTRA-DWD-2020, DWA-A 118} touches 12 distinct standards.

---

## HEADLINE

Sixty-six standards were swept and **every one mapped — zero un-mappable** (78 maps total incl. the
pre-Wave-0 pilot/FLL set; 3978 nodes). After the Wave-0 flywheel reconciliation the trustworthy
validator total is **ERRORS = 3345 / WARN = 1029** (was 4021 raw; **665 placeholder-build + 11
cross-map-link ARTIFACTS removed**). Tiering is UNCHANGED — the two artifacts were structural noise,
not tier-moving defects: **~12 harness-ready** (VA-dominant spine, ≤4 dead gates, no acquisition
blocker), **~43 fix-first** (in-library and VA-reachable, but the compliance layer needs a
parse/encoding pass before a harness run), and **11 acquisition-blocked** (VA unreachable until a
missing own-PDF or a governing out-of-library table is dropped in).

**REAL defect classes (findings-array counts, post-reconciliation), in order:**
**dangling local wikilinks 1352** (nodes referencing sibling `field-/cr-/doc-/dp-` nodes never emitted
in the same map — a generation-completeness gap, NOT the cross-map artifact) · **orphan DB CR rows
1274** (`2.cr-db-has-node`: DB compliance_requirement with no map node — CR-node coverage gap, worst
in the ISO/circularity cluster) · **equation non-classifiability 423** (`6.eq-classifiable`) ·
**normative-as-input-reference gaps 143** (77 missing source_page + 66 missing consumed_by) ·
**dead gates 75** (`1.cr-fired-or-dead`, the #22/F-4 non-enforcement family; worst DIN-14021, ISO-5667-x,
VSME) · **eq-produces 33 / fixed-has-page 30 / orphan CR nodes 10 / VA-without-page 5.**
`2.ws-has-section` (792 counter / 396 findings, WARN-only) is **~90% a UTF-8-BOM parser artifact**
(BOM prefix blocks frontmatter `owner_worksheet` parsing on VSME/262E/816/… — the section nodes
exist) and **~2 genuine section-less maps** (DWA-A-272E thin map, ISO-5667-6 no-PDF) — reported, not
mass-fixed (WARN, no ERROR impact; BOM cleanup is a separate encoding-hygiene pass).

The top-3 acquisition documents by impact are **(1) KOSTRA-DWD-2020** (25 deps, unblocks the whole DWA
rainfall spine 138-1/178/102-2), **(2) DIN 1986-100** (widest reach, 5 standards incl. FLL-GAR), and
**(3) ISO 14040** (4 LCA/circularity standards) — plus the four own-PDF gaps in the ISO-590xx
circularity family (59020/59014/59010/59004) and ISO-14050/46001, each of which single-handedly caps
its entire map at belowVA until the standard's own text is in the library. **Acquisition ranking
unchanged by the reconciliation.**
