import { describe, it, expect } from 'vitest';
import { parseEnumValues } from '../enums';
import { TAXONOMY_DIR } from '../_setup';

describe('parseEnumValues', () => {
  const rows = parseEnumValues(TAXONOMY_DIR);
  it('produces members for BasisForPreparation', () => {
    const r = rows.filter((x) => x.enum_name === 'BasisForPreparation');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].label_en.length).toBeGreaterThan(0);
  });
});
