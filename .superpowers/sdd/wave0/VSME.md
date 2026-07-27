# Wave 0 triage — VSME (VSME – Freiwilliger Standard für KMU / EFRAG Voluntary SME Standard)

- standard_id: `ec9216f5-cf8b-482a-8ae9-81af334e7522`  (prod `vadsmshzebefjreqcicl`, READ-ONLY)
- version: `2026-02-01`
- PDF: `C:\Users\Ekowai\Desktop\environmental-reporting service\01_Referenz\VSME Standard.pdf`  (pdfStatus = **text**, 66 pages)
- Page offset (derived from THIS footer, never inherited): **printed = physical (offset 0)**
  — footer reads "Page N of 66" where N == 1-based physical page (physical p.7 → "Page 7 of 66",
  physical p.9 → "Page 9 of 66", physical p.14 → "Page 14 of 66"). Distinct from FLL/138's −2.
- Map: `01-Projects/ekowai-wizard/reasoning-maps/VSME/` (`_index.md` + 86 nodes)
- Tier: **fix-first**

## Node roll-up
nodes=86 · VA=17 · VC=67 · EV=0 · NR=2 · belowVA=69
(sections 40, equations 10, tables 0, CRs 31, documents 2, decision-points 3)

Prod encoding: worksheet_templates ×40, worksheet_sections ×40 (1/worksheet), fields ×154,
equations ×10, compliance_requirements ×31 (9 block / 22 warn), regulation_tables ×0.
Character: a **disclosure-requirement** standard — presence gates (`X IS NOT NULL`) over
engineer-reported figures; almost no printed numeric constants; no ranges/SR-2 selections.

## Findings by defect class
- **phantom-field gate / cross-sheet DEAD GATE (dominant, count = 23):** ALL 31 CRs are hosted
  on the single worksheet **VSME-B01.000**. 23 gate a symbol that is a field on a DIFFERENT
  worksheet. The Wizard evaluator resolves worksheet-locally (`evaluate.ts` /
  reference_wizard_compliance_gates), so a gate like CR-B03-01 (`TotalEnergyConsumption IS NOT
  NULL`, symbol owned by B03.000) never sees its value on the B01.000 host → dead. **9 of the 23
  are severity=block** (CR-B03-01/02/03, CR-B06-01, CR-B07-01, CR-B09-01/02 = 7 block dead; the
  other 2 block are CR-B01-01/02 which ARE reachable). Only 8 gates reachable (CR-B01-01..08,
  whose symbols are genuine B01.000 fields).
  Dead list: CR-B01-09, CR-B03-01, CR-B03-02, CR-B03-03, CR-B03-04, CR-B05-01, CR-B06-01,
  CR-B06-02, CR-B07-01, CR-B07-02, CR-B08-01, CR-B08-02, CR-B08-03, CR-B09-01, CR-B09-02,
  CR-B09-03, CR-B10-01, CR-B10-02, CR-B11-01, CR-C01-01, CR-C06-01, CR-C08-01, CR-C09-01.
- **#22 hand-enterable-derived (count = 15):** all 10 equation outputs (EQ-01..10 — additive
  aggregations of Scope1/2/3, waste mass/volume, fossil-fuel revenue, employee count) are ALSO
  editable `number` fields → derived value overwritable in UI. PLUS a no-equation subclass:
  4× B03.300 GHG-intensity fields (para 31 DEFINES them as GHG/turnover, but NO equation encodes
  it → pure hand-entry) and B07.400 material totals (TotalMassOfMaterialUsed / TotalVolume, no eq).
  All eq verification_status = `imported_unverified`, output_unit NULL, source_quote NULL.
- **cross-sheet producer:** EQ-01 is hosted on B08.000 but its output `NumberOfEmployees` is a
  field on B01.000 (and gated by CR-B01-07 there) — depends on cross-worksheet materialization
  (project_engine_output_materialization); if write-back is worksheet-local the B01 gate/consumer
  never sees the B08-computed value.
- **inequality/enum/verdict-as-producer:** NONE. All equations are clean additive sums; no
  equation declares a `>=`/`<=`/range LHS as output_symbol; no constant mis-modelled as equation.
