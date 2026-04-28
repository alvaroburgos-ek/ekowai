import { describe, it, expect } from 'vitest';
import { evaluateCompliance } from './compliance';
import type { Worksheet } from './types';

const ws = (thresholds: Worksheet['thresholds']): Worksheet => ({
  contractVersion: '1.0',
  regulation: 'T',
  regulationVersion: 'v0',
  id: 'T',
  titleDe: '',
  titleEn: '',
  sourceCitation: '',
  inputs: [],
  computed: [],
  thresholds,
  sections: [{ id: 's', titleDe: '', titleEn: '', fields: [] }],
  decisionPoints: [],
  status: 'preview',
});

describe('evaluateCompliance', () => {
  it('compliant when no thresholds', () => {
    const r = evaluateCompliance(ws([]), {}, {});
    expect(r.status).toBe('compliant');
    expect(r.violations).toEqual([]);
  });

  it('compliant when threshold satisfied', () => {
    const r = evaluateCompliance(
      ws([
        {
          id: 't1',
          ref: 'x',
          rule: { kind: 'lte', value: 10 },
          severity: 'blocking',
          messageDe: '',
          messageEn: '',
          citation: '',
        },
      ]),
      { x: 5 },
      {},
    );
    expect(r.status).toBe('compliant');
  });

  it('warning when soft threshold violated', () => {
    const r = evaluateCompliance(
      ws([
        {
          id: 't1',
          ref: 'x',
          rule: { kind: 'lte', value: 10 },
          severity: 'warning',
          messageDe: '',
          messageEn: '',
          citation: '',
        },
      ]),
      { x: 15 },
      {},
    );
    expect(r.status).toBe('warning');
    expect(r.violations).toHaveLength(1);
  });

  it('blocking_violation when hard threshold violated', () => {
    const r = evaluateCompliance(
      ws([
        {
          id: 't1',
          ref: 'x',
          rule: { kind: 'lte', value: 10 },
          severity: 'blocking',
          messageDe: '',
          messageEn: '',
          citation: '',
        },
      ]),
      { x: 15 },
      {},
    );
    expect(r.status).toBe('blocking_violation');
  });

  it('blocking trumps warning when both present', () => {
    const r = evaluateCompliance(
      ws([
        {
          id: 'w',
          ref: 'a',
          rule: { kind: 'lte', value: 1 },
          severity: 'warning',
          messageDe: '',
          messageEn: '',
          citation: '',
        },
        {
          id: 'b',
          ref: 'a',
          rule: { kind: 'lte', value: 0 },
          severity: 'blocking',
          messageDe: '',
          messageEn: '',
          citation: '',
        },
      ]),
      { a: 5 },
      {},
    );
    expect(r.status).toBe('blocking_violation');
  });

  it('handles gte and eq rules', () => {
    const r = evaluateCompliance(
      ws([
        {
          id: 'g',
          ref: 'a',
          rule: { kind: 'gte', value: 10 },
          severity: 'blocking',
          messageDe: '',
          messageEn: '',
          citation: '',
        },
        {
          id: 'e',
          ref: 'b',
          rule: { kind: 'eq', value: 5 },
          severity: 'blocking',
          messageDe: '',
          messageEn: '',
          citation: '',
        },
      ]),
      { a: 5, b: 6 },
      {},
    );
    expect(r.violations.map((v) => v.thresholdId).sort()).toEqual(['e', 'g']);
  });

  it('reads from inputs when computed has no value', () => {
    const r = evaluateCompliance(
      ws([
        {
          id: 't1',
          ref: 'a',
          rule: { kind: 'lte', value: 10 },
          severity: 'blocking',
          messageDe: '',
          messageEn: '',
          citation: '',
        },
      ]),
      {},
      { a: 5 },
    );
    expect(r.status).toBe('compliant');
  });

  it('returns unknown when ref cannot be resolved', () => {
    const r = evaluateCompliance(
      ws([
        {
          id: 't1',
          ref: 'missing',
          rule: { kind: 'lte', value: 10 },
          severity: 'blocking',
          messageDe: '',
          messageEn: '',
          citation: '',
        },
      ]),
      {},
      {},
    );
    expect(r.status).toBe('unknown');
  });
});
