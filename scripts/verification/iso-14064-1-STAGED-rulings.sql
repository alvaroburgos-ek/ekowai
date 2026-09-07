-- ============================================================================
-- STAGED RULINGS — ISO-14064-1 (DIN EN ISO 14064-1:2019-06). WRITTEN, NOT APPLIED.
-- Nothing in this file is executed by apply-pack.mjs; every statement is COMMENTED OUT and carries a
-- "☐ RATIFIED" marker that Alvaro ticks before anything is run. Each block carries its evidence quote
-- (GERMAN column of C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\ISO-14064-1\ISO-14064-1-Deutsch.md,
-- printed page from the rendered PDF's own footers, printed page = PDF page - 4) and its rollback inverse.
--
-- CONTEXT THAT MAKES THESE BLOCKS DIFFERENT FROM THE GUIDANCE STANDARDS IN THIS PASS: ISO 14064-1 IS a
-- requirements standard. It uses "muss/müssen" (shall), "sollte" (should) and "darf" (may) deliberately and
-- consistently. So severity=block IS defensible here — but only on a "muss/müssen", and only inside the
-- scope predicate the sentence prints. The audit below found 23 of 25 gates at severity=block; 6 of those
-- 23 are NOT anchored on an unconditional "muss".
--
-- Prod shape audited: 8 worksheets · 49 fields · 4 equations · 25 gates (23 block, 2 warn).
-- ============================================================================


-- ============================================================================
-- A. SEVERITY / SCOPE — block gates that the source does not carry unconditionally
-- ============================================================================

-- ---- A-1  CR-015 (ecd9f5c0-3bc3-44e5-88dc-bf3003107345, W07) — BLOCK anchored on PERMISSIVE text
-- Condition: reduzierungsinitiative IS NOT NULL   Severity: block   Clause: 7.1
-- EVIDENCE (§7.1, printed p.31):
--   "Die Organisation darf THG-Reduzierungsinitiativen planen und umsetzen, um THG-Emissionen zu reduzieren
--    oder zu verhindern oder den Entzug von Treibhausgasen zu verbessern."
--   "Falls eine solche Initiative umgesetzt wird, sollte die Organisation Unterschiede der THG-Emission oder
--    des Entzugs von Treibhausgasen durch die Umsetzung von THG-Reduzierungsinitiativen quantifizieren."
-- FINDING: "darf" (may) + "sollte" (should). There is no obligation to HAVE a reduction initiative at all,
--   so an organisation with none can never satisfy this gate — the printed case "no initiative" is
--   UNREACHABLE. The field itself is already is_required=false, which directly contradicts severity=block.
--   This is the single worst block-on-soft-text in the standard.
-- PROPOSAL: block -> warn.
--   ☐ RATIFIED
--   -- update public.compliance_requirements set severity='warn' where id='ecd9f5c0-3bc3-44e5-88dc-bf3003107345';
--   -- rollback: update public.compliance_requirements set severity='block' where id='ecd9f5c0-3bc3-44e5-88dc-bf3003107345';


-- ---- A-2  CR-016 (f0e423ec-d143-41f8-a491-c94db0ae1a2f, W07) — BLOCK missing its scope predicate
-- Condition: emissionsgutschrift IS NOT NULL   Severity: block   Clause: 7.2
-- EVIDENCE (§7.2, printed p.33):
--   "Wenn die Organisation erworbene oder entwickelte Emissionsgutschriften in Berichten anführt, müssen die
--    Emissionsgutschriften separat zu den THGReduzierungsinitiativen aufgelistet werden."
-- FINDING: the "müssen" fires ONLY inside "Wenn die Organisation ... anführt". The encoded gate is
--   unconditional, so an organisation that reports no offsets (the common case) is blocked. Field is
--   is_required=false — same required/enforcement contradiction as A-1.
-- PROPOSAL: block -> warn (the app has no predicate grammar for "if the organisation reports offsets"; see D-1).
--   ☐ RATIFIED
--   -- update public.compliance_requirements set severity='warn' where id='f0e423ec-d143-41f8-a491-c94db0ae1a2f';
--   -- rollback: update public.compliance_requirements set severity='block' where id='f0e423ec-d143-41f8-a491-c94db0ae1a2f';


-- ---- A-3  CR-017 (e2369459-0b07-46dd-b25b-41467b82e659, W07) — BLOCK missing its scope predicate
-- Condition: reduzierungsziel IS NOT NULL AND zielart IS NOT NULL   Severity: block   Clause: 7.3
-- EVIDENCE (§7.3, printed p.33):
--   "Die Organisation darf Ziele für die Reduzierung von THG-Emissionen festlegen."
--   "Wenn die Organisation ein Ziel im Bericht angibt, müssen die folgenden Informationen spezifiziert und
--    angegeben werden: - der Zeitraum, auf den sich das Ziel bezieht, einschließlich des Zielbezugsjahrs und
--    des Zielabschlussjahrs; - die Art des Ziels (Intensität oder absolut); - im Ziel enthaltene
--    Emissionskategorie; - die Menge der Reduzierung und ihre Einheit in Übereinstimmung mit der Art des Ziels."
-- FINDING (two defects in one gate):
--   (a) "darf ... festlegen" + "Wenn ... angibt" — unconditional block makes the no-target case unreachable;
--   (b) the printed list has FOUR items; only two of them exist as fields (reduzierungsziel, zielart). The
--       target period (Zielbezugsjahr / Zielabschlussjahr), the included emission category and the amount +
--       unit of the reduction are NOT encoded at all (see C-2).
-- PROPOSAL: block -> warn.
--   ☐ RATIFIED
--   -- update public.compliance_requirements set severity='warn' where id='e2369459-0b07-46dd-b25b-41467b82e659';
--   -- rollback: update public.compliance_requirements set severity='block' where id='e2369459-0b07-46dd-b25b-41467b82e659';


-- ---- A-4  CR-011 (98c46a4e-79f0-40fc-8ed1-f407c20dedca, W05) — BLOCK over a MIXED muss/darf obligation
-- Condition: biogen_co2 IS NOT NULL   Severity: block   Clause: 6.3 / Anhang D
-- EVIDENCE (§6.3, printed p.29): "Die Organisation muss biogene Emissionen und den biogenen Entzug nach
--   Anhang D quantifizieren."
-- EVIDENCE (Anhang D, NORMATIV, printed p.71):
--   "Anthropogene biogene $\mathrm{CO}_{2}$-Emissionen und Entzug müssen quantifiziert und getrennt von
--    anthropogenen Emissionen angegeben werden."
--   "Nicht-anthropogene biogene Treibhausgasemissionen und Entzug von $\mathrm{CO}_{2}$ durch
--    Naturkatastrophen (z. B. Waldbrände oder Insektenbefall) oder natürliche Entwicklung (z. B. Wachstum,
--    Zersetzung) dürfen quantifiziert und müssen gegebenenfalls separat angegeben werden."
-- FINDING: Anhang D splits the obligation — anthropogenic biogenic CO2 is "müssen", non-anthropogenic is
--   "dürfen" (may). The single field biogen_co2 (is_required=false) collapses both, and the block gate
--   enforces the "dürfen" half too. Keep block, but the field must be split, or the gate must be predicated
--   on the anthropogenic half only.
-- PROPOSAL (two options — engineer selection, SR-2 style, do NOT auto-pick):
--   ☐ RATIFIED — option 1: split the field into biogen_co2_anthropogen (required, block) and
--      biogen_co2_nicht_anthropogen (optional, no gate).
--   ☐ RATIFIED — option 2: keep one field, downgrade CR-011 block -> warn until option 1 is built.
--   -- option 2: update public.compliance_requirements set severity='warn' where id='98c46a4e-79f0-40fc-8ed1-f407c20dedca';
--   -- rollback: update public.compliance_requirements set severity='block' where id='98c46a4e-79f0-40fc-8ed1-f407c20dedca';


-- ---- A-5  CR-012 (cdf61e8e-ded4-4ff2-809c-83c393497e05, W05) — BLOCK missing its scope predicate
-- Condition: strom_ansatz IS NOT NULL AND E_el IS NOT NULL   Severity: block   Clause: 6.3 / Anhang E
-- EVIDENCE (§6.3, printed p.29): "Die Organisation muss Emissionen oder den Entzug von importiertem
--   elektrischem Strom, der von der Organisation verbraucht wird, und von durch die Organisation
--   produziertem und exportiertem elektrischem Strom nach Anhang E quantifizieren."
-- FINDING: the "muss" is real, but it is scoped to imported electricity that IS consumed. An organisation
--   with no imported electricity (e.g. fully self-generating, or a pure-transport boundary) cannot satisfy
--   the gate. Both fields are is_required=false — required/enforcement contradiction again.
-- PROPOSAL: keep block but add the presence predicate once the grammar exists (D-1); until then warn.
--   ☐ RATIFIED
--   -- update public.compliance_requirements set severity='warn' where id='cdf61e8e-ded4-4ff2-809c-83c393497e05';
--   -- rollback: update public.compliance_requirements set severity='block' where id='cdf61e8e-ded4-4ff2-809c-83c393497e05';


-- ---- A-6  CR-025 (bdf99072-7a80-4a85-ac0d-f6827235bbc5, W01) — BLOCK anchored on a RATIONALE sentence
-- Condition: grundsaetze_eingehalten == true   Severity: block   Clause: 4
-- The gate's stored source_quote quotes §4.1: "Die Anwendung von Grundsaetzen ist wesentlich, um
--   sicherzustellen, dass treibhausgasbezogene Angaben den tatsaechlichen Verhaeltnissen entsprechend
--   beruecksichtigt werden." — that sentence is a RATIONALE, it contains no modal verb at all.
-- The obligation actually lives one level down, in §4.2-§4.6, in the normative passive
--   (§4.3, printed p.23): "Alle relevanten Treibhausgasemissionen und entzogenen Mengen von Treibhausgasen
--   sind einzubeziehen."
-- FINDING: severity=block is defensible, but the EVIDENCE is mis-quoted. Re-anchor the source_quote.
--   ☐ RATIFIED
--   -- update public.compliance_requirements set source_quote='§4.3: "Alle relevanten Treibhausgasemissionen und entzogenen Mengen von Treibhausgasen sind einzubeziehen." (§4.1-§4.6, printed p.23)' where id='bdf99072-7a80-4a85-ac0d-f6827235bbc5';
--   -- rollback: restore the previous source_quote (kept verbatim in the 2026-09-05 export
--   --   scratchpad/fields-ISO-14064-1.json, gates[] entry id bdf99072-7a80-4a85-ac0d-f6827235bbc5).


-- ============================================================================
-- B. DUPLICATE / SUBSET GATES
-- ============================================================================

-- ---- B-1  CR-023 is a STRICT SUBSET of CR-022 (both W08, both severity=block)
--   CR-022 (61738b95-e926-4689-8dc2-d34b946f15eb): konformitaetserklaerung IS NOT NULL AND gwp_quelle IS NOT
--     NULL AND E_co2e_total IS NOT NULL
--   CR-023 (47e5ead6-c1e8-4786-a89d-341bd72d04e2): gwp_quelle IS NOT NULL
-- FINDING: CR-023 can never fail without CR-022 also failing. It is redundant enforcement on the same
--   worksheet; the engineer sees two block messages for one missing value. CR-023 does carry the finer
--   §9.3.1 t) quote, so the cheap fix is to keep CR-023 (fine-grained, correct clause) and shrink CR-022 to
--   the two remaining conjuncts.
-- PROPOSAL:
--   ☐ RATIFIED
--   -- update public.compliance_requirements set condition='konformitaetserklaerung IS NOT NULL AND E_co2e_total IS NOT NULL' where id='61738b95-e926-4689-8dc2-d34b946f15eb';
--   -- rollback: update public.compliance_requirements set condition='konformitaetserklaerung IS NOT NULL AND gwp_quelle IS NOT NULL AND E_co2e_total IS NOT NULL' where id='61738b95-e926-4689-8dc2-d34b946f15eb';


