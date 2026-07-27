# Wave 0 triage — DWA-M-816

**Standard.** DWA-M-816 (Oktober 2021) — "Projektbewertung betrieblicher Ersatz-
und Erneuerungsinvestitionen auf Basis der dynamischen Kostenvergleichsrechnung —
eine Arbeitshilfe für die Praxis". Prod standard_id `474fdd9b-d351-4472-b2e8-c2c5f52e1f1b`.
Reasoning map: `Obsidian/SecondBrain/01-Projects/ekowai-wizard/reasoning-maps/DWA-M-816/`.

**pdfStatus.** `text`. PDF `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-816\DWA-M_816.pdf`
(113 physical pages). Page offset derived from THIS pdf's footer: **printed =
physical − 2** (physical 4→printed 2; physical 9→printed 7; physical 102→printed 100).

**Encoding shape.** 30 worksheets (M816-01..30), 190 fields, 30 equations, 26 CRs.
This is a calculation Merkblatt (finanzmathematik: RBF recursion, Barwert, Duration,
IRR, Teilreplikation). Core method (ARBF) is fully printed in Anhang A; the numeric
INPUTS are engineer/project cost data, not printed constants — so there is almost no
`standard_fixed` value surface to VA-attest, unlike a sizing standard.

**Node counts.** 91 total = 30 section + 30 equation + 26 CR + 4 document + 1 table(Bild 7).
Provenance: VA 21, VC 31, EV 35, NR 4. data_class: derived 56, engineer_input 30,
normative-as-input-reference 5.

**PDF anchors confirmed by-eye this session (VA basis).**
- §3.1 "5 Schritte" (Kostenermittlung / Finanzmath. Aufbereitung / Kostengegenüber-
  stellung / Empfindlichkeitsprüfungen / Gesamtbeurteilung) — printed p.17. Also
  cites DWA-M 811 and KVR-Leitlinien (DWA 2012b).
- Anhang A.1 Gl.(A.1) `RBF0(n;q)=(1-1/q^n)/(q-1), q≠1` + recursive RBF1..RBF5 bis
  Grad k=5 — printed p.100. Encoded formulas match verbatim.
- §4.2.2 durationsabhängige Abzinsung, Bild 7 (Bundesbank Abzinsungssätze bis 50 J,
  Datenquelle DEUTSCHE BUNDESBANK), worked iDUR=3,68% @ DUR 15 J, Gl.(5c) — printed p.32–34.
- §4.4.2 Teilreplikation Gl.(7) `nTR=(nA-nB)·nFin/nB` — printed p.39.

---

## FINDINGS (by defect class)

### F-EV — wholesale imported_unverified (severity: gates VA everywhere)
- ALL 30 equations: `verification_status=imported_unverified`, `source_quote=NULL`.
- ALL 26 CRs: `audit_status` unset, most `source_quote=NULL`.
- Consequence per SR-3: value/verdict nodes cap at EV unless a per-node printed
  quote is captured. 10 equations + 10 CRs were re-quoted this triage → VA; the
  remaining 20 eq + 15 CR stay EV. **Gap named:** per-node PDF quote not yet written
  back to the DB `source_quote` column (read-only wave 0 — no prod writes).

### #22 — hand-enterable-derived (DOMINANT defect)
Derived engine outputs are encoded as editable `number` fields (data_type=number,
no read-only flag) across every calc worksheet. Examples (worksheet: symbol):
- M816-11: `rbf_0`, `rbf_k`, `rbf_inflation_arg` (RBF recursion outputs, hand-enterable)
- M816-12: `bw`, `z_t`, `Z`, `BW`  | M816-13: `BW_linear`, `Z_t_linear`
- M816-14: `BW_quadratic`  | M816-16: `BW_inflation`, `q_DUR`
- M816-17: `bw_1`, `bw_2`  | M816-19: `duration`, `duration_years`, `DUR`
- M816-20: `i_dur`, `q_dur`  | M816-22: `n_tr`, `dur_tr`, `bw_tr`, `n_TR`, `DUR_TR`, `BW_TR`
- M816-23: `rbw_t`, `Z_AFA`, `BW_AFA`, `BW_ZINS`  | M816-24: `irr_q_star`, `q_star`
- M816-25: `pbw_alternative`, `PBW_total`  | M816-27: `delta_pbw`
Every one is an equation `output_symbol` also materialised as an input field. Fix =
mark derived, single-source via the registered equation.

### phantom scratch fields (duplicate symbol-name inputs)
Each calc worksheet re-declares the equation's own input_symbols as standalone
hand-enterable `number` fields with `consumer_worksheets=null` and mostly
`is_required=false` — pure scratch, not project inputs:
- uppercase `Z`,`t`,`n`,`BW`,`q`,`p`,`m` on M816-12..17,19,22,23
- `RBF_0`,`RBF_1`,`RBF_2`,`RBF_3`,`RBF_4`,`RBF_5`,`RBF_k` on M816-11/15/16/19/22/23
- `AFA`,`a`,`z_K`,`AHK`,`ABK`,`RBW_t`,`p_v` on M816-22/23; `q_star`,`BW_Erloese`,
  `BW_Aufwendungen` on M816-24
These bloat the field count (190) and confuse gate resolution. Fix = drop or hide;
the equation `requires::` chain should reference the real upstream field, not a
same-worksheet duplicate.

