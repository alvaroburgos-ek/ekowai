/**
 * VSME paragraph-addressing tests.
 *
 * Covers the two additions layered onto `extract-section.ts` for the VSME
 * norm-text source (`data/norm-text/VSME.md`, ATX headings instead of the
 * DWA source's LaTeX `\section*{...}` macros):
 *   - `parseClauseReference` recognising `VSME B<n> para <n>` (with an
 *     optional lettered sub-item like `24(a)` that still resolves to the
 *     whole paragraph).
 *   - `extractSection` dispatching paragraph queries to a slice bounded by
 *     the module's ATX heading and the next numbered-paragraph line or
 *     heading — same non-approximating contract as the existing
 *     numbered/appendix paths: no match anywhere → `{ found: false }`.
 *
 * The FIXTURE below is a byte-for-byte contiguous slice of the real,
 * generated `data/norm-text/VSME.md` — module headings B1 through B11
 * (source: `VSME Standard.pdf`, printed pages 8-11) — not a hand-written
 * approximation, so these tests exercise the actual converter output shape.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { extractSection, parseClauseReference } from '../extract-section';

// Real slice of `data/norm-text/VSME.md`, lines 272-437 (module headings B1
// through B11, printed pages 8-11 of "VSME Standard.pdf").
const FIXTURE = `## B1 — Basis for preparation
24. The undertaking shall disclose:
           (a) which of the following options it has selected:
                        i.    OPTION A: Basic Module (only); or
                       ii.    OPTION B: Basic Module and Comprehensive Module;
           (b) if the undertaking has omitted a disclosure as it is deemed classified or sensitive
               information (see paragraph 19), the undertaking shall indicate the disclosure that has
               omitted.
           (c) whether the sustainability report has been prepared on an individual basis (i.e. the report
               is limited to the undertaking’s information only) or on a consolidated basis (i.e. the report
               includes information about the undertaking and its subsidiaries);
           (d) in case of a consolidated sustainability report, the list of the subsidiaries, including their
               registered address4, covered in the report; and
           (e) the following information:
                        i.    the undertaking’s legal form;
                       ii.    NACE sector classification code(s);
                       iii.   size of the balance sheet (in Euro);
                      iv.     turnover (in Euro);
                       v.     number of employees in headcount or full-time equivalents;
                      vi.     country of primary operations and location of significant asset(s); and
                      vii.    geolocation of sites owned, leased or managed.
25. If the undertaking has obtained any sustainability-related certification or label, it shall provide a
    brief description of those (including, where relevant, the issuers of the certification or label, date
    and rating score).

## B2 — Practices, policies and future initiatives for transitioning towards a more sustainable economy
26. If the undertaking has put in place specific practices, policies or future initiatives for transitioning
    towards a more sustainable economy, it shall state so. The undertaking shall state whether it has:
       (a) practices. Practices in this context may include, for instance, efforts to reduce the
           undertaking’s water and electricity consumption, to reduce GHG emissions or to prevent
           pollution, and initiatives to improve product safety as well as current initiatives to improve
           working conditions and equal treatment in the workplace, sustainability training for the
           undertaking’s workforce and partnerships related to sustainability projects;
       (b) policies on sustainability issues, whether they are publicly available, and any separate
           environmental, social or governance policies for addressing sustainability issues;


4 The registered address is the official address of the undertaking.





            (c) any future initiatives or forward-looking plans that are being implemented on sustainability
                issues; and
            (d) targets to monitor the implementation of the policies and the progress achieved towards
                meeting such targets.
27. Such practices, policies and future initiatives include what the undertaking does to reduce its
    negative impacts and to enhance its positive impacts on people and the environment, in order to
    contribute to a more sustainable economy. Appendix B provides a list of possible sustainability
    issues that could be covered in this disclosure. The undertaking may use the template found in
    paragraph 78 to report this information.
28. If the undertaking also reports on the Comprehensive module, it shall complement the information
    provided under B2 with the datapoints found in C2.

Basic Module – Environment metrics

## B3 — Energy and greenhouse gas emissions
29. The undertaking shall disclose its total energy consumption in MWh, with a breakdown as per the
    table below, if it can obtain the necessary information to provide such a breakdown:

                                Renewable                           Non-renewable                  Total

    Electricity (as reflected
    in utility billings)

    Fuels

    Total

30. The undertaking shall disclose its estimated gross greenhouse gas (GHG) emissions in tons of
    CO2 equivalent (tCO2eq) considering the content of the GHG Protocol Corporate Standard (version
    2004), including:
            (a) the Scope 1 GHG emissions in tCO2eq (from owned or controlled sources); and
            (b) the location-based Scope 2 emissions in tCO2eq (i.e. emissions from the generation of
                purchased energy, such as electricity, heat, steam or cooling).
31. The undertaking shall disclose its GHG intensity calculated by dividing ‘gross greenhouse gas
    (GHG) emissions’ disclosed under paragraph 30 by ‘turnover (in Euro)’ disclosed under paragraph
    24(e)(iv)5.

## B4 — Pollution of air, water and soil
32. If the undertaking is already required by law or other national regulations to report to competent
    authorities its emissions of pollutants, or if it voluntarily reports on them according to an
    Environmental Management System, it shall disclose the pollutants it emits to air, water and soil in
    its own operations, with the respective amount for each pollutant. If this information is already
    publicly available, the undertaking may alternatively refer to the document where it is reported, for
    example, by providing the relevant URL link or embedding a hyperlink.

## B5 — Biodiversity
33. The undertaking shall disclose the number and area (in hectares) of sites that it owns, has leased,
    or manages in or near a biodiversity sensitive area.
34. The undertaking may disclose metrics related to land-use:
            (a) total use of land (in hectares);



5
    In a future online tool version of the VSME Standard, this will be automatically calculated.





      (b) total sealed area;
      (c) total nature-oriented area on-site; and
      (d) total nature-oriented area off-site.

## B6 — Water
35. The undertaking shall disclose its total water withdrawal, i.e. the amount of water drawn into the
    boundaries of the organisation (or facility); in addition, the undertaking shall separately present the
    amount of water withdrawn at sites located in areas of high water-stress.
36. If the undertaking has production processes in place which significantly consume water (e.g.
    thermal energy processes like drying or power production, production of goods, agricultural
    irrigation, etc.), it shall disclose its water consumption calculated as the difference between its
    water withdrawal and water discharge from its production processes.

## B7 — Resource use, circular economy and waste management
37. The undertaking shall disclose whether it applies circular economy principles and, if so, how it
    applies these principles.
38. The undertaking shall disclose:
      (a) the total annual generation of waste broken down by type (non-hazardous and hazardous);
      (b) the total annual waste diverted to recycling or reuse; and
      (c) if the undertaking operates in a sector using significant material flows (for example
          manufacturing, construction, packaging or others), the annual mass-flow of relevant
          materials used.

Basic Module – Social metrics

## B8 — Workforce – General characteristics
39. The undertaking shall disclose the number of employees in headcount or full-time equivalent for
    the following metrics:
      (a) type of employment contract (temporary or permanent);
      (b) gender; and
      (c) country of the employment contract, if the undertaking operates in more than one country.
40. If the undertaking employs 50 or more employees, it shall disclose the employee turnover rate for
    the reporting period.

## B9 — Workforce – Health and safety
41. The undertaking shall disclose the following information regarding its employees:
      (a) the number and rate of recordable work-related accidents; and
      (b) the number of fatalities as a result of work-related injuries and work-related ill health.

## B10 — Workforce – Remuneration, collective bargaining and training
42. The undertaking shall disclose:
      (a) whether the employees receive pay that is equal or above applicable minimum wage for the
          country it reports in, determined directly by the national minimum wage law or through a
          collective bargaining agreement;
      (b) the percentage gap in pay between its female and male employees. The undertaking may
          omit this disclosure when its headcount is below 150 employees noting that this threshold
          will be reduced to 100 employees from 7 June 2031;
      (c) the percentage of employees covered by collective bargaining agreements; and






      (d) the average number of annual training hours per employee, broken down by gender.

Basic Module – Governance metrics

## B11 — Convictions and fines for corruption and bribery
43. In case of convictions and fines in the reporting period, the undertaking shall disclose the number
    of convictions, and the total amount of fines incurred for the violation of anti-corruption and anti-
    bribery laws.`;

describe('parseClauseReference — VSME paragraph queries', () => {
  it.each([
    ['VSME B1 para 24(a)', { kind: 'paragraph', module: 'B1', para: '24' }],
    ['VSME B3 para 30', { kind: 'paragraph', module: 'B3', para: '30' }],
    ['VSME C9 para 65', { kind: 'paragraph', module: 'C9', para: '65' }],
    ['vsme b1 para 24', { kind: 'paragraph', module: 'B1', para: '24' }],
  ])('parses %s', (input, expected) => {
    expect(parseClauseReference(input)).toEqual(expected);
  });
});

describe('extractSection — VSME paragraph extraction', () => {
  it('VSME B3 para 30 — extracts the GHG Protocol quote', () => {
    const r = extractSection(FIXTURE, 'VSME B3 para 30');
    expect(r.found).toBe(true);
    if (!r.found) return;
    // "GHG Protocol Corporate Standard (version 2004)" wraps across a
    // `-layout` line break in the source ("...(version" / "2004),..." on
    // the next line) — preserved verbatim, so normalize whitespace before
    // asserting on the phrase.
    expect(r.markdown.replace(/\s+/g, ' ')).toContain('GHG Protocol Corporate Standard (version 2004)');
    // Must not bleed into paragraph 31.
    expect(r.markdown).not.toContain('GHG intensity');
  });

  it('VSME B3 para 29 — stops before para 30', () => {
    const r = extractSection(FIXTURE, 'VSME B3 para 29');
    expect(r.found).toBe(true);
    if (!r.found) return;
    expect(r.markdown).toContain('total energy consumption in MWh');
    expect(r.markdown).not.toContain('greenhouse gas (GHG) emissions in tons');
  });

  it('VSME B1 para 24(a) resolves to the whole paragraph, sub-items included', () => {
    const r = extractSection(FIXTURE, 'VSME B1 para 24(a)');
    expect(r.found).toBe(true);
    if (!r.found) return;
    expect(r.markdown).toContain('OPTION A: Basic Module (only)');
    expect(r.markdown).toContain('geolocation of sites owned, leased or managed.');
    // Must not bleed into para 25.
    expect(r.markdown).not.toContain('sustainability-related certification');
  });

  it('VSME B3 para 99 — no such paragraph in the B3 span → found:false, never approximates', () => {
    expect(extractSection(FIXTURE, 'VSME B3 para 99')).toEqual({ found: false });
  });

  it('VSME B1 para 43 — para 43 belongs to B11, must NOT match inside B1 (B1-vs-B11 disambiguation)', () => {
    // Para 43 genuinely exists in the fixture (inside B11's span). A naive
    // prefix match of "B1" against "B11 – Convictions …" would wrongly let
    // this query see it. The word-boundary module match must prevent that.
    expect(extractSection(FIXTURE, 'VSME B1 para 43')).toEqual({ found: false });
  });

  it('VSME B11 para 43 — the word-boundary match itself resolves correctly', () => {
    const r = extractSection(FIXTURE, 'VSME B11 para 43');
    expect(r.found).toBe(true);
    if (!r.found) return;
    expect(r.title).toContain('B11');
    expect(r.markdown).toContain('convictions, and the total amount of fines incurred');
  });

  it('unknown module — found:false', () => {
    expect(extractSection(FIXTURE, 'VSME B99 para 1')).toEqual({ found: false });
  });
});

// Smoke test against the real, generated `data/norm-text/VSME.md` — the
// FIXTURE above covers the contract in isolation; this additionally proves
// the converter's actual output resolves the reasoning map's verified
// quotes (paragraphs 24, 29-31, 41, 65 — printed pages 8, 9, 9, 9, 10, 14).
const VSME_SOURCE_PATH = path.join(process.cwd(), 'data', 'norm-text', 'VSME.md');
const VSME_SOURCE_EXISTS = fs.existsSync(VSME_SOURCE_PATH);
const maybeReal = VSME_SOURCE_EXISTS ? describe : describe.skip;

maybeReal('extractSection — real VSME.md source', () => {
  const source = VSME_SOURCE_EXISTS ? fs.readFileSync(VSME_SOURCE_PATH, 'utf8') : '';

  it('VSME B1 para 24 — Basic Module disclosure options (p.8)', () => {
      const r = extractSection(source, 'VSME B1 para 24');
      expect(r.found).toBe(true);
      if (!r.found) return;
      expect(r.markdown).toContain('OPTION A: Basic Module (only)');
    });

    it('VSME B3 para 29 — total energy consumption (p.9)', () => {
      const r = extractSection(source, 'VSME B3 para 29');
      expect(r.found).toBe(true);
      if (!r.found) return;
      expect(r.markdown).toContain('total energy consumption in MWh');
    });

    it('VSME B3 para 30 — GHG Protocol Corporate Standard (p.9)', () => {
      const r = extractSection(source, 'VSME B3 para 30');
      expect(r.found).toBe(true);
      if (!r.found) return;
      expect(r.markdown.replace(/\s+/g, ' ')).toContain('GHG Protocol Corporate Standard (version 2004)');
    });

    it('VSME B3 para 31 — GHG intensity (p.9)', () => {
      const r = extractSection(source, 'VSME B3 para 31');
      expect(r.found).toBe(true);
      if (!r.found) return;
      expect(r.markdown).toContain('GHG intensity');
    });

    it('VSME B9 para 41 — health and safety (p.10)', () => {
      const r = extractSection(source, 'VSME B9 para 41');
      expect(r.found).toBe(true);
      if (!r.found) return;
      expect(r.markdown).toContain('recordable work-related accidents');
    });

    it('VSME C9 para 65 — gender diversity ratio (p.14)', () => {
      const r = extractSection(source, 'VSME C9 para 65');
      expect(r.found).toBe(true);
      if (!r.found) return;
      expect(r.markdown).toContain('gender diversity ratio');
    });

  it('VSME B3 para 99 — not in the B3 disclosure span → found:false', () => {
    expect(extractSection(source, 'VSME B3 para 99')).toEqual({ found: false });
  });
});