-- ============================================================================
-- C. MISSING GATES / MISSING FIELDS for printed hard requirements
-- ============================================================================

-- ---- C-1  §6.3 fixes the GWP TIME HORIZON at 100 years — nothing in the encoding carries it
-- EVIDENCE (§6.3, printed p.29): "Das aktuelle Treibhauspotential nach IPCC sollte angewendet werden. Falls
--   nicht, muss dies begründet werden. Der Zeitrahmen des Treibhauspotentials muss 100 Jahre betragen.
--   Andere Treibhauspotentialzeitrahmen können verwendet werden, müssen jedoch separat angegeben werden."
-- FINDING: this is the ONLY printed NUMERIC hard requirement in the whole normative body of ISO 14064-1
--   ("muss 100 Jahre betragen") and it is not encoded — no field, no gate. The existing gate CR-010
--   (b0116dd4-5a92-4b8e-ab1f-fa9a078eb1f7) tests "GWP_gas > 0" instead, which is a source-less sanity check:
--   the value 0 appears nowhere in the standard, so the threshold is INVENTED (harmless but unattested), and
--   a presence/positivity test HIDES the printed 100-year limit behind it.
-- PROPOSAL: add field gwp_zeitrahmen (number, unit "a", default 100, is_required=true) on W05 plus
--   gate CR-026 severity=block, condition "gwp_zeitrahmen == 100 OR gwp_zeitrahmen_abweichung_begruendung
--   IS NOT NULL"; re-anchor CR-010 onto the IPCC-source sentence.
--   ☐ RATIFIED  (needs a field insert + a compliance_requirements insert; statements deliberately not
--                pre-written here because the insert must go through the importer, not a hand-edit)


