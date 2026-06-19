import { describe, it, expect } from 'vitest';
import { buildClientProjectView } from '../client-view';

const project = { name: 'PLT-HS-01', project_code: 'HS-01', location: 'Hamburg' };

describe('buildClientProjectView', () => {
  it('exposes only computed/derived outcomes, never entered', () => {
    const view = buildClientProjectView({
      project,
      params: [
        { field_id: 'f1', source_type: 'computed', value_number: 42, value_text: null, value_enum: null },
        { field_id: 'f2', source_type: 'entered', value_number: 7, value_text: null, value_enum: null },
        { field_id: 'f3', source_type: 'derived', value_number: null, value_text: 'OK', value_enum: null },
      ],
      fieldsById: {
        f1: { symbol: 'Q_S', unit: 'l/s', label_de: 'GEHEIME FRAGE' },
        f2: { symbol: 'k_f', unit: 'm/s', label_de: 'GEHEIME FRAGE' },
        f3: { symbol: 'Status', unit: null, label_de: 'GEHEIME FRAGE' },
      },
      instances: [{ status: 'final' }, { status: 'engineer_approved' }, { status: 'draft' }],
    });

    const labels = view.outcomes.map((o) => o.label);
    expect(labels).toContain('Q_S');
    expect(labels).toContain('Status');
    expect(labels).not.toContain('k_f'); // entered → excluded
  });

  it('never leaks the field question text (label_de) into any outcome field', () => {
    const view = buildClientProjectView({
      project,
      params: [{ field_id: 'f1', source_type: 'computed', value_number: 1, value_text: null, value_enum: null }],
      fieldsById: { f1: { symbol: 'Q_S', unit: 'l/s', label_de: 'GEHEIME FRAGE' } },
      instances: [],
    });
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain('GEHEIME FRAGE');
  });

  it('computes progress as approved/final over total worksheets', () => {
    const view = buildClientProjectView({
      project,
      params: [],
      fieldsById: {},
      instances: [
        { status: 'final' },
        { status: 'engineer_approved' },
        { status: 'draft' },
        { status: 'submitted_for_review' },
      ],
    });
    expect(view.progress).toEqual({ worksheetsTotal: 4, worksheetsApproved: 2, percent: 50 });
  });

  it('progress is 0% with no worksheets (no divide-by-zero)', () => {
    const view = buildClientProjectView({ project, params: [], fieldsById: {}, instances: [] });
    expect(view.progress.percent).toBe(0);
  });
});
