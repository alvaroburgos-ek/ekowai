#!/usr/bin/env node
/**
 * validate.mjs — the reasoning-map SELF-VALIDATION SUITE.
 *
 * Parses the four vault reasoning maps (DWA-A-138-1, FLL-GAR-2023,
 * FLL-Naturteich-2017, FLL-TP-RHIZOM-2023) and validates them against
 *   (1) their own structural invariants (the _template-node contract),
 *   (2) the live-encoding SNAPSHOT (scripts/reasoning-map/snapshot/…json),
 *   (3) the STEP-1 harness ledgers + git build ids,
 *   (4) the vault defect register + STEP-1 findings.
 * Re-runnable: a second run after any change reports DRIFT as its own class.
 *
 * No new deps — Node core only. Reads the committed snapshot, never the network.
 *
 * USAGE
 *   node scripts/reasoning-map/validate.mjs                 # validate the real vault maps
 *   node scripts/reasoning-map/validate.mjs --maps <dir>    # validate a copy (fixtures)
 *   node scripts/reasoning-map/validate.mjs --json <out>    # also write machine-readable result
 *   node scripts/reasoning-map/validate.mjs --query <name>  # run one of the 4 core queries and exit
 *       queries: below-va:<STD> | never-fired | unratified | acquisition-list
 *
 * Exit code = number of ERROR-severity findings (0 = clean), capped at 250.
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');

// ── Config / paths ──────────────────────────────────────────────────────────
const DEFAULT_MAPS_DIR =
  'C:/Users/Ekowai/Obsidian/SecondBrain/01-Projects/ekowai-wizard/reasoning-maps';
const SNAPSHOT = join(here, 'snapshot', 'encoding-snapshot.json');
const DEFECT_REGISTER =
  'C:/Users/Ekowai/Obsidian/SecondBrain/01-Projects/ekowai-wizard/defect-register.md';
const LEDGER_DIR = join(repoRoot, '.superpowers', 'sdd');

const STANDARD_DIRS = {
  'DWA-A-138-1': 'DWA-A-138-1',
  'FLL-GAR-2023': 'FLL-GAR-2023',
  'FLL-Naturteich-2017': 'FLL-Naturteich-2017',
  'FLL-TP-RHIZOM-2023': 'FLL-TP-RHIZOM-2023',
  'DIN-18130-1': 'DIN-18130-1',
};
// Files that are map-level, not value nodes (exempt from #1/#2 source_page checks).
const MAP_LEVEL = new Set(['_index', '_template-node']);
// The single intentional external wikilink target shared by every map.
const SHARED_EXTERNAL = '_template-node';

// ── CLI ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function argVal(flag) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}
const mapsDir = argVal('--maps') || DEFAULT_MAPS_DIR;
const jsonOut = argVal('--json');
const queryName = argVal('--query');

// ── Frontmatter + typed-link parser ─────────────────────────────────────────
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = {};
  if (!m) return fm;
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\\n/g, '').trim(); // guard literal \n inside fm too
    const mm = line.match(/^([A-Za-z_][\w]*):\s*(.*)$/);
    if (!mm) continue;
    let [, k, v] = mm;
    v = v.trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    fm[k] = v;
  }
  return fm;
}

// Typed inline fields look like:  - `requires::` [[node]]   (or bare symbol)
// The GAR files embed a LITERAL "\n" as a line separator, so we normalise both.
const LINK_FIELDS = [
  'requires',
  'produces',
  'consumed_by',
  'gated_by',
  'fired_by',
  'range_choice',
  'references',
];
function parseTypedLinks(body) {
  const links = {}; // field -> array of { target, raw }
  for (const f of LINK_FIELDS) links[f] = [];
  const wikilinks = []; // every [[target]] anywhere in body
  const normalised = body.replace(/\\n/g, '\n');
  for (const line of normalised.split(/\r?\n/)) {
    // Typed links live ONLY on markdown list-item lines ("- `field::` …").
    // This prevents prose that merely NAMES a field (e.g. "neither fired_by::
    // nor gated_by::") from being mis-parsed as an actual edge.
    if (!/^\s*[-*]\s/.test(line)) {
      for (const a of line.matchAll(/\[\[([^\]]+)\]\]/g)) wikilinks.push(a[1].trim());
      continue;
    }
    // typed field?  ` - `field::` ... `
    const fm = line.match(/^\s*[-*]\s+`?(\w+)::`?\s*(.*)$/);
    if (fm && LINK_FIELDS.includes(fm[1])) {
      const field = fm[1];
      const rest = fm[2];
      const wl = rest.match(/\[\[([^\]]+)\]\]/);
      const target = wl ? wl[1].trim() : rest.replace(/`/g, '').trim() || null;
      links[field].push({ target, isWikilink: !!wl, raw: line.trim() });
    }
    // collect any wikilink on the line (incl. `section:` non-typed links)
    const all = line.matchAll(/\[\[([^\]]+)\]\]/g);
    for (const a of all) wikilinks.push(a[1].trim());
  }
  return { links, wikilinks };
}

function inferType(id, fm) {
  // tags carry node/<type>; fall back to filename prefix.
  const tag = (fm.tags || '').match(/node\/([a-z_-]+)/);
  if (tag) return tag[1];
  if (id.startsWith('cr-') || id.includes('req')) return 'compliance_requirement';
  if (id.startsWith('eq-')) return 'equation';
  if (id.startsWith('doc-')) return 'document';
  if (id.startsWith('dp-')) return 'decision-point';
  if (id.startsWith('section-')) return 'section';
  if (id.startsWith('tab-') || id.startsWith('bild-') || id.startsWith('anh-')) return 'table';
  return 'unknown';
}

function extractCrCode(title, id) {
  // Node CR codes: "A138-REQ-01 …", "FLL-GAR REQ-08 …", "FLLTP-RHZ REQ-RHZ18-VERDICT …",
  // and the DIN-family form "<STD>-CR-NN" (e.g. "DIN-18130-1-CR-01 …"). Match the
  // fully-qualified <STD>-CR-NN first so the whole DB code is captured, then the
  // REQ-family, then fall back to the filename slug.
  const cr = title.match(/([A-Z0-9]+(?:-[A-Z0-9]+)*-CR-[A-Z0-9-]+)/);
  if (cr) return cr[1];
  const m = title.match(/(A138-REQ-[A-Z0-9-]+|REQ-[A-Z0-9-]+)/);
  if (m) return m[1];
  const im = id.match(/(req-[a-z0-9-]+)/i);
  return im ? im[1].toUpperCase().replace(/^REQ/, 'REQ') : null;
}

function loadMap(stdCode) {
  const dir = join(mapsDir, STANDARD_DIRS[stdCode]);
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  const nodes = {};
  const nodeIds = new Set();
  for (const f of files) {
    const id = basename(f, '.md');
    nodeIds.add(id);
  }
  for (const f of files) {
    const id = basename(f, '.md');
    const text = readFileSync(join(dir, f), 'utf8');
    const fm = parseFrontmatter(text);
    const bodyStart = text.indexOf('\n---', 3);
    const body = bodyStart >= 0 ? text.slice(text.indexOf('---', bodyStart) + 3) : text;
    const { links, wikilinks } = parseTypedLinks(body);
    const type = inferType(id, fm);
    const title = fm.title || id;
    nodes[id] = {
      id,
      file: f,
      type,
      fm,
      title,
      links,
      wikilinks,
      crCode: type === 'compliance_requirement' ? extractCrCode(title, id) : null,
      // produces target may carry an inline annotation, e.g. "A_C  (derived)" or
      // "g_prime (as a >= inequality …)" — take the leading symbol token only.
      producesSymbols: links.produces
        .map((l) => (l.target || '').split(/[\s(]/)[0].replace(/`/g, '').trim())
        .filter(Boolean),
    };
  }
  return { stdCode, dir, nodes, nodeIds };
}

// ── Findings model ──────────────────────────────────────────────────────────
const findings = [];
let checkStats = {};
function bumpCheck(check, ok) {
  checkStats[check] = checkStats[check] || { pass: 0, fail: 0 };
  if (ok) checkStats[check].pass++;
  else checkStats[check].fail++;
}
function finding(sev, check, std, node, msg) {
  findings.push({ severity: sev, check, standard: std, node, message: msg });
  bumpCheck(check, false);
}

// ── Load snapshot ───────────────────────────────────────────────────────────
if (!existsSync(SNAPSHOT)) {
  console.error(`snapshot missing: ${SNAPSHOT}\nRun export-encoding-snapshot.mjs first.`);
  process.exit(2);
}
const snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));

// ── Load ledgers + git build ids (for VA provenance cross-check) ─────────────
function gitCommitsExist() {
  const set = new Set();
  try {
    const out = execFileSync('git', ['-C', repoRoot, 'log', '--all', '--format=%h %H'], {
      encoding: 'utf8',
    });
    for (const line of out.split(/\r?\n/)) {
      const [short, full] = line.trim().split(/\s+/);
      if (short) set.add(short);
      if (full) set.add(full.slice(0, 7));
    }
  } catch (e) {
    /* git optional */
  }
  return set;
}
function ledgerBuildIds() {
  const set = new Set();
  if (!existsSync(LEDGER_DIR)) return set;
  for (const f of readdirSync(LEDGER_DIR).filter((x) => x.endsWith('.md'))) {
    const t = readFileSync(join(LEDGER_DIR, f), 'utf8');
    for (const m of t.matchAll(/\b([0-9a-f]{7})\b/g)) set.add(m[1]);
  }
  return set;
}
// KNOWN_BUILDS is git-commits-ONLY. A prior version also folded in any bare 7-hex
// token found in ledger prose (ledgerBuildIds), but that self-poisons: the validator's
// own report documents example/fabricated build ids (e.g. a seeded 'deadbee'), which
// then count as "known" and mask the very defect the 2b check exists to catch. Real VA
// builds are always git commits, so git is the authoritative, un-poisonable anchor.
// (ledgerBuildIds retained above for reference but intentionally NOT trusted.)
const KNOWN_BUILDS = gitCommitsExist();
void ledgerBuildIds;