-- ---- C-2  §7.3 prints FOUR mandatory target attributes; only two are encoded
-- EVIDENCE (§7.3, printed p.33) — full list quoted in block A-3 above.
-- MISSING FIELDS: Zielbezugsjahr, Zielabschlussjahr, im Ziel enthaltene Emissionskategorie,
--   Menge der Reduzierung + Einheit.
--   ☐ RATIFIED  (importer change, not a hand-edit)


-- ---- C-3  §6.4.2 prints a PROHIBITION that has no gate
-- EVIDENCE (§6.4.2, printed p.31): "Die Organisation darf keine Neuberechnung ihrer basisjahrbezogenen
--   Treibhausgasbilanz durchführen, um Änderungen des Produktionsniveaus der Einrichtung einschließlich der
--   Stilllegung oder Inbetriebnahme der Einrichtungen zu berücksichtigen."
-- FINDING: "darf keine" is a hard prohibition (shall not). CR-014 only checks that a recalculation procedure
--   EXISTS; nothing prevents the forbidden recalculation trigger from being recorded.
--   ☐ RATIFIED  (needs an enum of recalculation triggers restricted to §6.4.2 a)/b)/c) + a block gate)


-- ---- C-4  §5.1 requires the consolidation approach to be CONSISTENT with the intended use — no gate
-- EVIDENCE (§5.1, printed p.24): "Der Ansatz der Zusammenführung muss mit der vorgesehenen Nutzung der
--   THG-Bilanz konsistent sein."
-- FINDING: both operands exist as fields (zusammenfuehrungsansatz on W02, vorgesehene_nutzung on W01) but no
--   gate relates them. Machine-checkable consistency is out of reach; an attestation gate is not.
--   ☐ RATIFIED  (add CR-027, severity=warn, requires_attestation=true)


