import path from 'node:path';
import fs from 'node:fs';

const REF = 'C:/Users/Ekowai/Desktop/environmental-reporting service/01_Referenz';

// The taxonomy must be unzipped here before running parser tests.
// `VSME_TAXONOMY_DIR` overrides the default local path (used to simulate the
// fixture-absent CI case without touching files outside the repo).
export const TAXONOMY_DIR =
  process.env.VSME_TAXONOMY_DIR ??
  path.join(
    REF,
    'VSME-XBRL-Taxonomy-February-2026',
    'xbrl.efrag.org',
    'taxonomy',
    'vsme',
    '2026-02-01',
  );

/**
 * True only on machines that hold the local EFRAG taxonomy (Ekowai-PC-01).
 * CI runners don't — taxonomy-bound suites use `describe.skipIf(!TAXONOMY_AVAILABLE)`
 * and lazy parsing so they skip honestly there while staying fully active locally.
 */
export const TAXONOMY_AVAILABLE = fs.existsSync(path.join(TAXONOMY_DIR, 'vsme-all.xsd'));