### DEAD GATES (CR with no fired_by / no reachable-fail — condition not machine-evaluable)
12 CRs whose `condition` is prose, a compute-assertion, or `manual_review`:
- REQ-06 "for every process: type is set and c_k present per type" (prose)
- REQ-07 "BW computed via RBF_k recursion per Anhang A" (compute-assertion)
- REQ-08 "discounting_method consistent across all alternatives" (cross-alt, per-ws engine can't see)
- REQ-10 "duration computed via Gl. (5c) per process" (compute-assertion)
- REQ-12 "manual_review for processes with u > 1" (manual_review)
- REQ-16 "manual_review per project context" (manual_review)
- REQ-17 "manual_review for revenue-generating projects" (manual_review)
- REQ-20 "manual_review for large/late reinvestments" (manual_review)
- REQ-21 "pbw_alternative == sum(bw) per alternative" (compute-assertion over hand-entered field)
- REQ-23 "annual Z(t) profile compiled per alternative" (prose)
- REQ-24 "manual_review of USt treatment" (manual_review)
- REQ-25 "manual_review per KAG" (manual_review)
None can fire a block/warn from data → dead. Several are `requires_attestation=true`
(REQ-12/16/17/20/24/25) so should convert to explicit attestation-boolean gates.

### verdict / argmin-as-producer
- REQ-22 `vorteilhafteste_alternative == argmin(pbw_alternative)` — asserts a derived
  ranking equality over `vorteilhafteste_alternative`, which is a hand-entered `text`
  field (M816-27). The verdict is both the producer and the gate subject → cannot
  enforce; the ranking must be engine-derived and read-only before this gate is real.

### greedy-AND
- REQ-13 `IF n_a>=n_b THEN n_observation_period==n_a AND IF n_b>=n_a THEN
  n_observation_period==n_b` — two cross-implications ANDed in one condition
  (also on M816-04 while the referenced fields `n_a`,`n_b` live on M816-08). Split
  into two gates; resolve the cross-worksheet field references.

### cross-worksheet / phantom-field gate
- REQ-26 (attached to M816-28) gates on `gesamtbeurteilung IS NOT EMPTY`, but
  `gesamtbeurteilung` is a field on **M816-30**, not M816-28 → on the host worksheet
  it is a phantom field; the gate resolves against a symbol not present locally.
- REQ-13 (M816-04) references `n_a`/`n_b`/`n_observation_period` (all on M816-08) —
  same cross-worksheet-reference class.

### range / SR-2
- No `standard_range` value nodes: M-816 gives methods and formulae, and the one
  fixed rate it names ("fester KVR-Zinssatz 3 %", enum `kvr_flat_3`) is an option
  label, not a system-picked point value. No F-7 selection-record findings.
- `discounting_method` enum offers `duration_dep` / `kvr_flat_3` / `company_fixed`
  / `nominal_zero` — an explicit engineer choice (SR-2 compliant, no silent pick).

### missing-doc dependencies (out-of-library → dependents NR)
- [[doc-kvr-leitlinien-2012b]] — KVR-Leitlinien (DWA 2012b); governs the
  `kvr_leitlinien_classic` / `kvr_flat_3` method branch.
- [[doc-bundesbank-abzinsung]] — Deutsche Bundesbank monthly §253-HGB Abzinsungs-
  zinssätze; governing rate TABLE for `duration_dep` / `i_dur` / `q_dur` (Bild 7 is
  only an illustrative snapshot). REQ-09 recommends it.
- [[doc-dwa-m-811]] — betriebswirtschaftliche Begriffe (term reference, §3.1).
- [[doc-kag-hgb]] — KAG der Länder + HGB §253/§6 USt (REQ-24/25, §4.5.3, §6).

---

## BELOW-VA LIST (nodes not at VA, with reason)
- **35 EV nodes** — 20 equations not per-node requoted (Gl.2a/2b/3a/3b/4a/4b/5a/5b/
  6a/6b/6a_TR/6b_TR/6c/8a/8b/9/10a/10b/10c/11) + 15 CRs (REQ-06,07,08,10,12,15,16,
  17,20,21,22,23,24,25 + partial). Reason: `source_quote=NULL`, imported_unverified;
  SR-3 needs a per-node printed quote to lift. The finanzmath is PDF-consistent
  (recursion + polynomial-Barwert coefficients printed in §4.1/Anhang A) → these are
  VA-CAPABLE, not source-blocked; they are EV only for lack of a written quote.
- **31 VC nodes** — 30 section containers (structural, no value to attest) + REQ-04
  (`alternative_count>=2`; parseable but not PDF-requoted this pass).
- **4 NR nodes** — the out-of-library documents above.

## DEAD GATES (count = 12)
REQ-06, REQ-07, REQ-08, REQ-10, REQ-12, REQ-16, REQ-17, REQ-20, REQ-21, REQ-23,
REQ-24, REQ-25.

## TIER
**fix-first.** Structurally complete and the core method is fully PDF-attestable
(ARBF Anhang A, §4.1/§4.2.2/§4.4.2). NOT acquisition-blocked — the 4 missing docs
gate only the KVR-classic / Bundesbank-rate-value branch, not the printed ARBF core.
Before a harness run is meaningful, fix: (1) #22 hand-enterable-derived across all
calc worksheets, (2) drop phantom scratch fields, (3) repair/convert the 12 dead
gates (attestation-booleans for the manual_review ones), (4) REQ-22 verdict/argmin
producer, (5) REQ-13 greedy-AND split + cross-worksheet field refs, (6) REQ-26
cross-worksheet phantom field. Then per-node source_quote backfill lifts the 35 EV
finanzmath nodes to VA.