-- ---- C-5  §8.3 requires a JUSTIFICATION when uncertainty is only assessed qualitatively — no field
-- EVIDENCE (§8.3, printed p.35): "Wenn eine quantitative Abschätzung der Unsicherheit nicht möglich oder
--   kostenintensiv ist, muss dies begründet und eine qualitative Bewertung durchgeführt werden."
-- FINDING: the single free-text field unsicherheitsbewertung carries both the assessment and (implicitly)
--   the justification; the conditional "muss ... begründet" is not separately enforceable.
--   ☐ RATIFIED  (add field unsicherheit_qualitativ_begruendung)


-- ---- C-6  §5.1 permits OTHER consolidation approaches — the enum closes them out
-- EVIDENCE (§5.1, printed p.24): "Die Organisation darf andere Zusammenführungsansätze anwenden, wenn
--   mehrere Berichtsziele und Anforderungen z. B. durch das THG-Programm, rechtswirksame Verträge oder
--   verschiedene Arten von vorgesehenen Nutzern festgelegt sind."
-- FINDING: gate CR-002 (3e77be6d-1bbf-49ce-9ab5-c13a1f67924b) is a closed IN-list over the three encoded
--   enum values, so the printed "andere Zusammenführungsansätze" case is UNREACHABLE. Every encoded enum
--   value IS covered by the IN-list (no uncovered-value defect); the defect is the missing fourth option.
-- PROPOSAL: add enum value "andere" (+ a free-text justification field), then widen CR-002.
--   ☐ RATIFIED  (enum edit -> importer)


