/**
 * ISO-59004 regulation-table seed builders (Plan 3 Task 29, 2026-09-24) — the LAST of the 29 standards.
 *
 * SR-1 / SR-3: every seeded value and every `verbatim_quote` was read in this session from an IN-SESSION
 * `pdftotext -layout` extraction of the standard's own PDF
 * `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 59004\ISO_FDIS_59004_N.pdf`
 * (NM ISO/FDIS 59004:2024 — the IMANOR adoption, cover page L27–L29: "La présente norme est identique à
 * l'ISO/FDIS 59004:2024"; the body is the English ISO/FDIS text). That is the doctrine's VA path: a
 * PDF-derived quote WITH a PDF page number. The spans live in `regulation-tables-quotes-iso59004.ts`
 * (generated mechanically by line range, never retyped); each span's doc comment names the PDF page
 * (form-feed mapping) and the page the document itself prints. The extraction is NOT committed — the
 * command, its byte/page/character counts and the page-mapping method are in
 * `docs/superpowers/specs/2026-09-11-guideline-to-tool/reports/plan-3-iso59004.md`.
 *
 * iso59004-J-1 (FDIS): the source is a FINAL DRAFT. The status string read from the running header of
 * the first body page is exactly "FINAL DRAFT International Standard" (span `Q.L409`, PDF p.8 / printed
 * p.1) beside the designator "ISO/FDIS 59004:2024(en)". Prod `standards.version` is
 * "FDIS 2024 (ISO/FDIS 59004:2024)" (read-only 2026-09-24) → edition token `'FDIS 2024'`. EVERY quote in
 * this module comes from that draft; whether the corpus may be encoded against a draft at all is the
 * owner's ruling (sign-off iso59004-J-1).
 *
 * iso59004-J-2 (verification_status): the corpus vocabulary is `md_verified` (every row lifted from a
 * markdown transcript) / `imported_unverified`. There is NO markdown transcript for this standard, so
 * `md_verified` would be factually wrong, and a third token `pdf_verified` is NOT introduced
 * unilaterally — the table here ships the fail-safe `imported_unverified`, and the sign-off proposes
 * `pdf_verified` with the exact UPDATE SQL (the same proposal as Task 28's iso5667_1-J-2; ONE ruling
 * settles both).
 *
 * ONE table is seeded:
 *   - S5_2 — the six circular economy principles of §5.2, one row per printed sub-clause, keyed by the
 *     prod `selected_principle` enum `value` strings (byte-identical, G-A3).
 *
 * NOT seeded — Table 1 "Guidance for resource management actions" (iso59004-U-1), for two independent
 * reasons, both recorded against the extraction span `Q.L2570_2631`:
 *   (1) The printed table has TWO columns, "Action" (L2575) and "Description" (L2577). It prints NO
 *       category column at all, so the brief's `category` value column has no source anywhere in Table 1
 *       — and under controller resolution (2) a row whose category cell is not physically unambiguous is
 *       not seeded. That is every row. `actions.category` therefore stays an engineer-entered enum over
 *       the prod `action_category` tokens.
 *   (2) The remaining `description` column cannot be lifted row-by-row without RECONSTRUCTION: the two
 *       printed columns interleave in the `-layout` extraction and the diagonal watermark lands inside
 *       them, so four of the thirteen description cells are split across non-adjacent lines or fused
 *       onto a neighbouring row's label line — most plainly L2629,
 *       "Re-mine          deGenerate useful energy from recovered resources.", where the "Recover
 *       energy" description sits on the "Re-mine" label line with a watermark "de" glued to its first
 *       word. Re-associating them is exactly the "reading harder" that SR-3 / amendment F forbid.
 *   The ONE Table-1 fact that IS physically unambiguous — each of the thirteen Action labels stands
 *   alone on its own line, in the printed order Refuse · Rethink · Source · Reduce · Repair · Re-use ·
 *   Refurbish · Remanufacture · Repurpose · Cascade · Recycle · Recover energy · Re-mine — matches the
 *   thirteen prod `selected_action` tokens one-for-one in order; that correspondence is pinned in the
 *   field-config test and reported, but it is not a seeded row.
 *
 * iso59004-U-2 (watermark): the PDF carries a diagonal "Projet de Norme Marocaine" overlay whose glyph
 * runs `pdftotext` emits as extra lines between body lines (and, rarely, glued to a body word:
 * "deGenerate" L2629, "ojnongovernmental" L2711). Every `verbatim_quote` below is the RAW span,
 * watermark included — nothing is cleaned. Only the build-time containment guard `inSpan` drops whole
 * watermark-ONLY lines, by the explicit token list `WATERMARK_TOKENS` below.
 */
