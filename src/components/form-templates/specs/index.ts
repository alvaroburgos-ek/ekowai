import type { FormTemplateSpec } from '../types';
import { atvA704eIqcCard8 } from './atv-a-704e-iqc-card-8';
import { iso14019Table_G1 } from './iso-14019-1-table-g1';
import { iso5667_6AnnexB } from './iso-5667-6-annex-b';

/** Source-form templates, keyed by standard code (only FORM_TEMPLATE detections). */
export const formTemplateSpecs: Record<string, FormTemplateSpec[]> = {
  'ATV-A-704E': [atvA704eIqcCard8],
  'ISO-14019-1': [iso14019Table_G1],
  'ISO-5667-6': [iso5667_6AnnexB],
};

export { atvA704eIqcCard8, iso14019Table_G1, iso5667_6AnnexB };