function defectRegisterNodes() {
  // Collect wikilink-style node refs the register attaches findings to (rare for FLL),
  // plus a raw text blob so we can check open-finding attachment loosely.
  if (!existsSync(DEFECT_REGISTER)) return { text: '', refs: new Set() };
  const text = readFileSync(DEFECT_REGISTER, 'utf8');
  const refs = new Set([...text.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1].trim()));
  return { text, refs };
}
const defects = defectRegisterNodes();

// ── Build all maps ──────────────────────────────────────────────────────────
const maps = {};
for (const std of Object.keys(STANDARD_DIRS)) maps[std] = loadMap(std);

// ═════════════════════════ CHECK 1 — STRUCTURAL INTEGRITY ════════════════════
function checkStructural(map) {
  const { stdCode, nodes, nodeIds } = map;
  for (const node of Object.values(nodes)) {
    const { id, type, fm } = node;
    if (MAP_LEVEL.has(id)) continue; // _index / _template-node exempt

    const isDoc = type === 'document';
    const inLibraryFalse = String(fm.in_library).trim() === 'false';

    // #1 VA ⇒ source_page  (value nodes)
    if (fm.provenance === 'VA') {
      const ok = !!(fm.source_page && fm.source_page.trim());
      bumpCheck('1.va-has-page', ok);
      if (!ok) finding('ERROR', '1.va-has-page', stdCode, id, `provenance VA but no source_page`);
    }
    // #2 standard_fixed ⇒ source_page  (in_library:false docs exempt — defer out)
    if (fm.data_class === 'standard_fixed' && !(isDoc && inLibraryFalse)) {
      const ok = !!(fm.source_page && fm.source_page.trim());
      bumpCheck('2.fixed-has-page', ok);
      if (!ok)
        finding('ERROR', '2.fixed-has-page', stdCode, id, `standard_fixed but no source_page`);
    }

    // wikilink targets resolve (no dangling edges)
    for (const target of node.wikilinks) {
      const t = target.split('|')[0].trim(); // strip alias
      const ok = nodeIds.has(t) || t === SHARED_EXTERNAL;
      bumpCheck('1.links-resolve', ok);
      if (!ok)
        finding('ERROR', '1.links-resolve', stdCode, id, `dangling wikilink -> [[${t}]]`);
    }

    // equation: ≥1 produces + each requires input exists w/ a data_class
    if (type === 'equation') {
      const hasProduces = node.links.produces.length >= 1;
      bumpCheck('1.eq-produces', hasProduces);
      if (!hasProduces)
        finding('ERROR', '1.eq-produces', stdCode, id, `equation has no produces::`);
      // requires classifiability (#6): the node itself must carry a data_class,
      // and any requires that IS a wikilink must resolve to a node with data_class.
      const selfClass = fm.data_class;
      bumpCheck('6.eq-classifiable', !!selfClass);
      if (!selfClass)
        finding('ERROR', '6.eq-classifiable', stdCode, id, `equation missing data_class`);
      for (const req of node.links.requires) {
        if (req.isWikilink && req.target) {
          const dep = nodes[req.target.split('|')[0].trim()];
          const ok = dep && dep.fm.data_class;
          bumpCheck('6.eq-classifiable', !!ok);
          if (!ok)
            finding(
              'ERROR',
              '6.eq-classifiable',
              stdCode,
              id,
              `requires [[${req.target}]] has no resolvable data_class`,
            );
        }
        // bare-symbol requires carry an inline class annotation by convention — OK.
      }
    }

    // CR: fired_by OR gated_by present, else flag dead-gate (F-2 class).
    if (type === 'compliance_requirement') {
      const hasFired = node.links.fired_by.length >= 1;
      const hasGated = node.links.gated_by.length >= 1;
      // A live CR is expected to be fired by an equation/input; a CR with NO
      // fired_by AND flagged unreachable in body = dead. We treat "no fired_by
      // and no gated_by" as structurally dead; "gated but not fired" is a softer
      // WARN (attestation/manual gates legitimately have no equation firing them).
      const ratified = /ratif|applied/i.test(node.fm.ratification_status || '');
      const bodyText = readFileSync(join(map.dir, node.file), 'utf8');
      // F-2 dead-gate: the body asserts THIS gate is unreachable/dead/vacuous as a
      // finding (not merely mentioning it closed a hole). Applied/ratified gates
      // are live and excluded.
      const deadFlag =
        !ratified &&
        /(fail-?unreachable|dead[- ]gate|never (fires?|reachable)|no reachable fail|vacuous[- ]pass|phantom[- ]field gate|unreachable FAIL)/i.test(
          bodyText,
        );
      if (!hasFired && !hasGated) {
        finding('ERROR', '1.cr-fired-or-dead', stdCode, id, `CR has neither fired_by nor gated_by (dead)`);
      } else {
        bumpCheck('1.cr-fired-or-dead', true);
        if (deadFlag)
          finding(
            'WARN',
            'F2.dead-gate',
            stdCode,
            id,
            `CR asserted dead/unreachable in body (F-2 dead-gate) — no fired_by=${!hasFired}`,
          );
      }
    }
  }
}

