import { describe, it, expect } from 'vitest';
import { encodeInputs, decodeInputs } from './url-hash';

describe('url-hash codec', () => {
  it('roundtrips simple values', () => {
    const inputs = { a: 1, b: 'two', c: true };
    const enc = encodeInputs(inputs);
    expect(decodeInputs(enc)).toEqual(inputs);
  });

  it('decode of empty string yields empty object', () => {
    expect(decodeInputs('')).toEqual({});
  });

  it('decode of malformed string yields empty object (defensive)', () => {
    expect(decodeInputs('!!!not-base64!!!')).toEqual({});
  });

  it('encoded form is URL-safe (no +, /, =)', () => {
    const enc = encodeInputs({ a: 'value with / and + chars' });
    expect(enc).not.toMatch(/[+/=]/);
  });
});
