#!/usr/bin/env node
/**
 * verify-source-pages.mjs — Wave 2 / N2
 *
 * Mechanically verifies the `source_page:` claim on every reasoning-map node
 * against the RENDERED PDF (doctrine SR-3: PDF is ground truth).
 *
 * Method (no guessing, ever):
 *   1. Resolve the standard's PDF(s) from docs/source-pdf-inventory.md.
 *   2. pdftotext -layout once per PDF, cache, split on \f  => index N = PDF page N (1-based).
 *   3. DERIVE the printed->PDF page offset from running footers/headers (never assume).
 *   4. For each node, derive DISTINCTIVE search tokens from the node itself
 *      (clause number, equation symbol, table caption, quoted phrase, rare long word).
 *      A token is usable only if it is RARE document-wide (<= MAX_TOKEN_PAGES pages).
 *      No usable token => UNTESTABLE (we do NOT guess).
 *   5. Classify: CONFIRMED / OFF-BY-N / NOT-FOUND / UNTESTABLE.
 *
 * Usage:
 *   node verify-source-pages.mjs                # whole corpus
 *   node verify-source-pages.mjs --std DWA-A-262E
 *   node verify-source-pages.mjs --json         # machine-readable to stdout
 *   node verify-source-pages.mjs --out report.json
 *   node verify-source-pages.mjs --refresh      # force pdftotext re-extraction
 *   node verify-source-pages.mjs --nodes        # per-node detail lines (text mode)
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

// ---------------------------------------------------------------- config ----
const MAPS_ROOT =
  'C:\\Users\\Ekowai\\Obsidian\\SecondBrain\\01-Projects\\ekowai-wizard\\reasoning-maps';
const INVENTORY =
  'C:\\Users\\Ekowai\\_wt-fll\\docs\\source-pdf-inventory.md';
const PDFTOTEXT = 'C:\\Users\\Ekowai\\scoop\\shims\\pdftotext.exe';
const CACHE_DIR = path.join(os.tmpdir(), 'rm-pdftext-cache');

const WINDOW = 8;            // search +/-8 pages around the claimed page
const MAX_TOKEN_PAGES = 5;   // a token is "distinctive" only if it hits <= 5 pages
const MAX_TOKENS = 4;        // use up to 4 distinctive tokens per node

// ------------------------------------------------------------------ args ----
const argv = process.argv.slice(2);
const arg = (n) => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv[i + 1] : null;
};
const has = (n) => argv.includes(n);
const ONLY_STD = arg('--std');
const AS_JSON = has('--json');
const OUT = arg('--out');
const REFRESH = has('--refresh');
const SHOW_NODES = has('--nodes');

// ------------------------------------------------------------- utilities ----
// NOTE: every reasoning-map .md on this box carries a UTF-8 BOM — strip it or
// the `^---` frontmatter anchor never matches.
const readUtf8 = (p) => fs.readFileSync(p, 'utf8').replace(/^﻿/, '');

/** lowercase alphanumerics only — defeats subscript/comma/space noise in PDF text */
const squash = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// ----------------------------------------------------- inventory parsing ----
/**
 * Parse the per-standard table of source-pdf-inventory.md.
 * Handles the three recorded path notations:
 *   plain path
 *   brace set:  ..._Part{1,2,3,4}.pdf
 *   range set:  ..._Part1.pdf .. _Part5  (5-part set)
 */
