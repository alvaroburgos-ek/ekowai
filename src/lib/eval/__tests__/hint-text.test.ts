import { describe, it, expect } from 'vitest';
import { splitHint, hintText, composeHint } from '../hint-text';

describe('bilingual hint column', () => {
  it('splits the German part and the [EN] part', () => {
    const s = 'Deutsch.\n[EN] English.';
    expect(splitHint(s)).toEqual({ de: 'Deutsch.', en: 'English.' });
    expect(hintText(s, 'de')).toBe('Deutsch.');
    expect(hintText(s, 'en')).toBe('English.');
  });
  it('legacy single-language text shows in both locales', () => {
    expect(hintText('k_i = k · f_K per Gl. 5.', 'en')).toBe('k_i = k · f_K per Gl. 5.');
    expect(hintText('k_i = k · f_K per Gl. 5.', 'de')).toBe('k_i = k · f_K per Gl. 5.');
    expect(hintText(null, 'de')).toBeNull();
    expect(hintText('   ', 'en')).toBeNull();
  });
  it('English-only text falls back for the German locale', () => {
    expect(splitHint('[EN] Only English.')).toEqual({ de: null, en: 'Only English.' });
    expect(hintText('[EN] Only English.', 'de')).toBe('Only English.');
  });
  it('composeHint round-trips', () => {
    expect(splitHint(composeHint('A', 'B'))).toEqual({ de: 'A', en: 'B' });
    expect(composeHint('A', null)).toBe('A');
    expect(composeHint(null, 'B')).toBe('[EN] B');
    expect(composeHint('', '')).toBeNull();
  });
});
