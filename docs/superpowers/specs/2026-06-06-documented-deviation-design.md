# Documented-deviation capability — design spec

- **Date:** 2026-06-06
- **Status:** Approved (design, decisions made this session); pending spec review → implementation plan
- **Standard context:** DWA-A 138-1 (and reusable across the other 13 standards)
- **Repo/branch:** builds on `integration/preview-138-plus-leads` (A138-07 single-source + gate + panel + leads), deploys to the **preview** host (`ekowai-wizard-preview.vercel.app`)

## Problem

A block-severity compliance requirement can **genuinely fail the literal rule** yet be **defensible by engineering judgment** — e.g. DWA-A 138-1 REQ-03 (`permeability_test_method = literaturwert`, not an Anhang-A field test) or REQ-04 (GW clearance 0,5 m < 1 m) on a project that is really an FLL §4.10 case. Today the only outcomes are "pass" (which would be a silent, untraceable green — forbidden) or "fail" (which blocks approval forever). There is no honest, auditable way to **acknowledge the failure and pass it with a documented basis**. This is needed repeatedly — across REQ-03/04 here and across the other standards.

## Goal

Let the engineer of record mark a block-severity requirement as satisfied via **documented deviation**: a first-class, auditable verdict — **"erfüllt mit dokumentierter Abweichung"** — that requires a written justification + a citation/basis (optionally an authority-coordination reference), is recorded as an auditable event, and is rendered **distinctly** (never identical to a plain "erfüllt") in the app and the PDF. The gate stops blocking on a deviated requirement; the project verdict reflects it as a distinct state.

## Hard requirements (from the brief)

1. **Not a silent override.** A deviated requirement renders a **distinct verdict** — visually and in the PDF — never identical to a plain "erfüllt."
2. **Requires** a written justification + a citation/basis + optional authority-coordination reference. **Cannot be saved blank.**
3. Recorded as an **auditable** deviation event (who, when, why) in the audit trail and the report.
4. The **project-level verdict** reflects it: a project with deviations is "compliant with documented deviations," distinct from clean compliance and from non-compliant.
5. Applies **per-requirement** (REQ-03 deviated, REQ-05 genuinely passing) — does **not** blanket-approve.
6. **Not a workaround for bug-hidden passes.** REQ-05/06/07 (the earlier eval-vs-store / cross-worksheet display issues) are genuine passes once correctly evaluated — those are fixed in code, **not** papered over with a deviation.

## Decisions (made this session)

- **Storage:** dedicated **`compliance_deviations`** table (queryable, gate-consulted) — NOT audit_log-only. The `audit_log` still gets a `deviation_*` event per change.
- **Scope:** offered on **any non-passing block-severity requirement** (fail / pending / manual) — a clean machine `pass` shows no affordance.
- **Lifecycle:** deviations can be **edited / withdrawn** (each change a new audit event; nothing hard-deleted); **active deviations are frozen into the `engineer_approve` snapshot** so a stamped record reproduces exactly which deviations applied.
- **Basis input:** **reuse the existing citation system** (`citationSources` shape / `project_documents` / `label:<text>`) for the basis; authority-coordination reference is an optional free-text field.

## Architecture / data flow

```
compliance_deviations (NEW table — current state, gate-consulted)
  id, project_id, requirement_id, worksheet_instance_id,
  justification (text, NOT NULL), basis_citations (jsonb = citationSources shape, NOT NULL),
  authority_ref (text NULL), status ('active' | 'withdrawn'),
  created_by, created_at, updated_by, updated_at, withdrawn_by, withdrawn_at
  UNIQUE (project_id, requirement_id) WHERE status = 'active'
        │  (+ an audit_log event {action: 'deviation_set'|'deviation_edit'|'deviation_withdraw'} per change)
        ▼
Gate (approval-gate.ts / resolveApprovalGate):
  a failing block condition WITH an active deviation moves out of `failingBlockConditions`
  into a NEW `deviatedConditions[]` → it no longer blocks. ok = (failingBlock==0 && missingRequired==0).
        ▼
Panel (compliance-block.tsx): block req with an active deviation renders the DISTINCT
  verdict badge "Erfüllt mit dokumentierter Abweichung" (own token + glyph, ≠ green ✓);
  inline form to create/edit/withdraw (justification + citation picker + authority_ref).
        ▼
PDF (sections/compliance.tsx): a third frame style — not green-pass, not red-fail — printing
  the verdict label + justification + resolved basis citation(s) + authority_ref.
        ▼
Project verdict (new query): compliant | compliant_with_documented_deviations | non_compliant.
```