function parseInventory() {
  const txt = readUtf8(INVENTORY);
  const out = new Map();
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\|\s*([A-Za-z0-9][A-Za-z0-9._-]*)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*$/);
    if (!m) continue;
    const [, std, rawPath, confRaw] = m;
    if (std === 'standard') continue;
    const conf = confRaw.replace(/\*/g, '').trim();
    const spec = rawPath.replace(/`/g, '').trim();
    if (!spec || spec === '—' || spec === '-') {
      out.set(std, { std, files: [], confidence: conf, spec, error: 'SOURCE-ABSENT (no recorded path)' });
      continue;
    }
    out.set(std, { std, confidence: conf, spec, files: resolveSpec(spec) });
  }
  return out;
}

function resolveSpec(specRaw) {
  // strip the human annotation the inventory appends, e.g. "  (4-part set)"
  const spec = specRaw.replace(/\s*\(\d+-part set\)\s*$/i, '').trim();
  // brace expansion:  dir\Name_Part{1,2,3,4}.pdf
  const brace = spec.match(/^(.*)\{([0-9,\s]+)\}(.*)$/);
  if (brace) {
    const [, pre, list, post] = brace;
    return list.split(',').map((n) => `${pre}${n.trim()}${post}`).filter((f) => fs.existsSync(f));
  }
  // range notation: dir\Name_Part1.pdf .. _Part5  (5-part set)
  if (/\s\.\.\s/.test(spec)) {
    const first = spec.split(/\s\.\.\s/)[0].trim();
    const dir = path.dirname(first);
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => /part\s*\d+/i.test(f) && /\.pdf$/i.test(f))
      .sort((a, b) => partNo(a) - partNo(b))
      .map((f) => path.join(dir, f));
  }
  return fs.existsSync(spec) ? [spec] : [];
}
const partNo = (f) => {
  const m = f.match(/part\s*(\d+)/i);
  return m ? Number(m[1]) : 0;
};

// ------------------------------------------------------- pdf text loading ----
function pdfPages(file) {
  ensureDir(CACHE_DIR);
  const key = file.replace(/[^A-Za-z0-9]+/g, '_').slice(-120) + '.txt';
  const cache = path.join(CACHE_DIR, key);
  if (REFRESH || !fs.existsSync(cache)) {
    execFileSync(PDFTOTEXT, ['-layout', '-enc', 'UTF-8', file, cache], {
      stdio: ['ignore', 'ignore', 'pipe'],
      timeout: 180000,
    });
  }
  const raw = fs.readFileSync(cache, 'utf8');
  return raw.split('\f').filter((_, i, a) => !(i === a.length - 1 && a[i].trim() === ''));
}

// ---------------------------------------------- printed -> PDF page offset ----
/**
 * T2: DERIVE the printed->PDF offset from running page numbers, per PDF part.
 * Never assumed. Returns { offset, confidence, matched, total, map }.
 * map: printedNumber -> global 1-based PDF index (from a footer that agrees
 * with the modal offset).
 */
const MIN_DELTA = -3;   // printed number essentially never exceeds its PDF index
const MAX_DELTA = 80;   // front matter is bounded; larger "offsets" are year/ref noise
const MIN_OFFSET_CONF = 0.10;

function deriveOffset(pages, baseIndex) {
  const total = pages.length;
  const cands = []; // [{ idx, n }]
  pages.forEach((p, i) => {
    const idx = baseIndex + i + 1; // global 1-based
    const lines = p.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    // Scanned DWA parts carry rotated-sidebar OCR junk ("Cl)", "C:", "0", ">")
    // AFTER the real footer, so the window must reach several lines in.
    const edge = [...lines.slice(0, 3), ...lines.slice(-6)];
    for (const l of edge) {
      if (l.length > 200) continue; // running footers are short
      const mEnd = l.match(/(?:^|\s)(\d{1,4})$/);
      const mStart = l.match(/^(\d{1,4})(?:\s|$)/);
      // centred footer: an integer isolated by wide whitespace runs
      const mMid = l.match(/\s{4,}(\d{1,4})\s{4,}/);
      // dash-delimited folio, e.g. VDI/ISO style "– 21 –"
      const mDash = l.match(/[–—-]\s*(\d{1,4})\s*[–—-]/);
      for (const m of [mEnd, mStart, mMid, mDash]) {
        if (!m) continue;
        const n = Number(m[1]);
        if (n < 1 || n > total + MAX_DELTA) continue;   // implausible page number
        const d = idx - n;
        if (d < MIN_DELTA || d > MAX_DELTA) continue;   // implausible offset
        cands.push({ idx, n });
      }
    }
  });
  // score each delta by DISTINCT pages supporting it (not raw candidate count)
  const tally = new Map();
  for (const c of cands) {
    const d = c.idx - c.n;
    if (!tally.has(d)) tally.set(d, new Set());
    tally.get(d).add(c.idx);
  }
  const ranked = [...tally.entries()]
    .map(([d, s]) => [d, s.size])
    .sort((a, b) => b[1] - a[1]);
  let offset = ranked.length ? ranked[0][0] : null;
  let matched = ranked.length ? ranked[0][1] : 0;
  const confidence = total ? +(matched / total).toFixed(3) : 0;
  let rejected = null;
  if (offset !== null && confidence < MIN_OFFSET_CONF) {
    rejected = { offset, confidence };
    offset = null; // refuse to guess — nodes become UNTESTABLE, not wrong
  }
  const map = new Map();
  if (offset !== null) {
    for (const c of cands) if (c.idx - c.n === offset && !map.has(c.n)) map.set(c.n, c.idx);
  }
  return {
    offset, confidence, matched, total,
    distinctDeltas: tally.size,
    runnerUp: ranked[1] || null,
    rejected,
    map,
  };
}

// ------------------------------------------------------------- map nodes ----
function parseFrontmatter(txt) {
  const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^([a-z_]+):\s*(.*)$/);
    if (mm) fm[mm[1]] = mm[2].trim().replace(/^"(.*)"$/, '$1').trim();
  }
  return fm;
}

function loadNodes(std) {
  const dir = path.join(MAPS_ROOT, std);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== '_index.md')
    .map((f) => {
      const full = path.join(dir, f);
      const txt = readUtf8(full);
      return { std, file: f, path: full, fm: parseFrontmatter(txt), body: txt.replace(/^---[\s\S]*?\n---/, '') };
    });
}

const nodeClass = (file) => {
  const m = file.match(/^([a-z]+)-/);
  return m ? m[1] : 'other';
};

// -------------------------------------------------- token derivation (T1) ----
const STOP = new Set([
  'section', 'worksheet', 'compliance', 'requirement', 'equation', 'standard',
  'encoded', 'condition', 'provenance', 'generated', 'severity', 'finding',
  'findings', 'prod', 'field', 'fields', 'value', 'values', 'table', 'printed',
  'sheet', 'archetype', 'phase', 'design', 'system', 'process', 'project',
  'gemaess', 'wizard', 'evaluator', 'threshold', 'operands', 'nodes', 'node',
  'source', 'document', 'quote', 'basis', 'reference', 'references',
]);

/**
 * Returns ranked candidate tokens for a node.
 * Each: { kind, text, mode:'raw'|'squash', prio }
 */
function deriveTokens(node) {
  const title = node.fm.title || '';
  const body = node.body || '';
  const hay = `${title}\n${body}`;
  const out = [];
  const push = (kind, text, mode, prio) => {
    const t = String(text).trim();
    if (!t) return;
    out.push({ kind, text: t, mode, prio });
  };

  // 1) clause / sub-clause numbers  (4.3.4, 5.3.3.3, § 6.5) — highly distinctive
  const clauses = new Set();
  for (const m of hay.matchAll(/(?:^|[^\d.])(\d{1,2}(?:\.\d{1,2}){1,4})(?![\d.])/g)) clauses.add(m[1]);
  for (const c of clauses) if (c.split('.').length >= 3) push('clause', c, 'raw', 1);
  for (const c of clauses) if (c.split('.').length === 2) push('clause2', c, 'raw', 5);

  // 2) equation / field symbols with underscores  (A_F_TKN_red) — squash-matched
  const syms = new Set();
  for (const m of hay.matchAll(/\b([A-Za-z][A-Za-z0-9]{0,6}(?:_[A-Za-z0-9]{1,8}){1,4})\b/g)) syms.add(m[1]);
  for (const s of syms) if (squash(s).length >= 7) push('symbol', s, 'squash', 2);

  // 3) quoted verbatim phrases
  for (const m of hay.matchAll(/[""„»"]([^""„»"\n]{12,90})[""«"]/g)) push('quote', m[1], 'squash', 1);

  // 4) table / figure captions
  const cap = title.match(/\b(Tab\.?|Tabelle|Table|Bild|Abb\.?|Figure|Fig\.?)\s*(\d{1,3})/i);
  if (cap) {
    const n = cap[2];
    push('caption', `Table ${n}`, 'squash', 3);
    push('caption', `Tabelle ${n}`, 'squash', 3);
    push('caption', `Tab. ${n}`, 'squash', 4);
    push('caption', `Bild ${n}`, 'squash', 4);
    push('caption', `Figure ${n}`, 'squash', 4);
  }

  // 5) rare long words + adjacent long-word bigrams from the TITLE
  const titleTail = title.replace(/^[A-Z0-9.\- ]*?[-—]\s*/, '');
  const words = (titleTail.match(/[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß-]{5,}/g) || [])
    .filter((w) => !STOP.has(w.toLowerCase()));
  for (let i = 0; i + 1 < words.length; i++) push('bigram', `${words[i]} ${words[i + 1]}`, 'squash', 2);
  for (const w of words) if (w.length >= 9) push('word', w, 'squash', 3);

  // 6) long words from the "What it is." sentence (German compounds are rare tokens)
  const what = (body.match(/\*\*What it is\.\*\*\s*([^\n]*)/) || [])[1] || '';
  const wwords = (what.match(/[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß-]{9,}/g) || [])
    .filter((w) => !STOP.has(w.toLowerCase()));
  for (const w of wwords) push('word', w, 'squash', 4);

  // 7) numeric thresholds with a decimal separator (0,45 / 2.5) — weak, last resort
  const nums = new Set();
  for (const m of hay.matchAll(/(?:^|[\s(=><])(\d{1,4}[.,]\d{1,3})(?=[\s)%,;]|$)/g)) nums.add(m[1]);
  for (const n of nums) push('number', n, 'raw', 6);

  // de-dup, keep best prio
  const seen = new Map();
  for (const t of out) {
    const k = `${t.mode}:${t.text.toLowerCase()}`;
    if (!seen.has(k) || seen.get(k).prio > t.prio) seen.set(k, t);
  }
  return [...seen.values()].sort((a, b) => a.prio - b.prio || b.text.length - a.text.length);
}

// ------------------------------------------------------------- searching ----
/**
 * Navigation pages (table of contents / index) repeat every clause number and
 * caption in the book and would otherwise swamp the rarity filter and pull
 * "nearest hit" to the front matter. Detected mechanically by dotted leaders.
 */
function navPages(pages) {
  const nav = new Set();
  pages.forEach((p, i) => {
    const leaders = (p.match(/\.{4,}\s*\d{1,3}\s*$/gm) || []).length;
    if (leaders >= 5) nav.add(i + 1);
  });
  return nav;
}

function buildIndex(pages) {
  return {
    raw: pages.map((p) => p.toLowerCase()),
    sq: pages.map((p) => squash(p)),
    nav: navPages(pages),
  };
}

function pagesContaining(index, tok) {
  const hay = tok.mode === 'squash' ? index.sq : index.raw;
  const needle = tok.mode === 'squash' ? squash(tok.text) : tok.text.toLowerCase();
  if (needle.length < 4) return null;
  const hits = [];
  for (let i = 0; i < hay.length; i++) if (hay[i].includes(needle) && !index.nav.has(i + 1)) hits.push(i + 1);
  return hits;
}

// ------------------------------------------------------------ classifying ----
function verifyStandard(std, inv) {
  const res = {
    std,
    pdf: inv ? inv.files : [],
    confidence: inv ? inv.confidence : null,
    error: null,
    parts: [],
    offset: null,
    offsetConfidence: null,
    pdfPages: 0,
    nodes: [],
    skippedProductWorkflow: 0,
    noPage: 0,
  };
  if (!inv || !inv.files.length) {
    res.error = inv ? (inv.error || `recorded path not found on disk: ${inv.spec}`) : 'not in inventory';
  }

  const allNodes = loadNodes(std);
  const tested = [];
  for (const n of allNodes) {
    if ((n.fm.data_class || '') === 'product_workflow') { res.skippedProductWorkflow++; continue; }
    const sp = (n.fm.source_page || '').trim();
    if (!sp) { res.noPage++; continue; }
    tested.push(n);
  }
  res.claimedNodes = tested.length;
  if (res.error) {
    res.nodes = tested.map((n) => ({
      file: n.file, cls: nodeClass(n.file), claimed: n.fm.source_page,
      provenance: n.fm.provenance, verdict: 'UNTESTABLE', reason: 'NO-PDF',
    }));
    return res;
  }

  // load pages, per part, derive offsets
  let pages = [];
  const partOffsets = [];
  for (const f of inv.files) {
    let pp;
    try { pp = pdfPages(f); }
    catch (e) { res.error = `pdftotext failed: ${String(e.message).slice(0, 160)}`; return res; }
    const off = deriveOffset(pp, pages.length);
    partOffsets.push({ file: path.basename(f), pages: pp.length, ...off, map: undefined });
    for (const [k, v] of off.map) if (!globalMapHas(partOffsets, k)) { /* noop */ }
    partOffsets[partOffsets.length - 1]._map = off.map;
    pages = pages.concat(pp);
  }
  res.pdfPages = pages.length;
  const textChars = pages.reduce((a, p) => a + p.trim().length, 0);
  if (textChars < 500) {
    res.error = `PDF yields almost no text (${textChars} chars over ${pages.length} pages) — image-only/encrypted`;
    res.nodes = tested.map((n) => ({
      file: n.file, cls: nodeClass(n.file), claimed: n.fm.source_page,
      provenance: n.fm.provenance, verdict: 'UNTESTABLE', reason: 'NO-TEXT-LAYER',
    }));
    return res;
  }

  // merged printed->pdf map (first part wins on collision, parts are sequential)
  const printedMap = new Map();
  for (const p of partOffsets) for (const [k, v] of p._map) if (!printedMap.has(k)) printedMap.set(k, v);
  res.parts = partOffsets.map(({ _map, ...r }) => r);
  res.offset = partOffsets[0].offset;
  res.offsetConfidence = partOffsets[0].confidence;

  const index = buildIndex(pages);

  for (const n of tested) {
    const claimedRaw = (n.fm.source_page || '').trim();
    const mnum = claimedRaw.match(/(\d{1,4})/);
    const rec = {
      file: n.file, cls: nodeClass(n.file), claimed: claimedRaw,
      provenance: n.fm.provenance || '', title: n.fm.title || '',
    };
    if (!mnum) { rec.verdict = 'UNTESTABLE'; rec.reason = 'NON-NUMERIC-PAGE'; res.nodes.push(rec); continue; }
    const printed = Number(mnum[1]);
    let pdfIdx, how;
    if (printedMap.has(printed)) { pdfIdx = printedMap.get(printed); how = 'footer-map'; }
    else if (res.offset !== null) { pdfIdx = printed + res.offset; how = `offset${res.offset >= 0 ? '+' : ''}${res.offset}`; }
    else { rec.verdict = 'UNTESTABLE'; rec.reason = 'NO-OFFSET-DERIVABLE'; res.nodes.push(rec); continue; }
    rec.pdfIdx = pdfIdx; rec.mapMode = how;
    if (pdfIdx < 1 || pdfIdx > pages.length) {
      rec.verdict = 'NOT-FOUND'; rec.reason = 'PAGE-OUT-OF-RANGE'; res.nodes.push(rec); continue;
    }

    const cands = deriveTokens(n);
    const used = [];
    for (const t of cands) {
      if (used.length >= MAX_TOKENS) break;
      const hits = pagesContaining(index, t);
      if (!hits || hits.length === 0 || hits.length > MAX_TOKEN_PAGES) continue;
      used.push({ ...t, hits });
    }
    if (!used.length) { rec.verdict = 'UNTESTABLE'; rec.reason = 'NO-DISTINCTIVE-TOKEN'; res.nodes.push(rec); continue; }
    rec.tokens = used.map((u) => `${u.kind}:${u.text}=>${u.hits.join(',')}`);
    // Independent cross-check: where a token is document-wide UNIQUE, the page it
    // sits on is the node's true page regardless of any offset assumption.
    const uniq = used.find((u) => u.hits.length === 1);
    if (uniq) { rec.uniqueHit = uniq.hits[0]; rec.impliedOffset = uniq.hits[0] - printed; }

    if (used.some((u) => u.hits.includes(pdfIdx))) {
      rec.verdict = 'CONFIRMED';
      rec.by = used.find((u) => u.hits.includes(pdfIdx)).text;
      res.nodes.push(rec); continue;
    }
    // nearest in-window hit per token; modal offset across tokens
    // Vote on the offset, weighting stronger (rarer / higher-priority) tokens more.
    const offs = [];
    const t2 = new Map();
    for (const u of used) {
      const near = u.hits.filter((h) => Math.abs(h - pdfIdx) <= WINDOW);
      if (!near.length) continue;
      near.sort((a, b) => Math.abs(a - pdfIdx) - Math.abs(b - pdfIdx));
      const o = near[0] - pdfIdx;
      const w = (7 - u.prio) + (u.hits.length === 1 ? 2 : 0); // rarer + stronger kind = heavier
      offs.push(o);
      t2.set(o, (t2.get(o) || 0) + w);
    }
    if (offs.length) {
      let bo = offs[0], bc = -1;
      for (const [o, c] of t2) if (c > bc || (c === bc && Math.abs(o) < Math.abs(bo))) { bo = o; bc = c; }
      rec.verdict = 'OFF-BY-N'; rec.n = bo; rec.allOffsets = offs;
      res.nodes.push(rec); continue;
    }
    rec.verdict = 'NOT-FOUND';
    res.nodes.push(rec);
  }

  // modal node-implied offset (unique-token anchors only) — independent of footers
  const imp = new Map();
  for (const n of res.nodes) if (n.impliedOffset !== undefined) imp.set(n.impliedOffset, (imp.get(n.impliedOffset) || 0) + 1);
  const impRanked = [...imp.entries()].sort((a, b) => b[1] - a[1]);
  res.impliedAnchors = [...imp.values()].reduce((a, b) => a + b, 0);
  res.impliedOffsetModal = impRanked.length ? impRanked[0][0] : null;
  res.impliedOffsetCount = impRanked.length ? impRanked[0][1] : 0;
  res.impliedTop3 = impRanked.slice(0, 3);
  return res;
}
function globalMapHas() { return false; }

// ------------------------------------------------------------------ main ----
function summarise(r) {
  const c = { CONFIRMED: 0, 'OFF-BY-N': 0, 'NOT-FOUND': 0, UNTESTABLE: 0 };
  for (const n of r.nodes) c[n.verdict] = (c[n.verdict] || 0) + 1;
  const testable = c.CONFIRMED + c['OFF-BY-N'] + c['NOT-FOUND'];
  const offN = new Map();
  for (const n of r.nodes) if (n.verdict === 'OFF-BY-N') offN.set(n.n, (offN.get(n.n) || 0) + 1);
  const dom = [...offN.entries()].sort((a, b) => b[1] - a[1])[0] || null;
  return {
    std: r.std, error: r.error, pdfPages: r.pdfPages, offset: r.offset,
    offsetConfidence: r.offsetConfidence, claimed: r.claimedNodes,
    skippedProductWorkflow: r.skippedProductWorkflow, noPage: r.noPage,
    ...c, testable,
    accuracy: testable ? +(c.CONFIRMED / testable * 100).toFixed(1) : null,
    dominantN: dom ? { n: dom[0], count: dom[1] } : null,
    offNBreakdown: [...offN.entries()].sort((a, b) => b[1] - a[1]),
  };
}

const inventory = parseInventory();
const stds = ONLY_STD
  ? [ONLY_STD]
  : fs.readdirSync(MAPS_ROOT).filter((d) =>
      fs.statSync(path.join(MAPS_ROOT, d)).isDirectory() && !d.startsWith('_'));

const results = [];
for (const s of stds) {
  process.stderr.write(`[verify] ${s}\n`);
  results.push(verifyStandard(s, inventory.get(s)));
}
const summaries = results.map(summarise);

if (OUT) fs.writeFileSync(OUT, JSON.stringify({ results, summaries }, null, 1), 'utf8');

if (AS_JSON) {
  console.log(JSON.stringify({ summaries, results: SHOW_NODES ? results : undefined }, null, 1));
} else {
  const tot = summaries.reduce((a, s) => {
    a.claimed += s.claimed; a.C += s.CONFIRMED; a.O += s['OFF-BY-N'];
    a.NF += s['NOT-FOUND']; a.U += s.UNTESTABLE; a.pw += s.skippedProductWorkflow;
    return a;
  }, { claimed: 0, C: 0, O: 0, NF: 0, U: 0, pw: 0 });
  const testable = tot.C + tot.O + tot.NF;
  console.log('std                  pdfPg off conf  claim  CONF  OFFN  NOTF  UNTEST  acc%   domN  error');
  for (const s of [...summaries].sort((a, b) => (a.accuracy ?? -1) - (b.accuracy ?? -1))) {
    console.log(
      [
        s.std.padEnd(20),
        String(s.pdfPages).padStart(5),
        String(s.offset ?? '-').padStart(4),
        String(s.offsetConfidence ?? '-').padStart(5),
        String(s.claimed).padStart(6),
        String(s.CONFIRMED).padStart(5),
        String(s['OFF-BY-N']).padStart(5),
        String(s['NOT-FOUND']).padStart(5),
        String(s.UNTESTABLE).padStart(7),
        String(s.accuracy ?? '-').padStart(6),
        (s.dominantN ? `${s.dominantN.n}x${s.dominantN.count}` : '-').padStart(7),
        s.error ? ' ' + s.error : '',
      ].join(' '));
  }
  console.log('');
  console.log(`CORPUS: claimed=${tot.claimed} testable=${testable} CONFIRMED=${tot.C} OFF-BY-N=${tot.O} NOT-FOUND=${tot.NF} UNTESTABLE=${tot.U} product_workflow_skipped=${tot.pw}`);
  console.log(`CORPUS ACCURACY = ${testable ? (tot.C / testable * 100).toFixed(1) : '-'}%  (CONFIRMED / testable)`);
  if (SHOW_NODES) {
    for (const r of results) for (const n of r.nodes) {
      console.log(`${r.std}\t${n.file}\t${n.claimed}\t->pdf${n.pdfIdx ?? '-'}\t${n.verdict}${n.n !== undefined ? '(' + (n.n > 0 ? '+' : '') + n.n + ')' : ''}\t${n.reason || ''}\t${(n.tokens || []).join(' | ')}`);
    }
  }
}
