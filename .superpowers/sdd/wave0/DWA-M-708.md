# Wave-0 triage — DWA-M-708 (Merkblatt DWA-M 708, Abwasser aus der Milchverarbeitung, Gelbdruck)

- **Standard id (prod):** `af4be278-ec2b-4fa1-9dee-ba63b3396467`
- **pdfStatus:** text (pdftotext -layout; 103 physical pages / 6322 lines). Page offset derived from THIS pdf's own footer: **printed = physical** (offset 0) through the body.
- **Draft caveat (SR-3):** source is the **Gelbdruck / Entwurf (November 2025, Frist 31.01.2026)** — a DRAFT, not the ratified Weißdruck. Numeric constants are VA against this draft only. See DP-01.
- **Encoding size:** 27 worksheets (M708-01..27), 161 fields, **5 equations**, **14 compliance_requirements**.
- **Map:** `Obsidian/SecondBrain/01-Projects/ekowai-wizard/reasoning-maps/DWA-M-708/` — 61 nodes (27 section, 5 equation, 5 table/value, 14 CR, 6 document, 3 decision-point, +index).
- **Node provenance:** VA 27 · VC 18 · NR 10 · EV 5. data_class: derived 27 · engineer_input 17 · normative-as-input-reference 11 · standard_fixed 5.

## Findings by class

### Phantom-field gate (2) — DEAD GATES
- **REQ-708-08** (M708-12, warn, requires_attestation): condition `mab_vorhanden` — symbol has **no backing field** anywhere in the standard (confirmed via field query). Undefined-symbol → can never be satisfied by data.
- **REQ-708-09** (M708-12, warn, requires_attestation): condition `havariebecken_vorhanden` — **no backing field**. Same dead/undefined-symbol gate.

### Cross-worksheet var-vs-var (F-4) non-enforcement (5)
CR host worksheet ≠ operand worksheet; wizard `evaluate.ts` is worksheet-local (per reference_wizard_compliance_gates), so operands resolve fehlend and the gate likely never fires:
- **REQ-708-01** (host M708-06): measured `c_bsb5,c_csb,afs,c_nh4_n,c_n_ges,c_p,ph_wert` live on **M708-04**; `limit_*` on M708-06.
- **REQ-708-02** (host M708-06): `c_bsb5` on M708-04.
- **REQ-708-03** (host M708-06): `ied_anlage` on **M708-02**, `c_n_ges/c_nh4_n` on **M708-04**, `nges_roh` on M708-06 — three-worksheet spread.
- **REQ-708-04** (host M708-06): `ied_anlage` on M708-02, `c_p` on M708-04.
- **REQ-708-07** (host M708-12): `staub_massenstrom/staub_konzentration/staub_konzentration_trocknung` live on **M708-11**.

### Greedy-AND (1)
- **REQ-708-01**: 7 ANDed `<=` comparisons over operands that are all is_required=false → passes vacuously when any/all operands are null.

### #22 hand-enterable-derived / normative values not materialized (1 group, 8 fields)
- All `limit_*` fields on M708-06 (`limit_bsb5_direkt, limit_csb_direkt, limit_toc_direkt, limit_afs_direkt, limit_nh4_n_direkt, limit_nges_direkt, limit_tnb_direkt, limit_pges_direkt`) are data_type=number, **is_required=false, no default_value** → the printed Table 2 standard_fixed constants are NOT seeded; the engineer re-types them. Verbatim Tab.2 (p.22): BSB5 20 / CSB 100 / TOC 35 / AFS 30 / NH4-N 5,0 / Nges 15 / TNb 18 / Pges 2,0 mg/l. See DP-03.

### Verdict/attestation-as-producer (2)
- **REQ-708-10** (M708-12): `attest_m708_12_req_708_10 == True` — self-referential attestation boolean IS the gate; no source-derived verdict. Field exists.
- **REQ-708-11** (M708-25): `attest_m708_25_req_708_11 == True` — same. Field exists.

### Presence-only gates (weak enforcement) (2)
- **REQ-708-05** (M708-25): `… IS NOT EMPTY AND … IS NOT NULL` — checks fields are filled, not that self-monitoring meets Anhang 3 Teil H.
- **REQ-708-06** (M708-01): 3× `IS NOT NULL` registration gate — does not evaluate the BImSchV threshold, only input presence.

### Missing-doc dependency → NR (3 CR + 6 doc nodes)
- **REQ-708-12** → VO (EU) 2020/741 / LMHV / TrinkwV (water reuse).
- **REQ-708-13** → AwSV / WHG §63.
- **REQ-708-14** → 12. BImSchV.
- Document nodes (all `in_library:false`): `doc-abwv-anhang-3` (SR-1 governing table for Tab.2), `doc-4-bimschv`, `doc-12-bimschv`, `doc-awsv`, `doc-eu-2020-741`, `doc-bvt-ngm`. Every dependent node caps NR/VC (validator invariant #7). Note REQ-708-12/13/14 conditions are well-formed booleans over existing fields — the NR is about the *substance* they defer to, not a phantom field.

## Below-VA list (33 nodes = VC 18 + NR 10 + EV 5)
- **NR (10):** doc-abwv-anhang-3, doc-4-bimschv, doc-12-bimschv, doc-awsv, doc-eu-2020-741, doc-bvt-ngm, section-m708-26, cr-req-708-12, cr-req-708-13, cr-req-708-14.
- **VC (18):** section-m708-03, -12, -13, -15, -16, -19, -24, -25; tab-15-dust; cr-req-708-05, -06, -08, -09, -10, -11; dp-01, dp-02, dp-03.
- **EV (5):** section-m708-07, -08, -10, -18, -27 (worksheets with 0 fields / summary in prod; structural-only, no PDF value read yet).

## Dead gates (2)
REQ-708-08, REQ-708-09 (phantom-field / undefined-symbol; can never fire on data).

## Missing-doc deps (6, all in_library:false)
AbwV Anhang 3, 4. BImSchV, 12. BImSchV, AwSV/WHG, VO(EU)2020/741, BVT-Merkblatt NGM.

## Tier: fix-first
Not acquisition-blocked (the 27 sections + Tab.2 + energy/MAP constants are VA-reachable against the supplied Gelbdruck PDF; the missing docs gate only 3 CRs whose booleans are already well-formed). But there are concrete pre-harness defects: 2 dead phantom-field gates, 5 cross-worksheet non-enforcing gates, 1 greedy-AND, 8 unmaterialized Tab.2 limits, 2 attestation-as-producer gates — these must be fixed/ruled before the harness will meaningfully enforce M708. DP-01 (Gelbdruck-not-final) is an orchestrator hold flag on all value VA.