// ═════════════════════ CHECK 2 — CROSS-TRUTH: MAP vs SNAPSHOT ═════════════════
function checkCrossSnapshot(map) {
  const { stdCode, nodes } = map;
  const enc = snapshot.standards[stdCode];
  if (!enc) {
    finding('ERROR', '2.snapshot-present', stdCode, '_index', `no snapshot for standard`);
    return;
  }
  // ---- CR: node.code ↔ DB code, both directions
  const nodeCrCodes = new Map(); // code -> nodeId
  for (const n of Object.values(nodes))
    if (n.type === 'compliance_requirement' && n.crCode) nodeCrCodes.set(n.crCode, n.id);
  const dbCrCodes = new Set(enc.compliance.map((c) => c.code));
  for (const code of dbCrCodes) {
    const ok = nodeCrCodes.has(code);
    bumpCheck('2.cr-db-has-node', ok);
    if (!ok) finding('ERROR', '2.cr-db-has-node', stdCode, code, `DB CR ${code} has NO map node (orphan DB row)`);
  }
  for (const [code, nid] of nodeCrCodes) {
    const ok = dbCrCodes.has(code);
    bumpCheck('2.cr-node-has-db', ok);
    if (!ok)
      finding('ERROR', '2.cr-node-has-db', stdCode, nid, `map CR node ${code} has NO DB row (orphan node)`);
  }
  // ---- Equations: produced-symbol set both directions
  const nodeOut = new Set();
  for (const n of Object.values(nodes))
    if (n.type === 'equation') for (const s of n.producesSymbols) nodeOut.add(s);
  // DB equations whose output_symbol is a bracketed placeholder — e.g. "(balance)",
  // "(condition)" — are boolean/relational checks with no emitted symbol; they are
  // not expected to have a producing symbol node, so exclude them from the set.
  const dbOut = new Set(
    enc.equations
      .map((e) => e.output_symbol)
      .filter((s) => s && !/^\(.*\)$/.test(s.trim())),
  );
  for (const s of dbOut) {
    const ok = nodeOut.has(s);
    bumpCheck('2.eq-db-has-node', ok);
    if (!ok)
      finding('WARN', '2.eq-db-has-node', stdCode, s, `DB equation output '${s}' has no producing map node`);
  }
  for (const s of nodeOut) {
    const ok = dbOut.has(s);
    bumpCheck('2.eq-node-has-db', ok);
    if (!ok)
      finding('WARN', '2.eq-node-has-db', stdCode, s, `map equation produces '${s}' absent from DB (orphan)`);
  }
  // ---- Worksheet coverage: every DB worksheet has a section node
  const sectionOwners = new Set();
  for (const n of Object.values(nodes))
    if (n.type === 'section' && n.fm.owner_worksheet) sectionOwners.add(n.fm.owner_worksheet);
  for (const w of enc.worksheets) {
    const ok = sectionOwners.has(w.code);
    bumpCheck('2.ws-has-section', ok);
    if (!ok)
      finding('WARN', '2.ws-has-section', stdCode, w.code, `DB worksheet ${w.code} has no section node`);
  }
}