import type { RegulationRow, RegulationTable } from './regulation-tables';
import { Q } from './regulation-tables-quotes-iso59004';

const STD = 'ISO-59004';
/** prod `standards.version` = "FDIS 2024 (ISO/FDIS 59004:2024)" (read-only capture 2026-09-24). */
export const ISO59004_EDITION = 'FDIS 2024';
const ED = ISO59004_EDITION;
/** iso59004-J-2: PDF-derived (VA) but the corpus has no token for it — the fail-safe lower token ships. */
const STATUS = 'imported_unverified' as const;

/**
 * iso59004-U-2 — the glyph runs the diagonal "Projet de Norme Marocaine" overlay leaves in the
 * extraction. A line made ONLY of these (in any combination, any spacing) is an overlay artefact and is
 * dropped by `inSpan` before the containment check; a token glued INSIDE a body line is never touched,
 * and `verbatim_quote` itself is never rewritten.
 */
export const WATERMARK_TOKENS = ['Pr', 'oj', 'et', 'de', 'N', 'or', 'm', 'M', 'e', 'ar', 'oc', 'ai', 'n'] as const;
const WATERMARK_LINE = new RegExp('^\\s*(?:' + WATERMARK_TOKENS.join('|') + ')(?:\\s+(?:' + WATERMARK_TOKENS.join('|') + '))*\\s*$');

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
/** Collapse a span after dropping whole watermark-ONLY lines (iso59004-U-2). */
export const collapseNoWatermark = (s: string) =>
  collapse(s.split('\n').filter((l) => !WATERMARK_LINE.test(l.replace(/\r$/, ''))).join(' '));
/** Build-time SR-1 guard: every seeded cell text must be printed inside the named span. */
function inSpan(quote: string, cell: string | null, where: string): void {
  if (cell !== null && !collapseNoWatermark(quote).includes(collapse(cell))) {
    throw new Error(where + ': cell "' + cell + '" is not inside its verbatim span');
  }
}

