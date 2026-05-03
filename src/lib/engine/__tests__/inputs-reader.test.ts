import { describe, it, expect } from 'vitest';
import {
  normalizeInputs,
  getInputValue,
  getInputSource,
  inputsToValues,
} from '@/lib/engine/inputs-reader';

describe('normalizeInputs', () => {
  it('passes through bare values (legacy shape)', () => {
    const out = normalizeInputs({ EW: 1800, T: true });
    expect(out).toEqual({
      EW: { value: 1800 },
      T: { value: true },
    });
  });

  it('preserves source on object form', () => {
    const out = normalizeInputs({
      EW: { value: 1800, source: { docId: 'doc-1', page: 3 } },
    });
    expect(out.EW.source).toEqual({ docId: 'doc-1', page: 3 });
  });

  it('handles label-only source', () => {
    const out = normalizeInputs({
      EW: { value: 1800, source: { label: 'IfSL Mainz' } },
    });
    expect(out.EW.source).toEqual({ label: 'IfSL Mainz' });
  });

  it('mixed shape works', () => {
    const out = normalizeInputs({
      EW: 1800,
      EZ: { value: 60, source: { docId: 'd' } },
    });
    expect(out.EW).toEqual({ value: 1800 });
    expect(out.EZ.source).toEqual({ docId: 'd' });
  });

  it('returns an empty record for empty input', () => {
    expect(normalizeInputs({})).toEqual({});
  });
});

describe('getInputValue', () => {
  it('returns the value regardless of shape', () => {
    expect(getInputValue(1800)).toBe(1800);
    expect(getInputValue({ value: 1800 })).toBe(1800);
    expect(getInputValue({ value: 1800, source: { label: 'x' } })).toBe(1800);
    expect(getInputValue(true)).toBe(true);
    expect(getInputValue('text')).toBe('text');
  });
});

describe('getInputSource', () => {
  it('returns undefined for bare values', () => {
    expect(getInputSource(1800)).toBeUndefined();
    expect(getInputSource(true)).toBeUndefined();
    expect(getInputSource('text')).toBeUndefined();
  });
  it('returns the source for object form', () => {
    const src = { docId: 'd' };
    expect(getInputSource({ value: 1, source: src })).toBe(src);
  });
  it('returns undefined when object form has no source', () => {
    expect(getInputSource({ value: 1 })).toBeUndefined();
  });
});

describe('inputsToValues', () => {
  it('extracts just the values, dropping sources, for engine consumption', () => {
    const out = inputsToValues({
      EW: 1800,
      EZ: { value: 60, source: { docId: 'd' } },
      T: { value: true },
    });
    expect(out).toEqual({ EW: 1800, EZ: 60, T: true });
  });
});