// ═══════════════════ CHECK 2b — CROSS-TRUTH: MAP vs HARNESS ═══════════════════
function checkVaBuilds(map) {
  const { stdCode, nodes } = map;
  for (const n of Object.values(nodes)) {
    if (MAP_LEVEL.has(n.id)) continue;
    if (n.fm.provenance !== 'VA') continue;
    const build = (n.fm.provenance_build || '').trim();
    if (!build) {
      // VA-without-build: only invalid if the node claims a harness-backed VA.
      // Doctrine: a VA requires a PDF page ref (checked in #1). A VA sourced
      // purely from the rendered PDF need not carry a build; a VA that claims a
      // harness/lift commit MUST resolve. We flag VA nodes that DO carry a build
      // which does not resolve, and note VA-without-build as informational.
      bumpCheck('2b.va-build-resolves', true);
      continue;
    }
    const ok = KNOWN_BUILDS.has(build.slice(0, 7));
    bumpCheck('2b.va-build-resolves', ok);
    if (!ok)
      finding(
        'ERROR',
        '2b.va-build-resolves',
        stdCode,
        n.id,
        `provenance VA cites build '${build}' with no resolvable git commit / ledger entry`,
      );
  }
}

// ═══════════════════ CHECK 2c — MAP vs DEFECT REGISTER / findings ═════════════
function checkDefectAttachment(map) {
  const { stdCode, nodes } = map;
  // Every register wikilink that names a node in THIS map must resolve.
  for (const ref of defects.refs) {
    const t = ref.split('|')[0].trim();
    if (nodes[t]) bumpCheck('2c.defect-attach', true);
  }
  // Decision-points are the map's own open findings — each must be reachable
  // from the _index (attached), not orphaned.
  const indexText = existsSync(join(map.dir, '_index.md'))
    ? readFileSync(join(map.dir, '_index.md'), 'utf8')
    : '';
  for (const n of Object.values(nodes)) {
    if (n.type !== 'decision-point') continue;
    const attached = indexText.includes(n.id) || defects.refs.has(n.id);
    bumpCheck('2c.dp-attached', attached);
    if (!attached)
      finding('WARN', '2c.dp-attached', stdCode, n.id, `open decision-point not referenced by _index or register`);
  }
}