// ---------------------------------------------------------------------------
// S5_2 — §5.2 "Principles" (PDF p.23, printed p.16). One row per printed sub-clause 5.2.1 … 5.2.6:
// `title` is the printed heading, `text` the printed paragraph. Key tokens are the prod
// `selected_principle` enum `value` strings, byte-identical (D-1 / G-A3): systems_thinking,
// value_creation, value_sharing, resource_stewardship, resource_traceability, ecosystem_resilience.
//
// Policy `locked` (iso59004-P-1 — a judgment, on the sheet with BOTH readings and the one-line switch SQL):
// the six principles are a printed NAME CATALOGUE, not an adjustable value — there is
// nothing for an engineer to override, so no consumer offers an override block. The quoted §5.1 cue is a
// "should", i.e. the `anhaltswert` cue class on a strict reading of the Spec §7 vocabulary; the catalogue
// reading won here and the owner rules. `override_quote` carries
// §5.1 (L1588–L1589), the sentence that makes the set normative-by-guidance: "The set of principles
// given in 5.2, which are interlinked and complementary, should be considered by an organization to
// transition towards a circular economy."
//
// Consumer: the `principles` select_many checklist of ISO-59004-04. The checklist keeps prod's own option
// labels (the field is CREATED, so its enum list is written once — it is not a D-1 overwrite), and the
// field-config test asserts row-for-row that the six seeded keys ARE those six option values and that
// each row's printed `title` equals the prod option's `label_en`. The table is therefore the verbatim
// §5.2 record the checklist is checked AGAINST; no `lookup()` reads it (there is no principles REGISTER —
// a select_many carrier cannot be looked up, see iso59004-F-1).
// ---------------------------------------------------------------------------
export const S5_2_ROWS = [
  { principle: 'systems_thinking', clause: '5.2.1', title: 'Systems thinking', label_de: 'Systemdenken', quote: Q.L1601_1604,
    text: 'Organizations take a life cycle perspective and apply a long-term approach when considering their impacts on environmental, social and economic systems.' },
  { principle: 'value_creation', clause: '5.2.2', title: 'Value creation', label_de: 'Wertschöpfung', quote: Q.L1606_1609,
    text: 'Organizations recover, retain or add value by providing effective solutions that contribute to socio-economic and environmental value, and use resources in an efficient way.' },
  { principle: 'value_sharing', clause: '5.2.3', title: 'Value sharing', label_de: 'Wertteilung', quote: Q.L1610_1617,
    text: 'Organizations collaborate with interested parties along the value chain or value network in an inclusive and equitable way, for the benefit and well-being of society, by sharing the value created with the provision of a solution.' },
  { principle: 'resource_stewardship', clause: '5.2.4', title: 'Resource stewardship', label_de: 'Ressourcenverantwortung', quote: Q.L1619_1624,
    text: 'Organizations manage stocks and flows in a sustainable way including by closing, slowing and narrowing resource flows to contribute to resource accessibility and continued availability for present and future generations and to reduce risks associated with dependence on virgin resources.' },
  { principle: 'resource_traceability', clause: '5.2.5', title: 'Resource traceability', label_de: 'Ressourcenrückverfolgbarkeit', quote: Q.L1626_1629,
    text: 'Organizations collect and maintain data to enable tracking of resources through their value chains and are accountable for sharing relevant information with interested parties.' },
  { principle: 'ecosystem_resilience', clause: '5.2.6', title: 'Ecosystem resilience', label_de: 'Ökosystem-Resilienz', quote: Q.L1631_1635,
    text: 'Organizations develop and implement practices and strategies that protect and contribute to the resilience and regeneration of ecosystems and their biodiversity, including preventing harmful losses and releases and taking into account planetary boundaries.' },
] as const;

export function s52AsTable(): RegulationTable {
  const rows: RegulationRow[] = S5_2_ROWS.map((r, i) => {
    inSpan(r.quote, r.clause, 'S5_2 ' + r.principle + ' clause');
    inSpan(r.quote, r.title, 'S5_2 ' + r.principle + ' title');
    inSpan(r.quote, r.text, 'S5_2 ' + r.principle + ' text');
    return {
      row_key: r.principle,
      keys: { principle: r.principle },
      group_label: null,
      label_de: '§' + r.clause + ' ' + r.label_de + ' (' + r.title + ')',
      order_index: i,
      values: { clause: r.clause, title: r.title, text: r.text },
      verbatim_quote: r.quote,
    };
  });
  return {
    standard_code: STD, edition: ED, table_code: 'S5_2',
    title_de: 'Die sechs Grundsätze der Kreislaufwirtschaft (§5.2.1 – §5.2.6)',
    clause_reference: '§5.2', page_ref: 'PDF p.23 (gedruckte S. 16)',
    key_columns: ['principle'],
    value_columns: [
      { name: 'clause', type: 'string' },
      { name: 'title', type: 'string' },
      { name: 'text', type: 'string' },
    ],
    override_policy: 'locked',
    override_quote: Q.L1588_1589,
    verification_status: STATUS,
    rows,
  };
}

export function iso59004SeedTables(): RegulationTable[] {
  return [s52AsTable()];
}