## Components

### 1. Data model — `compliance_deviations` (one migration)
Columns as above. `basis_citations` mirrors `project_parameters.citation_sources` exactly so the existing citation picker is reused. Every mutation also writes an `audit_log` event (`tableName: 'compliance_deviations'`, `changes` carrying before/after) — the immutable trail, like the existing `manual_override` precedent.

### 2. Per-requirement verdict — new `deviation` state
A block req with an active `compliance_deviations` row renders **"Erfüllt mit dokumentierter Abweichung"** — distinct token + glyph (proposal: indigo/`info` tone, glyph `✓ᴬ`/`≈`, `aria-label="Erfüllt mit dokumentierter Abweichung"`), never the plain green `✓`. Affordance shown on any block req that is **not** a clean machine `pass`.

### 3. Gate integration — `approval-gate.ts`
`ApprovalGateResult` gains `deviatedConditions: Array<{ code; titleDe; deviationId }>`. `resolveApprovalGate` (already extracted, b13e913) loads active deviations for the instance's project; a failing block condition whose `requirement_id` has an active deviation moves into `deviatedConditions` and out of `failingBlockConditions`. `ok = failingBlockConditions.length === 0 && missingRequiredFields.length === 0`. The missing-required-field arm is unchanged.

### 4. UI — `compliance-block.tsx`
New `StatusBadge` branch for `deviation`. A deviable req shows a **"Abweichung dokumentieren"** affordance → inline form: `justification` (required textarea, ≥10 chars per the `overrides.ts` precedent), the **citation picker** for `basis_citations`, optional `authority_ref`. Cannot save blank. When active: shows the justification summary + basis chip + **Bearbeiten / Zurückziehen**. Counts header gains a deviation tally.

### 5. PDF — `sections/compliance.tsx`
A deviated requirement renders in a **third frame style** (outlined/amber, distinct from green-pass and red-fail) printing the verdict label, justification, resolved basis citation(s), and `authority_ref` if present — following the existing colored 3-state contract in `engine-verdict.tsx`.

### 6. Project-level verdict (new)
`loadProjectComplianceVerdict(projectId)` over all block requirements of the project's active worksheet instances:
- `compliant` — every block req passes (or vacuous); zero active deviations.
- `compliant_with_documented_deviations` — every block req passes OR is covered by an active deviation; ≥1 deviation.
- `non_compliant` — ≥1 block req fails/pending and is NOT covered by a deviation.
German labels: *Konform* / *Konform mit dokumentierten Abweichungen* / *Nicht konform*. Surfaced in the project header.

### 7. Freeze on approval
In `captureSnapshot` (the `engineer_approve` path in `worksheet-transition.ts`), the snapshot payload gains the active deviations for that instance, so the approved/stamped record + its PDF reproduce exactly which deviations applied. Edit/withdraw afterward cannot retroactively change a frozen snapshot.

### 8. Server actions
`setDeviation` / `editDeviation` / `withdrawDeviation` — modeled on `overrides.ts`: `requireUser` → org-membership ownership check → requirement-belongs-to-project check → upsert the table row → write the `audit_log` event → `revalidateTag`. Zod-validated (justification length, basis non-empty).

## No-divergence / integrity invariants
- Deviation never produces a plain green; the verdict and PDF are always visually distinct.
- A deviation covers only the **compliance-condition** arm of the gate; the **missing-required-field** arm is independent (a deviation does not auto-satisfy unrelated required inputs).
- Per-requirement only; never blanket.

## Non-goals
- Not a blanket/silent override; warn-severity requirements are untouched (they never block).
- Not a fix for genuine eval bugs (REQ-05/06/07 are real passes once correctly evaluated; the REQ-03 condition-strengthening is a separate honesty fix, not a deviation).
- Cross-standard surface taxonomy + the reusable encoder skill remain separate parked items.

## Acceptance
On a CONDITIONAL DWA-A 138-1 project (Flurstück 133): the engineer documents a deviation on REQ-03 (justification + basis citation + optional authority ref) → REQ-03 renders **"Erfüllt mit dokumentierter Abweichung"** (distinct, not green) → the gate stops listing REQ-03 in `failingBlockConditions` → the project verdict becomes **"Konform mit dokumentierten Abweichungen"** → the PDF prints the distinct verdict + justification + basis → the deviation appears in the audit trail → approving freezes it into the snapshot. REQ-05 (genuine pass) is unaffected; nothing renders as a plain green that wasn't earned.
