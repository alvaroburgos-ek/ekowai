#!/usr/bin/env node
/**
 * seed-known-errors.mjs — PROOF harness for validate.mjs.
 *
 * Injects EXACTLY 5 known defects into a COPY of the maps (the fixtures dir),
 * one per validator check class, so a subsequent `validate.mjs --maps <fixtures>`
 * run must catch all 5. The real vault maps are never touched.
 *
 * Defects:
 *   (a) dangling link      — a references:: edge to a non-existent node
 *   (b) VA w/o resolvable build — provenance VA citing a fabricated commit hash
 *   (c) dead CR            — a new CR node with neither fired_by nor gated_by
 *   (d) missing source_page — blank the source_page on a VA node
 *   (e) DB orphan          — delete a CR node that still exists in the snapshot
 *
 * Usage: node scripts/reasoning-map/seed-known-errors.mjs <fixturesDir>
 */
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: seed-known-errors.mjs <fixturesDir>');
  process.exit(2);
}

const log = [];

// (a) dangling link — add a bogus references:: edge to an existing DWA equation node.
{
  const f = join(dir, 'DWA-A-138-1', 'eq-gl2-a138-07.md');
  let t = readFileSync(f, 'utf8');
  t += '\n- `references::` [[doc-this-node-does-not-exist]]\n';
  writeFileSync(f, t);
  log.push('(a) dangling link  -> DWA-A-138-1/eq-gl2-a138-07: references [[doc-this-node-does-not-exist]]');
}

// (b) VA claim with a fabricated, non-resolvable build id.
{
  const f = join(dir, 'FLL-GAR-2023', 'cr-gar-req-08.md');
  let t = readFileSync(f, 'utf8');
  t = t.replace(/provenance_build:.*/, 'provenance_build: deadbee');
  writeFileSync(f, t);
  log.push('(b) VA w/o build   -> FLL-GAR-2023/cr-gar-req-08: provenance_build=deadbee (no such commit)');
}

// (c) dead CR — a brand-new CR node with NO fired_by and NO gated_by.
{
  const f = join(dir, 'FLL-Naturteich-2017', 'cr-fllnt-req-seeded-dead.md');
  const t = `---
title: "FLLNT REQ-SEEDED — orphan dead gate (CR)"
created: 2026-07-24
tags: [type/reasoning-map, std/fll-naturteich-2017, node/compliance_requirement, status/active]
status: active
source_document: "FLL-Naturteich (2017 EN translation)"
source_page: 99
owner_worksheet: FLLNT-15
provenance: EV
provenance_date: 2026-07-24
data_class: derived
severity: block
ratification_status: unratified
---
# FLLNT REQ-SEEDED — seeded dead gate

**What it is.** A seeded CR with neither fired_by:: nor gated_by:: — structurally dead.

### Typed links
- (intentionally none)
`;
  writeFileSync(f, t);
  log.push('(c) dead CR        -> FLL-Naturteich-2017/cr-fllnt-req-seeded-dead: no fired_by / no gated_by');
}

// (d) node missing source_page on a VA node.
{
  const f = join(dir, 'FLL-TP-RHIZOM-2023', 'eq-rhz-13-eq1.md');
  let t = readFileSync(f, 'utf8');
  t = t.replace(/source_page:.*/, 'source_page: ');
  writeFileSync(f, t);
  log.push('(d) missing page   -> FLL-TP-RHIZOM-2023/eq-rhz-13-eq1: source_page blanked (still VA)');
}

// (e) DB orphan — delete a CR node file whose code still exists in the snapshot.
{
  const f = join(dir, 'DWA-A-138-1', 'cr-a138-req-02.md');
  if (existsSync(f)) unlinkSync(f);
  log.push('(e) DB orphan      -> DWA-A-138-1/cr-a138-req-02 DELETED (A138-REQ-02 still in snapshot)');
}

console.log('Seeded 5 defects into fixtures copy:');
for (const l of log) console.log('  ' + l);