-- ============================================================================
-- D. ENFORCEMENT-GRAMMAR DEBT (the root cause of A-2 / A-3 / A-5)
-- ============================================================================

-- ---- D-1  Five of the six defective block gates are conditional in the source and unconditional in the
--   encoding, purely because the condition grammar has no "applies only if X" predicate. Until a scope
--   predicate exists, every conditional "müssen" in this standard must be encoded at severity=warn, never
--   block. Affected: CR-011, CR-012, CR-015, CR-016, CR-017. Recorded here so the pattern is not
--   re-introduced by the next importer run.
--   ☐ RATIFIED  (architecture decision, no SQL)


-- ============================================================================
-- E. UNITS / DIMENSIONAL DEFECTS (equations)
-- ============================================================================

-- ---- E-1  Q-GHG is dimensionally inconsistent by a factor of 1000
--   Q-GHG (09b790ad-bda4-4020-9ef9-9384abef9f76): E_gas = AD * EF_gas
--   AD unit = "Einheit" (a placeholder string, not a unit) · EF_gas unit = "kg/Einheit" · E_gas unit = "t"
--   AD[Einheit] x EF_gas[kg/Einheit] = kg, but the output field is declared in t.
-- The standard prints NO unit for activity data and NO unit for the emission factor (§3.2.1, printed p.17;
--   §3.1.7, printed p.15-16) — both units are EKOWAI-authored. It DOES fix the reporting unit
--   (§5.2.2, printed p.25: "... in Tonnen $\mathrm{CO}_{2}$ Äq quantifizieren"), so the t-side is correct
--   and the kg-side is the defect.
-- PROPOSAL: change EF_gas unit to 't/Einheit' (and give AD a real unit per source/sink type).
--   ☐ RATIFIED
--   -- update public.fields set unit='t/Einheit' where id='af0f9b59-debc-4336-a80b-9f6ea1dff69c';
--   -- rollback: update public.fields set unit='kg/Einheit' where id='af0f9b59-debc-4336-a80b-9f6ea1dff69c';

-- ---- E-2  Q-EL is dimensionally inconsistent by a factor of 1000
--   Q-EL (4e81dbbd-4211-48b7-8991-02aaf039c3e2): E_el = EL_imp * EF_grid
--   EL_imp[kWh] x EF_grid[kg/kWh] = kg, but E_el is declared in "t CO2Aeq".
--   Anhang E (NORMATIV, printed p.72) prints no unit for the grid factor.
-- PROPOSAL: change EF_grid unit to 't CO2Aeq/kWh'.
--   ☐ RATIFIED
--   -- update public.fields set unit='t CO2Aeq/kWh' where id='de4f1bff-288e-48f0-907b-d3019d4c9579';
--   -- rollback: update public.fields set unit='kg/kWh' where id='de4f1bff-288e-48f0-907b-d3019d4c9579';

-- ---- E-3  AD carries the literal placeholder "Einheit" as its unit
--   Field AD (c34307a3-c5ee-4e3a-8985-a420705ce9e5), unit='Einheit'. §3.2.1 (printed p.17) defines the
--   quantity ("quantitatives Maß für die Tätigkeit ...") and gives examples but prints no unit, because the
--   unit depends on the source/sink. A literal "Einheit" is not a unit and makes every dimensional check
--   vacuous.
--   ☐ RATIFIED  (either null the unit, or make AD a per-source repeating group with its own unit field)

-- ---- E-4  Q-EL's output E_el is not consumed by Q-TOT
--   Chain today: Q-GHG -> E_gas -> Q-CAT -> E_co2e_gas -> Q-TOT -> E_co2e_total.
--   Q-EL -> E_el is read ONLY by gate CR-012; it is NOT an input to Q-TOT, so imported-electricity emissions
--   never reach the total inventory figure.
-- EVIDENCE (§5.2.4 b), printed p.26): "b) indirekte THG-Emissionen aus importierter Energie;" — category 2
--   is part of the inventory that §6.3 (printed p.29) requires to be converted into tonnes CO2 equivalent.
-- PROPOSAL: make E_el an input of Q-TOT (E_co2e_total = SUM(E_co2e_gas) + E_el), or route E_el through
--   Q-CAT as a category-2 contribution.
--   ☐ RATIFIED  (equation change -> importer)