- **greedy-AND / range-fabrication:** NONE material. Two CRs use `A IS NOT NULL AND B IS NOT NULL`
  (CR-B08-01, CR-B08-02) — benign presence-conjunctions, not fused threshold bands.
- **F-4 var-vs-var non-enforcement:** NONE (no var-vs-var comparisons; all conditions are
  single-symbol presence checks).
- **missing source_quote (SR-1):** `source_quote` NULL on EVERY field/equation/CR; everything
  `imported_unverified`. Benign for VA (VSME has no numeric constants to attest) but blocks the
  mechanical quote-backfill. See dp-vsme-03.
- **section artifact:** worksheet_sections (40) == worksheet_templates (40), i.e. exactly one
  section per worksheet — clean, not an over-emitted per-field artifact.

## Below-VA list (why each is not VA) — 69 nodes
- **23 section nodes VC** — data-collection / narrative worksheets whose disclosure paragraph was
  not individually PDF-read this session, or which have no printed paragraph anchor (B02.100 coop,
  B04.100, B05.100, B06.100, B07.300, B07.400, B08.200, C01–C08.100 narratives, D99). Promote to
  VA on a per-paragraph read.
- **31 CR nodes VC** — `source_quote` null; presence-gates (no printed numeric threshold to attest
  VA against). 23 of these are ALSO dead (finding above), 8 reachable-but-VC.
- **10 equation nodes VC** — additive sums; arithmetic self-evident but no source_quote and no
  printed constant to assert VA (the sum is structural). All #22-flagged.
- **2 document nodes NR** — out-of-library (GHG Protocol, NACE/Reg 1893/2006).
- (17 section nodes ARE VA: B01.000, B03.000, B03.100, B03.200, B03.300, B05.000, B06.000,
  B07.000, B07.100, B07.200, B08.000, B08.100, B08.300, B09.000, B10.000, B11.000, C09.000 —
  each backed by a PDF-confirmed disclosure paragraph quoted this session, offset 0.)

## Dead gates (fully unreachable — count = 23)
Listed above (all CRs except CR-B01-01..08). Each is hosted on VSME-B01.000 while its condition
symbol is owned by another worksheet → worksheet-local resolution can never bind the symbol →
gate silently vacuous. 7 of them are `block`-severity mandatory-disclosure gates that therefore
do not enforce. Fix = re-parent each CR's `worksheet_template_id` to the symbol-owning worksheet
(importer-level), then re-scan.

## Missing-doc dependencies (out-of-library → dependents NR)
- **GHG Protocol Corporate Standard 2004 + Scope-3 Technical Guidance** (doc-ghg-protocol) — B3
  GHG figures defer to it for emission-factor boundaries / Scope-3 categories. On-disk copy exists
  (`01_Referenz/ghg-protocol-revised.pdf`) but NOT in prod library. Caps factor/category numeric
  verification at NR; the B3 disclosure presence-gates stay VC (only *disclosure* is required).
- **Regulation (EC) No 1893/2006 (NACE Rev. 2), Annex I** (doc-nace-1893-2006) — C3.300
  "high climate impact sector" applicability = NACE Sections A–H + L. Caps the C3.300 applicability
  determination at NR; the B1 NACE-code field itself is engineer_input (not NR).
NOT acquisition-blocked overall: both docs cap only factor/sector nodes, not the core gates.

## Tier rationale
**fix-first.** Value layer is trivially VA-capable (disclosure paragraphs PDF-verbatim, offset 0
derived; no numeric tables to source) → NOT acquisition-blocked. But the gate layer is pervasively
dead: 23 of 31 CRs are phantom-field/cross-sheet (7 of them mandatory `block`), so a harness run
over this gate set would pass vacuously — the mandatory disclosure enforcement does not actually
fire. Re-host the 23 CRs onto their symbol-owning worksheets, lock the 15 derived outputs
read-only (add the 4 B03.300 intensity equations), and confirm cross-sheet materialization of
NumberOfEmployees BEFORE any harness. All batched to Alvaro (findings over fixes; zero Wave-0 writes).