// ═══════════════════════ CHECK 3 — REGRESSION / DRIFT ════════════════════════
function checkDrift(map) {
  const { stdCode, nodes } = map;
  const enc = snapshot.standards[stdCode];
  if (!enc) return;
  // Node-count-vs-snapshot drift signal (informational unless it changes).
  const nodeCrs = Object.values(nodes).filter((n) => n.type === 'compliance_requirement').length;
  const nodeEqs = Object.values(nodes).filter((n) => n.type === 'equation').length;
  const dbCrs = enc.compliance.length;
  // equations: a map may fan one clause into sub-eq nodes, so ≥ is expected.
  if (nodeCrs < dbCrs)
    finding('WARN', '3.drift', stdCode, '_index', `CR node count ${nodeCrs} < DB CR count ${dbCrs} (drift)`);
  bumpCheck('3.drift', nodeCrs >= dbCrs);
  bumpCheck('3.drift', nodeEqs >= 1);
}

// ── Run all checks ────────────────────────────────────────────────────────────
for (const std of Object.keys(maps)) {
  checkStructural(maps[std]);
  checkCrossSnapshot(maps[std]);
  checkVaBuilds(maps[std]);
  checkDefectAttachment(maps[std]);
  checkDrift(maps[std]);
}

// ═══════════════════════════ 4 CORE QUERIES ══════════════════════════════════
function qBelowVa(std) {
  const rows = [];
  for (const n of Object.values(maps[std].nodes)) {
    if (MAP_LEVEL.has(n.id)) continue;
    if (n.fm.provenance && n.fm.provenance !== 'VA')
      rows.push({ node: n.id, provenance: n.fm.provenance, data_class: n.fm.data_class, type: n.type });
  }
  return rows.sort((a, b) => a.provenance.localeCompare(b.provenance) || a.node.localeCompare(b.node));
}
function qNeverFired() {
  const rows = [];
  for (const std of Object.keys(maps))
    for (const n of Object.values(maps[std].nodes)) {
      if (n.type !== 'compliance_requirement') continue;
      if (n.links.fired_by.length === 0)
        rows.push({ standard: std, node: n.id, code: n.crCode, severity: n.fm.severity });
    }
  return rows;
}
function qUnratified() {
  const rows = [];
  for (const std of Object.keys(maps))
    for (const n of Object.values(maps[std].nodes)) {
      if (MAP_LEVEL.has(n.id)) continue;
      const rs = (n.fm.ratification_status || '').toLowerCase();
      if (n.type === 'decision-point' && rs.includes('unratified'))
        rows.push({ standard: std, node: n.id, type: n.type, title: n.title });
    }
  return rows;
}
function qAcquisitionList() {
  // Referenced-but-missing documents (in_library:false) ranked by dependent-node count.
  const docs = []; // {standard,node,dependents}
  for (const std of Object.keys(maps)) {
    const nodes = maps[std].nodes;
    for (const doc of Object.values(nodes)) {
      if (doc.type !== 'document') continue;
      if (String(doc.fm.in_library).trim() !== 'false') continue;
      let deps = 0;
      const depNodes = [];
      for (const n of Object.values(nodes)) {
        if (n.id === doc.id) continue;
        const refs = n.links.references.map((l) => (l.target || '').split('|')[0].trim());
        if (refs.includes(doc.id)) {
          deps++;
          depNodes.push(n.id);
        }
      }
      docs.push({ standard: std, document: doc.id, title: doc.title, dependents: deps, depNodes });
    }
  }
  return docs.sort((a, b) => b.dependents - a.dependents);
}