-- ============================================================================
-- F. is_required REVIEW
-- ============================================================================

-- ---- F-1  Five fields are is_required=false while a severity=block gate demands them
--   biogen_co2 (CR-011) · strom_ansatz + E_el (CR-012) · reduzierungsinitiative (CR-015) ·
--   emissionsgutschrift (CR-016) · reduzierungsziel + zielart (CR-017).
--   The required flags match the source (all of these are conditional or "sollte"/"darf"); it is the gates
--   that are wrong. Resolved by blocks A-1..A-5 — NO is_required change is proposed here.
--   ☐ RATIFIED (as: no change to is_required for these fields)

-- ---- F-2  Three equation OUTPUTS are stored as is_required=true hand-enterable fields (#22 class)
--   E_gas (30114ef9-…, output of Q-GHG) · E_co2e_gas (444ff7d6-…, output of Q-CAT) ·
--   E_co2e_total (b534fcea-…, output of Q-TOT) are data_class "derived" in substance but are required
--   inputs in the form. Per the single-source derivation invariant these must be read-only, computed by
--   their one registered equation, never hand-entered.
--   ☐ RATIFIED  (read-only flag / materialisation — the engine-output materialization workstream)

-- ---- F-3  No phantom fields found.
--   Every one of the 49 fields has a label_de, a clause_reference and a description, and every symbol is
--   either referenced by an equation, referenced by a gate, or is a source-defined data item. There is NO
--   enum-value token materialised as a field in this standard — nothing to deactivate.

-- ---- F-4  No mis-homed gates found.
--   CR-009 (W05) additionally reads berichtszeitraum (W01) and CR-022 (W08) additionally reads
--   E_co2e_total (W05), but in both cases the ANCHOR field is on the gate's own worksheet. No gate reads
--   ONLY fields of another worksheet.

-- ---- F-5  Clause retag — CR-004 (30916e3c-049e-45f0-bfbc-b5b96a212c98, W05)
--   Condition: E_co2e_gas IS NOT NULL. Tagged clause_reference='5.2.2', but §5.2.2 (printed p.25) is a
--   REPORTING-BOUNDARY clause about DIRECT emissions, and the gate sits on the quantification worksheet and
--   applies to every gas regardless of direct/indirect. The obligation it actually enforces is §6.3
--   (printed p.29, "... in Tonnen CO2 Äq umrechnen").
--   ☐ RATIFIED
--   -- update public.compliance_requirements set clause_reference='6.3 / 5.2.2' where id='30916e3c-049e-45f0-bfbc-b5b96a212c98';
--   -- rollback: update public.compliance_requirements set clause_reference='5.2.2' where id='30916e3c-049e-45f0-bfbc-b5b96a212c98';


-- ============================================================================
-- G. GATE source_quote QUALITY (evidence only — no statement proposed)
-- ============================================================================
-- None of the 25 gate source_quotes is a literal substring of the standard: all are ASCII-folded
-- ("muessen", "Uebereinstimmung", "THG-Erklaerung") and prefixed with a "§x.y:" the standard does not print.
-- After folding the umlauts back, 19 of 25 contain a correct verbatim core sentence. Six additionally carry
-- an AUTHORED parenthetical gloss that appears nowhere in the standard:
--   worst  CR-022 — "(Liste a-t: a) Beschreibung der berichterstattenden Organisation ... bis t)
--                    Treibhauspotentialwerte und ihre Quellen)"  — "Liste a-t" and "bis t)" are EKOWAI text;
--                    the quote is a LIST OPENER whose 20 enumerated items are never quoted.
--   2nd    CR-025 — the whole leading half ("§4 Grundsaetze: Relevanz (4.2), Vollstaendigkeit (4.3), ...")
--                    is authored; only the trailing sentence is a real substring (see A-6).
--   3rd    CR-018 — "(a) Konformitaet mit den Grundsaetzen sicherstellen; b) ...)" gloss over §8.1.1's list.
--   then   CR-002, CR-006, CR-013, CR-014 — same list-opener-plus-gloss pattern, all with a correct
--          "muss"-bearing core sentence.
-- No gate source_quote is a bare heading, a table opener or a bibliography line; every one of the 25
-- contains at least one modal-verb sentence.
