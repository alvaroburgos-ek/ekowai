import path from 'node:path';

const REF = 'C:/Users/Ekowai/Desktop/environmental-reporting service/01_Referenz';

// The taxonomy must be unzipped here before running parser tests.
export const TAXONOMY_DIR = path.join(
  REF,
  'VSME-XBRL-Taxonomy-February-2026',
  'xbrl.efrag.org',
  'taxonomy',
  'vsme',
  '2026-02-01',
);