// ── If --query mode, print and exit ───────────────────────────────────────────
if (queryName) {
  const [q, arg] = queryName.split(':');
  let result;
  if (q === 'below-va') result = qBelowVa(arg);
  else if (q === 'never-fired') result = qNeverFired();
  else if (q === 'unratified') result = qUnratified();
  else if (q === 'acquisition-list') result = qAcquisitionList();
  else {
    console.error(`unknown query '${q}'`);
    process.exit(2);
  }
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

// ── Report ────────────────────────────────────────────────────────────────────
const errors = findings.filter((f) => f.severity === 'ERROR');
const warns = findings.filter((f) => f.severity === 'WARN');

console.log('═══════════════════════════════════════════════════════════════════');
console.log(' REASONING-MAP SELF-VALIDATION — report');
console.log(`  maps dir : ${mapsDir}`);
console.log(`  snapshot : ${SNAPSHOT} (exported ${snapshot.exported_at})`);
console.log('═══════════════════════════════════════════════════════════════════');
let totalNodes = 0;
for (const std of Object.keys(maps)) {
  const n = Object.keys(maps[std].nodes).length;
  totalNodes += n;
  console.log(`  ${std.padEnd(22)} nodes=${n}`);
}
console.log(`  TOTAL nodes = ${totalNodes}`);
console.log('\n── Per-check pass/fail ──');
const checkNames = Object.keys(checkStats).sort();
for (const c of checkNames) {
  const s = checkStats[c];
  console.log(`  ${c.padEnd(24)} pass=${s.pass}  fail=${s.fail}`);
}
console.log(`\n  ERRORS = ${errors.length}   WARNINGS = ${warns.length}`);

if (findings.length) {
  console.log('\n── Findings ──');
  for (const f of findings.sort((a, b) => (a.severity < b.severity ? -1 : 1))) {
    console.log(`  [${f.severity}] ${f.check} · ${f.standard} · ${f.node} — ${f.message}`);
  }
} else {
  console.log('\n  CLEAN — no findings.');
}

if (jsonOut) {
  writeFileSync(
    jsonOut,
    JSON.stringify(
      { mapsDir, snapshot: SNAPSHOT, checkStats, findings, totalNodes },
      null,
      2,
    ),
  );
  console.log(`\n  machine-readable result -> ${jsonOut}`);
}

process.exit(Math.min(errors.length, 250));
